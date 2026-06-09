export type StaffRole = 'general_admin' | 'branch_admin' | 'employee' | 'rider';

export interface StaffProfileDoc {
  uid: string;
  role: StaffRole;
  firstName: string;
  lastName: string;
  email: string;
  phoneNo: string;
  branchId?: string | null;
  position?: string | null;
  status: string;
  legacyId?: number | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StaffSession extends StaffProfileDoc {
  displayName: string;
  Emp_ID: number | string;
  Emp_BranchID: number | string | null;
  Emp_FName: string;
  Emp_LName: string;
  Emp_PhoneNo: string;
  Emp_Position: string;
  Emp_Email: string;
  Emp_Status: string;
  Brnch_Name?: string;
  Rider_ID: number | string;
  Rider_FName: string;
  Rider_LName: string;
  Rider_PhoneNo: string;
  Rider_Status: string;
  Rider_BranchID: number | string | null;
}

function normalizeCompatId(value: unknown, fallback: string): number | string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : value;
  }
  const fallbackNumber = Number(fallback);
  return Number.isFinite(fallbackNumber) ? fallbackNumber : fallback;
}

function toLegacyPosition(role: StaffRole, position?: string | null): string {
  if (role === 'general_admin') {
    return 'General Admin';
  }
  if (role === 'branch_admin') {
    return 'Admin';
  }
  if (role === 'rider') {
    return 'Rider';
  }
  return position?.trim() || 'Employee';
}

export function normalizeStaffSession(
  profile: StaffProfileDoc,
  branchName?: string | null
): StaffSession {
  const firstName = profile.firstName?.trim() || 'Staff';
  const lastName = profile.lastName?.trim() || '';
  const uid = profile.uid;
  const compatId = normalizeCompatId(profile.legacyId, uid);
  const branchId = profile.branchId ?? null;
  const compatBranchId = branchId == null ? null : normalizeCompatId(branchId, String(branchId));
  const legacyPosition = toLegacyPosition(profile.role, profile.position);

  return {
    ...profile,
    firstName,
    lastName,
    email: profile.email?.trim() || '',
    phoneNo: profile.phoneNo?.trim() || '',
    branchId,
    position: profile.position ?? null,
    status: profile.status || 'Active',
    legacyId: typeof profile.legacyId === 'number' ? profile.legacyId : null,
    displayName: [firstName, lastName].filter(Boolean).join(' ').trim(),
    Emp_ID: compatId,
    Emp_BranchID: compatBranchId,
    Emp_FName: firstName,
    Emp_LName: lastName,
    Emp_PhoneNo: profile.phoneNo?.trim() || '',
    Emp_Position: legacyPosition,
    Emp_Email: profile.email?.trim() || '',
    Emp_Status: profile.status || 'Active',
    Brnch_Name: branchName || undefined,
    Rider_ID: compatId,
    Rider_FName: firstName,
    Rider_LName: lastName,
    Rider_PhoneNo: profile.phoneNo?.trim() || '',
    Rider_Status: profile.status || 'Active',
    Rider_BranchID: compatBranchId,
  };
}

