import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export interface AuthenticatedAdmin {
  Emp_ID: number;
  Emp_BranchID: number;
  Emp_FName: string;
  Emp_LName: string;
  Emp_Position: 'Admin' | 'General Admin' | string;
  Emp_Email: string;
  Emp_Status: string;
  Brnch_Name: string | null;
}

export async function getAdminFromRequest(request: Request): Promise<AuthenticatedAdmin | null> {
  const adminId = Number(request.headers.get('x-admin-id'));

  if (!Number.isInteger(adminId) || adminId <= 0) {
    return null;
  }

  const admins = await query<AuthenticatedAdmin[]>(
    `SELECT e.Emp_ID, e.Emp_BranchID, e.Emp_FName, e.Emp_LName,
            e.Emp_Position, e.Emp_Email, e.Emp_Status, b.Brnch_Name
     FROM Employee e
     LEFT JOIN Branch b ON e.Emp_BranchID = b.Brnch_ID
     WHERE e.Emp_ID = ?
       AND e.Emp_Status = 'Active'
       AND e.Emp_Position IN ('Admin', 'General Admin')`,
    [adminId]
  );

  return admins[0] || null;
}

export async function requireGeneralAdmin(request: Request) {
  const admin = await getAdminFromRequest(request);

  if (!admin || admin.Emp_Position !== 'General Admin') {
    return {
      admin: null,
      response: NextResponse.json({ error: 'General Admin access is required.' }, { status: 403 }),
    };
  }

  return { admin, response: null };
}

export async function requireBranchAdmin(request: Request) {
  const admin = await getAdminFromRequest(request);

  if (!admin || admin.Emp_Position !== 'Admin') {
    return {
      admin: null,
      response: NextResponse.json({ error: 'Branch Admin access is required.' }, { status: 403 }),
    };
  }

  if (!admin.Emp_BranchID) {
    return {
      admin: null,
      response: NextResponse.json({ error: 'Admin must be assigned to a branch.' }, { status: 403 }),
    };
  }

  return { admin, response: null };
}