// functions/src/index.ts — COMPLETE FILE with all bugs fixed

import * as admin from "firebase-admin";
import {
  onDocumentUpdated,
  FirestoreEvent,
  Change,
} from "firebase-functions/v2/firestore";
import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { QueryDocumentSnapshot } from "firebase-admin/firestore";

admin.initializeApp();
const db = admin.firestore();

const STATUSES = {
  PENDING:             "Pending",
  ORDER_ACCEPTED:      "Order_Accepted",
  PREPARING:           "Preparing",
  READY_FOR_DELIVERY:  "Ready_For_Delivery",
  IN_TRANSIT:          "In_Transit",
  COMPLETED:           "Completed",
  CANCELLED:           "Cancelled",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 1: onOrderUpdated — rider count + points on Completed
// ─────────────────────────────────────────────────────────────────────────────
export const onOrderUpdated = onDocumentUpdated(
  {
    document: "orders/{orderId}",
    region: "asia-southeast1",
  },
  async (
    event: FirestoreEvent<
      Change<QueryDocumentSnapshot> | undefined,
      { orderId: string }
    >
  ) => {
    const before = event.data?.before.data();
    const after  = event.data?.after.data();
    if (!before || !after) return;

    const orderId      = event.params.orderId;
    const statusBefore = before.status as string;
    const statusAfter  = after.status  as string;
    const riderBefore  = before.delivery?.riderId as string | undefined;
    const riderAfter   = after.delivery?.riderId  as string | undefined;

    // Rider assigned for the first time
    if (!riderBefore && riderAfter) {
      const riderRef = db.collection("riders").doc(riderAfter);
      await db.runTransaction(async (tx) => {
        const riderDoc = await tx.get(riderRef);
        const current: number = riderDoc.data()?.activeDeliveryCount ?? 0;
        if (current >= 2) {
          tx.update(event.data!.after.ref, {
            "delivery.riderId":    null,
            "delivery.riderName":  null,
            "delivery.riderPhone": null,
          });
          return;
        }
        tx.set(riderRef, {
          activeDeliveryCount: current + 1,
          activeDeliveryIds: admin.firestore.FieldValue.arrayUnion(orderId),
        }, { merge: true });
      });
    }

    // Order terminal — decrement rider count
    const wasActive = [
      STATUSES.READY_FOR_DELIVERY,
      STATUSES.IN_TRANSIT,
    ].includes(statusBefore as any);
    const isNowTerminal = [
      STATUSES.COMPLETED,
      STATUSES.CANCELLED,
    ].includes(statusAfter as any);

    if (wasActive && isNowTerminal && riderAfter) {
      const riderRef = db.collection("riders").doc(riderAfter);
      await riderRef.set({
        activeDeliveryCount: admin.firestore.FieldValue.increment(-1),
        activeDeliveryIds: admin.firestore.FieldValue.arrayRemove(orderId),
      }, { merge: true });
    }

    // Award points on Completed
    if (statusBefore !== STATUSES.COMPLETED && statusAfter === STATUSES.COMPLETED) {
      const customerId: string = after.customerId;
      const orderTotal: number = after.total ?? 0;
      const pointsEarned = Math.floor(orderTotal);
      const membershipRef = db.collection("memberships").doc(customerId);
      const membershipDoc = await membershipRef.get();
      if (membershipDoc.exists) {
        await membershipRef.update({
          points: admin.firestore.FieldValue.increment(pointsEarned),
        });
      }
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 2: setUserRole
// ─────────────────────────────────────────────────────────────────────────────
interface SetRoleData { uid: string; role: string; branchId?: string; }

export const setUserRole = onCall(
  { region: "asia-southeast1" },
  async (request: CallableRequest<SetRoleData>) => {
    if (request.auth?.token?.["role"] !== "admin") {
      throw new HttpsError("permission-denied", "Only admins can assign roles");
    }
    const { uid, role, branchId } = request.data;
    if (!["customer", "employee", "rider", "admin"].includes(role)) {
      throw new HttpsError("invalid-argument", "Invalid role");
    }
    await admin.auth().setCustomUserClaims(uid, { role });
    await db.collection("users").doc(uid).update({
      role, branchId: branchId ?? null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 3: createStaffAccount
// ─────────────────────────────────────────────────────────────────────────────
interface CreateStaffData {
  email: string; password: string; firstName: string; lastName: string;
  phoneNo: string; role: string; branchId: string; position: string;
}

export const createStaffAccount = onCall(
  { region: "asia-southeast1" },
  async (request: CallableRequest<CreateStaffData>) => {
    if (request.auth?.token?.["role"] !== "admin") {
      throw new HttpsError("permission-denied", "Only admins can create staff accounts");
    }
    const { email, password, firstName, lastName, phoneNo, role, branchId, position } = request.data;
    const userRecord = await admin.auth().createUser({
      email, password, displayName: `${firstName} ${lastName}`,
    });
    const uid = userRecord.uid;
    const now = admin.firestore.Timestamp.now();
    await admin.auth().setCustomUserClaims(uid, { role });
    await db.collection("users").doc(uid).set({
      uid, role, firstName, lastName, email, phoneNo, branchId, position,
      status: "Active", hireDate: now, createdAt: now, updatedAt: now,
    });
    if (role === "rider") {
      await db.collection("riders").doc(uid).set({
        activeDeliveryCount: 0, activeDeliveryIds: [], dailyEarnings: 0,
      });
    }
    return { success: true, uid };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 4: placeCustomerOrder — FIXED VERSION
//
// FIX 1: findBranchSnapshot now searches by document ID directly (most common),
//         then by a "branchId" field, then by numeric branchId field.
//         Covers doc IDs like "branch_201", "201", or auto-generated IDs.
//
// FIX 2: If users/{uid} doesn't exist (web-registered user who never got a
//         Firestore document), we create a minimal profile from Auth data
//         instead of throwing an error.
//
// FIX 3: All errors are caught and re-thrown as HttpsError so the client
//         never sees a raw "internal" without a message.
// ─────────────────────────────────────────────────────────────────────────────
interface OrderItemData {
  menuItemId: string; name: string; category: string;
  quantity: number; unitPrice: number; subtotal: number;
}

interface PlaceCustomerOrderData {
  branchId: string;
  orderType: "Delivery" | "Takeout" | "Dine-in";
  items: OrderItemData[];
  paymentMethod: string;
  deliveryAddress?: string | null;
  deliveryFee?: number;
  pointsRedeemed?: number;
}

/**
 * FIX 1: Robust branch lookup that handles all document ID formats.
 * Tries in order:
 *   1. Direct doc lookup by the branchId string as-is
 *   2. Direct doc lookup by "branch_{branchId}" prefix
 *   3. Query for a "branchId" field matching the string value
 *   4. Query for a "branchId" field matching the numeric value
 */
async function findBranch(branchId: string): Promise<admin.firestore.DocumentData | null> {
  const candidates = [
    branchId,
    `branch_${branchId}`,
  ];

  // Try direct document ID lookups first (cheapest)
  for (const id of candidates) {
    const snap = await db.collection("branches").doc(id).get();
    if (snap.exists) {
      return { ...snap.data(), _docId: snap.id };
    }
  }

  // Try field queries (handles auto-generated doc IDs)
  const queries = [
    db.collection("branches").where("branchId", "==", branchId).limit(1).get(),
  ];
  const numeric = Number(branchId);
  if (Number.isFinite(numeric)) {
    queries.push(
      db.collection("branches").where("branchId", "==", numeric).limit(1).get()
    );
  }

  const results = await Promise.all(queries);
  for (const result of results) {
    if (!result.empty) {
      const d = result.docs[0];
      return { ...d.data(), _docId: d.id };
    }
  }

  return null;
}

export const placeCustomerOrder = onCall(
  { region: "asia-southeast1" },
  async (request: CallableRequest<PlaceCustomerOrderData>) => {
    try {
      if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "You must be signed in to place an order.");
      }

      const {
        branchId,
        orderType,
        items,
        paymentMethod,
        deliveryAddress,
        deliveryFee,
        pointsRedeemed = 0,
      } = request.data;

      // Input validation
      if (!branchId?.trim()) {
        throw new HttpsError("invalid-argument", "Branch is required.");
      }
      if (!orderType) {
        throw new HttpsError("invalid-argument", "Order type is required.");
      }
      if (!Array.isArray(items) || items.length === 0) {
        throw new HttpsError("invalid-argument", "Order must have at least one item.");
      }
      if (!paymentMethod) {
        throw new HttpsError("invalid-argument", "Payment method is required.");
      }
      if (orderType === "Delivery" && !deliveryAddress?.trim()) {
        throw new HttpsError("invalid-argument", "Delivery address is required for delivery orders.");
      }

      const uid = request.auth.uid;

      // Parallel fetches for speed
      const [userSnap, membershipSnap, branch] = await Promise.all([
        db.collection("users").doc(uid).get(),
        db.collection("memberships").doc(uid).get(),
        findBranch(branchId.trim()),
      ]);

      // FIX 2: If user doc missing, build minimal profile from Auth token
      let userFirstName: string;
      let userLastName: string;
      let userPhone: string;
      let userAddress: string;

      if (!userSnap.exists) {
        // Web-registered customers may not have a Firestore users doc yet.
        // Use Auth token display name as fallback, write the doc for future calls.
        const authUser = await admin.auth().getUser(uid);
        const displayName = authUser.displayName ?? authUser.email ?? "Customer";
        const nameParts = displayName.split(" ");
        userFirstName = nameParts[0] ?? "Customer";
        userLastName  = nameParts.slice(1).join(" ") ?? "";
        userPhone     = authUser.phoneNumber ?? "";
        userAddress   = "";

        // Create the missing Firestore users document so future calls work
        await db.collection("users").doc(uid).set({
          uid,
          role: "customer",
          firstName: userFirstName,
          lastName:  userLastName,
          email:     authUser.email ?? "",
          phoneNo:   userPhone,
          status:    "Active",
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });
      } else {
        const u = userSnap.data()!;
        userFirstName = u.firstName ?? "";
        userLastName  = u.lastName  ?? "";
        userPhone     = u.phoneNo   ?? "";
        userAddress   = u.address   ?? "";
      }

      if (!branch) {
        throw new HttpsError(
          "failed-precondition",
          `Branch "${branchId}" was not found. Please select a valid branch.`
        );
      }

      // Normalize items
      const normalizedItems = items.map((item) => ({
        menuItemId: String(item.menuItemId ?? ""),
        name:       String(item.name ?? ""),
        category:   String(item.category ?? ""),
        quantity:   Math.max(1, Math.floor(Number(item.quantity) || 1)),
        unitPrice:  Math.max(0, Number(item.unitPrice) || 0),
        subtotal:   Math.max(0, Number(item.subtotal) || 0),
      }));

      const subtotal = normalizedItems.reduce((sum, i) => sum + i.subtotal, 0);
      const appliedDeliveryFee = orderType === "Delivery"
        ? Math.max(0, Number(deliveryFee ?? 50))
        : 0;

      // Points redemption
      let discountAmount = 0;
      const sanitizedPoints = Math.max(0, Math.floor(Number(pointsRedeemed) || 0));
      if (sanitizedPoints > 0) {
        if (!membershipSnap.exists) {
          throw new HttpsError("failed-precondition", "No membership found for points redemption.");
        }
        const membership = membershipSnap.data()!;
        const available: number = Number(membership.points || 0);
        if (sanitizedPoints > available) {
          throw new HttpsError("failed-precondition",
            `Only ${available} points available, cannot redeem ${sanitizedPoints}.`);
        }
        const pointValue = membership.type === "Gold" ? 2 : 1;
        discountAmount = Math.min(sanitizedPoints * pointValue, subtotal + appliedDeliveryFee);
      }

      const total = Math.max(0, subtotal + appliedDeliveryFee - discountAmount);
      const now = admin.firestore.Timestamp.now();

      // Determine final branchId to store — use the _docId we found
      const resolvedBranchId: string = branch._docId ?? branchId;
      const branchName    = String(branch.name    ?? branch.Brnch_Name    ?? "Branch");
      const branchAddress = [
        branch.address ?? branch.Brnch_Address,
        branch.city    ?? branch.Brnch_City,
      ].filter(Boolean).join(", ");

      const orderRef = db.collection("orders").doc();
      const batch = db.batch();

      batch.set(orderRef, {
        orderId:      orderRef.id,
        customerId:   uid,
        branchId:     resolvedBranchId,
        orderType,
        status:       STATUSES.PENDING,
        total,
        createdAt:    now,
        updatedAt:    now,
        customerName: `${userFirstName} ${userLastName}`.trim(),
        customerPhone: userPhone,
        branchName,
        branchAddress,
        items: normalizedItems,
        payment: {
          method: paymentMethod,
          amount: total,
          status: "Completed",
          cardId: null,
          paidAt: now,
        },
        delivery: orderType === "Delivery"
          ? {
              riderId:     null,
              riderName:   null,
              riderPhone:  null,
              address:     (deliveryAddress ?? userAddress ?? "").trim(),
              fee:         appliedDeliveryFee,
              status:      "Pending",
              deliveredAt: null,
            }
          : null,
      });

      // Deduct redeemed points atomically in the same batch
      if (sanitizedPoints > 0) {
        batch.update(db.collection("memberships").doc(uid), {
          points: admin.firestore.FieldValue.increment(-sanitizedPoints),
        });
      }

      await batch.commit();

      return {
        success:         true,
        orderId:         orderRef.id,
        total,
        pointsRedeemed:  sanitizedPoints,
        discountAmount,
      };

    } catch (error) {
      // Surface all errors cleanly — never let Firebase swallow the message
      console.error("[placeCustomerOrder] Error:", error);
      if (error instanceof HttpsError) throw error;
      if (error instanceof Error) {
        throw new HttpsError("failed-precondition", `Order failed: ${error.message}`);
      }
      throw new HttpsError("failed-precondition", "Order placement failed unexpectedly.");
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 5: resetDailyEarnings
// ─────────────────────────────────────────────────────────────────────────────
export const resetDailyEarnings = onSchedule(
  {
    schedule: "0 0 * * *",
    timeZone: "Asia/Manila",
    region: "asia-southeast1",
  },
  async () => {
    const snap = await db.collection("riders").get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { dailyEarnings: 0 }));
    await batch.commit();
  }
);