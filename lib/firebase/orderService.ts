// lib/firebase/orderService.ts
// Place this file at: lib/firebase/orderService.ts in your Next.js project
// This is the FUTURE Next.js Firebase web migration file - not used in Android

import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  addDoc,
  setDoc,
  updateDoc,
  FirestoreError,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import type { CustomerSession } from "@/lib/customer";
import type { CompatBranch } from "./catalogService";

export interface OrderItem {
  menuItemId: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Payment {
  method: string;
  amount: number;
  status: string;
  cardId: string | null;
  paidAt: Timestamp | null;
}

export interface DeliveryInfo {
  riderId: string | null;
  riderName: string | null;
  riderPhone: string | null;
  address: string;
  fee: number;
  status: string;
  deliveredAt: Timestamp | null;
}

export interface Order {
  orderId: string;
  customerId: string;
  branchId: string;
  orderType: "Delivery" | "Takeout" | "Dine-in";
  status: string;
  total: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  customerName: string;
  customerPhone: string;
  branchName: string;
  branchAddress: string;
  items: OrderItem[];
  payment: Payment | null;
  delivery: DeliveryInfo | null;
}

export interface PlaceOrderInput {
  customer: CustomerSession;
  branch: CompatBranch;
  orderType: "Delivery" | "Takeout" | "Dine-in";
  items: OrderItem[];
  paymentMethod: string;
  paymentAmount: number;
  deliveryAddress?: string | null;
  deliveryFee?: number;
}

function normalizeBranchId(branch: CompatBranch): string {
  return String(branch.Brnch_ID);
}

export async function placeCustomerOrder(input: PlaceOrderInput): Promise<string> {
  const now = Timestamp.now();
  const deliveryFee = input.orderType === "Delivery" ? input.deliveryFee ?? 50 : 0;
  const branchAddress = [input.branch.Brnch_Address, input.branch.Brnch_City]
    .filter(Boolean)
    .join(", ");

  const ref = doc(collection(db, "orders"));

  await setDoc(ref, {
    orderId: ref.id,
    customerId: input.customer.uid,
    branchId: normalizeBranchId(input.branch),
    orderType: input.orderType,
    status: "Pending",
    total: input.paymentAmount,
    createdAt: now,
    updatedAt: now,
    customerName: input.customer.displayName,
    customerPhone: input.customer.phoneNo,
    branchName: input.branch.Brnch_Name,
    branchAddress,
    items: input.items,
    payment: {
      method: input.paymentMethod,
      amount: input.paymentAmount,
      status: "Completed",
      cardId: null,
      paidAt: now,
    },
    delivery:
      input.orderType === "Delivery"
        ? {
            riderId: null,
            riderName: null,
            riderPhone: null,
            address: input.deliveryAddress?.trim() || input.customer.address || "",
            fee: deliveryFee,
            status: "Pending",
            deliveredAt: null,
          }
        : null,
  });

  return ref.id;
}

export function subscribeToOrder(
  orderId: string,
  onUpdate: (order: Order | null) => void
): Unsubscribe {
  const ref = doc(db, "orders", orderId);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      onUpdate({ orderId: snap.id, ...snap.data() } as Order);
    },
    (error: FirestoreError) => {
      if (error.code === "permission-denied") {
        onUpdate(null);
        return;
      }
      console.error("Order subscription failed:", error);
      onUpdate(null);
    }
  );
}

export function subscribeToCustomerOrders(
  customerId: string,
  onUpdate: (orders: Order[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "orders"),
    where("customerId", "==", customerId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      const orders = snap.docs.map(
        (d) => ({ orderId: d.id, ...d.data() } as Order)
      );
      onUpdate(orders);
    },
    (error: FirestoreError) => {
      if (error.code === "permission-denied") {
        onUpdate([]);
        return;
      }
      console.error("Customer orders subscription failed:", error);
      onUpdate([]);
    }
  );
}

export function subscribeToBranchOrders(
  branchId: string,
  statuses: string[],
  onUpdate: (orders: Order[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "orders"),
    where("branchId", "==", branchId),
    where("status", "in", statuses),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(
    q,
    (snap) => {
      const orders = snap.docs.map(
        (d) => ({ orderId: d.id, ...d.data() } as Order)
      );
      onUpdate(orders);
    },
    (error: FirestoreError) => {
      if (error.code === "permission-denied") {
        onUpdate([]);
        return;
      }
      console.error("Branch orders subscription failed:", error);
      onUpdate([]);
    }
  );
}

export async function placeOrder(
  order: Omit<Order, "orderId">
): Promise<string> {
  const ref = await addDoc(collection(db, "orders"), {
    ...order,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: string
): Promise<void> {
  const ref = doc(db, "orders", orderId);
  await updateDoc(ref, {
    status: newStatus,
    updatedAt: Timestamp.now(),
  });
}
