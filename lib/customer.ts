export interface CustomerMembership {
  type: string;
  points: number;
  startDate?: unknown;
  endDate?: unknown;
}

export interface CustomerProfileDoc {
  uid: string;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNo: string;
  branchId?: string | null;
  position?: string | null;
  status: string;
  address?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CustomerSession extends CustomerProfileDoc {
  membership: CustomerMembership | null;
  displayName: string;
  isGuest?: boolean;
  Cust_ID: string;
  Cust_FirstName: string;
  Cust_LastName: string;
  Cust_Email: string;
  Cust_PhoneNo: string;
  Cust_PhoneNumber: string;
  Cust_Address: string | null;
  Cust_MembershipID: string | null;
  Mem_Type: string | null;
  Mem_Points: number;
}

export interface CustomerRegistrationPayload {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  createMembership?: boolean;
  membershipTier?: "Silver" | "Gold" | null;
}

function normalizeMembership(
  membership: Partial<CustomerMembership> | null | undefined
): CustomerMembership | null {
  if (!membership) {
    return null;
  }

  return {
    type: membership.type === "Gold" ? "Gold" : "Silver",
    points: typeof membership.points === "number" ? membership.points : 0,
    startDate: membership.startDate ?? null,
    endDate: membership.endDate ?? null,
  };
}

export function normalizeCustomerSession(
  profile: CustomerProfileDoc,
  membership?: Partial<CustomerMembership> | null,
  options?: { isGuest?: boolean }
): CustomerSession {
  const normalizedMembership = normalizeMembership(membership);
  const firstName = profile.firstName?.trim() || "Customer";
  const lastName = profile.lastName?.trim() || "";
  const address = profile.address?.trim() || null;

  return {
    uid: profile.uid,
    role: profile.role || "customer",
    firstName,
    lastName,
    email: profile.email?.trim() || "",
    phoneNo: profile.phoneNo?.trim() || "",
    branchId: profile.branchId ?? null,
    position: profile.position ?? null,
    status: profile.status || "Active",
    address,
    createdAt: profile.createdAt ?? null,
    updatedAt: profile.updatedAt ?? null,
    membership: normalizedMembership,
    displayName: [firstName, lastName].filter(Boolean).join(" ").trim(),
    isGuest: options?.isGuest ?? false,
    Cust_ID: profile.uid,
    Cust_FirstName: firstName,
    Cust_LastName: lastName,
    Cust_Email: profile.email?.trim() || "",
    Cust_PhoneNo: profile.phoneNo?.trim() || "",
    Cust_PhoneNumber: profile.phoneNo?.trim() || "",
    Cust_Address: address,
    Cust_MembershipID: normalizedMembership ? profile.uid : null,
    Mem_Type: normalizedMembership?.type ?? null,
    Mem_Points: normalizedMembership?.points ?? 0,
  };
}

export function createGuestCustomerSession(): CustomerSession {
  return normalizeCustomerSession(
    {
      uid: "guest",
      role: "customer",
      firstName: "Guest",
      lastName: "User",
      email: "guest@example.com",
      phoneNo: "09170000000",
      status: "Guest",
      address: "Manila, Philippines",
    },
    null,
    { isGuest: true }
  );
}
