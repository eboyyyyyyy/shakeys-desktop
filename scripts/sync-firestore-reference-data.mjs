import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function getServiceAccount() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in your environment.');
  }

  return { projectId, clientEmail, privateKey };
}

function normalizeImagePath(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.startsWith('/') ? trimmed : `/menu/${trimmed.replace(/^menu\//, '')}`;
}

loadEnvFile();

const serviceAccount = getServiceAccount();
const app = getApps()[0] ?? initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.projectId,
});
const db = getFirestore(app);

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'shakeys_db',
});

async function syncBranches() {
  const [rows] = await pool.query(`
    SELECT Brnch_ID, Brnch_Name, Brnch_Address, Brnch_City, Brnch_PhoneNo, Brnch_Status
    FROM Branch
    ORDER BY Brnch_ID
  `);

  const batch = db.batch();
  for (const row of rows) {
    const branchId = String(row.Brnch_ID);
    batch.set(db.collection('branches').doc(branchId), {
      branchId,
      name: String(row.Brnch_Name ?? '').trim(),
      address: String(row.Brnch_Address ?? '').trim(),
      city: String(row.Brnch_City ?? '').trim(),
      phoneNo: String(row.Brnch_PhoneNo ?? '').trim(),
      status: String(row.Brnch_Status ?? 'Active'),
      updatedAt: new Date(),
    }, { merge: true });
  }

  await batch.commit();
  return rows.length;
}

async function syncMenuItems() {
  const [rows] = await pool.query(`
    SELECT Menu_ID, Menu_Name, Menu_Description, Menu_Category, Menu_Price, Menu_Availability, Menu_Image
    FROM Menu_Item
    ORDER BY Menu_ID
  `);

  const batch = db.batch();
  for (const row of rows) {
    const menuId = String(row.Menu_ID);
    batch.set(db.collection('menuItems').doc(menuId), {
      menuItemId: menuId,
      name: String(row.Menu_Name ?? '').trim(),
      description: String(row.Menu_Description ?? '').trim(),
      category: String(row.Menu_Category ?? '').trim(),
      price: typeof row.Menu_Price === 'number' ? row.Menu_Price : parseFloat(String(row.Menu_Price ?? '0')) || 0,
      availability: String(row.Menu_Availability ?? '').toUpperCase() === 'Y',
      imageUrl: normalizeImagePath(row.Menu_Image),
      updatedAt: new Date(),
    }, { merge: true });
  }

  await batch.commit();
  return rows.length;
}

async function main() {
  const [branchCount, menuCount] = await Promise.all([
    syncBranches(),
    syncMenuItems(),
  ]);

  console.log(`Synced ${branchCount} branches and ${menuCount} menu items into Firestore.`);
}

main()
  .catch((error) => {
    console.error('Failed to sync reference data into Firestore.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
