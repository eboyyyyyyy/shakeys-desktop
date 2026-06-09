import { adminDb, adminTimestamp } from '@/lib/firebase-admin';

export type LegacyBranchRow = {
  Brnch_ID: number | string;
  Brnch_Name: string;
  Brnch_Address: string;
  Brnch_City: string;
  Brnch_PhoneNo: string;
  Brnch_Status: string;
};

export type LegacyMenuRow = {
  Menu_ID: number | string;
  Menu_Name: string;
  Menu_Description: string | null;
  Menu_Category: string;
  Menu_Price: number | string;
  Menu_Availability: string;
  Menu_Image?: string | null;
};

function normalizeImagePath(value?: string | null) {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.startsWith('/') ? trimmed : `/menu/${trimmed.replace(/^menu\//, '')}`;
}

export function mapBranchRowToFirestore(row: LegacyBranchRow) {
  return {
    branchId: String(row.Brnch_ID),
    name: row.Brnch_Name.trim(),
    address: row.Brnch_Address.trim(),
    city: row.Brnch_City.trim(),
    phoneNo: row.Brnch_PhoneNo.trim(),
    status: row.Brnch_Status,
    updatedAt: adminTimestamp(),
  };
}

export function mapMenuRowToFirestore(row: LegacyMenuRow) {
  const numericPrice = typeof row.Menu_Price === 'number'
    ? row.Menu_Price
    : parseFloat(String(row.Menu_Price));

  return {
    menuItemId: String(row.Menu_ID),
    name: row.Menu_Name.trim(),
    description: row.Menu_Description?.trim() ?? '',
    imageUrl: normalizeImagePath(row.Menu_Image),
    category: row.Menu_Category.trim(),
    price: Number.isFinite(numericPrice) ? numericPrice : 0,
    availability: String(row.Menu_Availability).toUpperCase() === 'Y',
    updatedAt: adminTimestamp(),
  };
}

export async function syncBranchToFirestore(row: LegacyBranchRow) {
  await adminDb.collection('branches').doc(String(row.Brnch_ID)).set(
    mapBranchRowToFirestore(row),
    { merge: true }
  );
}

export async function deleteBranchFromFirestore(branchId: number | string) {
  await adminDb.collection('branches').doc(String(branchId)).delete();
}

export async function syncMenuItemToFirestore(row: LegacyMenuRow) {
  await adminDb.collection('menuItems').doc(String(row.Menu_ID)).set(
    mapMenuRowToFirestore(row),
    { merge: true }
  );
}

export async function deleteMenuItemFromFirestore(menuId: number | string) {
  await adminDb.collection('menuItems').doc(String(menuId)).delete();
}
