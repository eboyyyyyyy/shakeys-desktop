import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { deleteApp, initializeApp } from 'firebase/app';
import { auth, db, firebaseConfig } from './firebaseConfig';
import {
  normalizeStaffSession,
  type StaffProfileDoc,
  type StaffRole,
  type StaffSession,
} from '@/lib/staff';

async function resolveBranchName(branchId?: string | null): Promise<string | null> {
  if (!branchId) {
    return null;
  }

  const directDoc = await getDoc(doc(db, 'branches', String(branchId)));
  if (directDoc.exists()) {
    const data = directDoc.data() as Record<string, unknown>;
    return typeof data.name === 'string' ? data.name : null;
  }

  const branchQuery = query(
    collection(db, 'branches'),
    where('branchId', '==', String(branchId)),
    limit(1)
  );
  const branchSnapshot = await getDocs(branchQuery);
  if (branchSnapshot.empty) {
    return null;
  }

  const branch = branchSnapshot.docs[0].data() as Record<string, unknown>;
  return typeof branch.name === 'string' ? branch.name : null;
}

async function resolveWritableBranchId(branchId?: string | number | null): Promise<string | number | null> {
  if (branchId == null) {
    return null;
  }

  const requested = String(branchId);
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) {
    return requested;
  }

  const currentSnapshot = await getDoc(doc(db, 'users', currentUid));
  if (!currentSnapshot.exists()) {
    return requested;
  }

  const currentData = currentSnapshot.data() as Record<string, unknown>;
  const currentBranchId = currentData.branchId;

  if (typeof currentBranchId === 'string' && currentBranchId === requested) {
    return currentBranchId;
  }

  if (typeof currentBranchId === 'number' && String(currentBranchId) === requested) {
    return currentBranchId;
  }

  return requested;
}

export async function fetchStaffSession(uid: string): Promise<StaffSession | null> {
  const userSnapshot = await getDoc(doc(db, 'users', uid));
  if (!userSnapshot.exists()) {
    return null;
  }

  const profile = {
    uid,
    ...(userSnapshot.data() as Record<string, unknown>),
  } as StaffProfileDoc;

  if (!['general_admin', 'branch_admin', 'employee', 'rider'].includes(profile.role)) {
    return null;
  }

  const branchName = await resolveBranchName(profile.branchId ?? null);
  return normalizeStaffSession(profile, branchName);
}

export async function findStaffEmailByPhone(phoneNo: string): Promise<string | null> {
  const staffQuery = query(
    collection(db, 'users'),
    where('phoneNo', '==', phoneNo.trim()),
    limit(1)
  );
  const snapshot = await getDocs(staffQuery);
  if (snapshot.empty) {
    return null;
  }

  const data = snapshot.docs[0].data() as Record<string, unknown>;
  const role = typeof data.role === 'string' ? data.role : '';
  if (!['general_admin', 'branch_admin', 'employee', 'rider'].includes(role)) {
    return null;
  }

  return typeof data.email === 'string' ? data.email : null;
}

export async function hasFirebaseGeneralAdmin(): Promise<boolean> {
  const bootstrapSnapshot = await getDoc(doc(db, 'system', 'bootstrap'));
  return bootstrapSnapshot.exists();
}

export async function bootstrapGeneralAdminFromLegacyAccount(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNo: string;
  branchId: string | number | null;
  legacyId: number;
}) {
  const alreadyExists = await hasFirebaseGeneralAdmin();
  if (alreadyExists) {
    throw new Error('A Firebase General Admin account already exists.');
  }

  const appName = `general-admin-bootstrap-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, appName);
  const secondaryAuth = getAuth(secondaryApp);
  const secondaryDb = getFirestore(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      input.email.trim(),
      input.password
    );

    const uid = credential.user.uid;
    const branchId = input.branchId == null ? null : String(input.branchId);
    const userRef = doc(secondaryDb, 'users', uid);
    const bootstrapRef = doc(secondaryDb, 'system', 'bootstrap');

    const batch = writeBatch(secondaryDb);
    batch.set(userRef, {
      uid,
      role: 'general_admin',
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim(),
      phoneNo: input.phoneNo.trim(),
      branchId,
      position: 'General Admin',
      status: 'Active',
      legacyId: input.legacyId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(bootstrapRef, {
      createdBy: uid,
      role: 'general_admin',
      createdAt: serverTimestamp(),
    });
    await batch.commit();

    return uid;
  } finally {
    try {
      await signOut(secondaryAuth);
    } catch {
      // Ignore cleanup failures.
    }
    await deleteApp(secondaryApp);
  }
}

async function findUserDocIdByLegacyId(
  legacyId: number,
  options?: {
    branchId?: string | number | null;
    role?: Exclude<StaffRole, 'general_admin'> | 'general_admin';
  }
): Promise<string | null> {
  const constraints = [where('legacyId', '==', legacyId)] as Parameters<typeof query>[1][];

  if (options?.branchId != null) {
    constraints.push(where('branchId', '==', String(options.branchId)));
  }

  if (options?.role) {
    constraints.push(where('role', '==', options.role));
  }

  constraints.push(limit(1));

  const userQuery = query(collection(db, 'users'), ...constraints);
  const snapshot = await getDocs(userQuery);
  return snapshot.empty ? null : snapshot.docs[0].id;
}

function buildStaffProfile(input: {
  uid: string;
  role: Exclude<StaffRole, 'general_admin'>;
  email: string;
  firstName: string;
  lastName: string;
  phoneNo: string;
  branchId?: string | number | null;
  position?: string | null;
  legacyId: number;
}) {
  return {
    uid: input.uid,
    role: input.role,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim(),
    phoneNo: input.phoneNo.trim(),
    branchId: input.branchId == null ? null : input.branchId,
    position: input.position ?? null,
    status: 'Active',
    legacyId: input.legacyId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export async function createLegacyLinkedStaffAccount(input: {
  role: Exclude<StaffRole, 'general_admin'>;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNo: string;
  branchId?: string | number | null;
  position?: string | null;
  legacyId: number;
}) {
  const existingDocId = await findUserDocIdByLegacyId(input.legacyId, {
    branchId: input.branchId,
    role: input.role,
  });
  if (existingDocId) {
    return existingDocId;
  }

  const appName = `staff-create-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, appName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    let uid: string;

    try {
      const credential = await createUserWithEmailAndPassword(
        secondaryAuth,
        input.email.trim(),
        input.password
      );
      uid = credential.user.uid;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!message.includes('auth/email-already-in-use')) {
        throw error;
      }

      const existingCredential = await signInWithEmailAndPassword(
        secondaryAuth,
        input.email.trim(),
        input.password
      );
      uid = existingCredential.user.uid;
    }

    const branchId = await resolveWritableBranchId(input.branchId);
    const batch = writeBatch(db);

    batch.set(doc(db, 'users', uid), buildStaffProfile({ ...input, uid, branchId }), { merge: true });

    if (input.role === 'rider') {
      batch.set(doc(db, 'riders', uid), {
        branchId,
        activeDeliveryCount: 0,
        activeDeliveryIds: [],
        dailyEarnings: 0,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    await batch.commit();
    return uid;
  } finally {
    try {
      await signOut(secondaryAuth);
    } catch {
      // Ignore cleanup failures.
    }
    await deleteApp(secondaryApp);
  }
}

export async function linkExistingLegacyStaffAccount(input: {
  role: Exclude<StaffRole, 'general_admin'>;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNo: string;
  branchId?: string | number | null;
  position?: string | null;
  legacyId: number;
}) {
  return createLegacyLinkedStaffAccount(input);
}

export async function updateLegacyLinkedStaffProfile(
  legacyId: number,
  updates: {
    firstName: string;
    lastName: string;
    email?: string;
    phoneNo: string;
    branchId?: string | number | null;
    position?: string | null;
    status?: string;
  },
  options?: {
    branchId?: string | number | null;
    role?: Exclude<StaffRole, 'general_admin'> | 'general_admin';
  }
) {
  const docId = await findUserDocIdByLegacyId(legacyId, options);
  if (!docId) {
    return;
  }

  const branchId = updates.branchId !== undefined ? await resolveWritableBranchId(updates.branchId) : undefined;

  await setDoc(doc(db, 'users', docId), {
    firstName: updates.firstName.trim(),
    lastName: updates.lastName.trim(),
    phoneNo: updates.phoneNo.trim(),
    ...(updates.email ? { email: updates.email.trim() } : {}),
    ...(updates.branchId !== undefined ? { branchId: branchId == null ? null : branchId } : {}),
    ...(updates.position !== undefined ? { position: updates.position } : {}),
    ...(updates.status ? { status: updates.status } : {}),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function updateOwnStaffProfile(
  uid: string,
  updates: {
    firstName: string;
    lastName: string;
    email?: string;
    phoneNo: string;
    branchId?: string | number | null;
    position?: string | null;
    status?: string;
  }
) {
  const branchId = updates.branchId !== undefined ? await resolveWritableBranchId(updates.branchId) : undefined;

  await setDoc(doc(db, 'users', uid), {
    firstName: updates.firstName.trim(),
    lastName: updates.lastName.trim(),
    phoneNo: updates.phoneNo.trim(),
    ...(updates.email ? { email: updates.email.trim() } : {}),
    ...(updates.branchId !== undefined ? { branchId: branchId == null ? null : branchId } : {}),
    ...(updates.position !== undefined ? { position: updates.position } : {}),
    ...(updates.status ? { status: updates.status } : {}),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function deactivateLegacyLinkedStaffProfile(
  legacyId: number,
  options?: {
    branchId?: string | number | null;
    role?: Exclude<StaffRole, 'general_admin'> | 'general_admin';
  }
) {
  const docId = await findUserDocIdByLegacyId(legacyId, options);
  if (!docId) {
    return;
  }

  await setDoc(doc(db, 'users', docId), {
    status: 'Inactive',
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function syncLegacyBranch(input: {
  branchId: number | string;
  name: string;
  address: string;
  city: string;
  phoneNo: string;
  status: string;
}) {
  await setDoc(doc(db, 'branches', String(input.branchId)), {
    branchId: String(input.branchId),
    name: input.name.trim(),
    address: input.address.trim(),
    city: input.city.trim(),
    phoneNo: input.phoneNo.trim(),
    status: input.status,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
