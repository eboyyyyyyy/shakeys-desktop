import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  where,
} from "firebase/firestore";
import {
  normalizeCustomerSession,
  type CustomerMembership,
  type CustomerProfileDoc,
  type CustomerRegistrationPayload,
  type CustomerSession,
} from "@/lib/customer";
import { db } from "./firebaseConfig";

export async function fetchCustomerSession(uid: string): Promise<CustomerSession | null> {
  const userSnapshot = await getDoc(doc(db, "users", uid));

  if (!userSnapshot.exists()) {
    return null;
  }

  const membershipSnapshot = await getDoc(doc(db, "memberships", uid));

  return normalizeCustomerSession(
    {
      uid,
      ...(userSnapshot.data() as Record<string, unknown>),
    } as CustomerProfileDoc,
    membershipSnapshot.exists()
      ? (membershipSnapshot.data() as Record<string, unknown>)
      : null
  );
}

export async function findCustomerEmailByPhone(phoneNo: string): Promise<string | null> {
  const userQuery = query(
    collection(db, "users"),
    where("phoneNo", "==", phoneNo.trim()),
    limit(1)
  );
  const snapshot = await getDocs(userQuery);

  if (snapshot.empty) {
    return null;
  }

  const profile = snapshot.docs[0].data() as Record<string, unknown>;

  if (profile.role !== "customer" || typeof profile.email !== "string") {
    return null;
  }

  return profile.email;
}

export async function createCustomerProfile(
  payload: CustomerRegistrationPayload
): Promise<CustomerSession> {
  const { uid, firstName, lastName, email, phone, address, createMembership, membershipTier } =
    payload;

  const userRef = doc(db, "users", uid);
  const membershipRef = doc(db, "memberships", uid);

  const existingUser = await getDoc(userRef);
  if (existingUser.exists()) {
    throw new Error("Customer profile already exists.");
  }

  const tier = membershipTier === "Gold" ? "Gold" : "Silver";
  const membership: CustomerMembership | null = createMembership
    ? {
        type: tier,
        points: tier === "Gold" ? 250 : 150,
        startDate: serverTimestamp(),
        endDate: null,
      }
    : null;

  const profile: CustomerProfileDoc = {
    uid,
    role: "customer",
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim(),
    phoneNo: phone.trim(),
    branchId: null,
    position: null,
    status: "Active",
    address: address?.trim() || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const batch = writeBatch(db);
  batch.set(userRef, profile);

  if (membership) {
    batch.set(membershipRef, membership);
  }

  await batch.commit();

  return normalizeCustomerSession(profile, membership);
}

export async function updateCustomerProfile(
  current: CustomerSession,
  updates: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNo: string;
    address?: string | null;
  }
): Promise<CustomerSession> {
  const userRef = doc(db, "users", current.uid);

  await updateDoc(userRef, {
    firstName: updates.firstName.trim(),
    lastName: updates.lastName.trim(),
    email: updates.email.trim(),
    phoneNo: updates.phoneNo.trim(),
    address: updates.address?.trim() || null,
    updatedAt: serverTimestamp(),
  });

  return normalizeCustomerSession(
    {
      ...current,
      firstName: updates.firstName.trim(),
      lastName: updates.lastName.trim(),
      email: updates.email.trim(),
      phoneNo: updates.phoneNo.trim(),
      address: updates.address?.trim() || null,
      updatedAt: serverTimestamp(),
    },
    current.membership
  );
}
