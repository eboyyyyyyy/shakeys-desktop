import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireBranchAdmin } from '@/lib/adminAuth';
import bcrypt from 'bcrypt';
import { invalidateCacheByPrefix } from '@/lib/serverCache';

const BLOCKED_POSITIONS = ['Admin', 'General Admin'];

async function getEmployeeBranch(empId: number) {
  const rows = await query<Record<string, any>[]>(
    'SELECT Emp_BranchID, Emp_Position FROM Employee WHERE Emp_ID = ?',
    [empId]
  );
  return rows[0] || null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { admin, response } = await requireBranchAdmin(request);
    if (response) return response;

    const { id } = await params;
    const empId = parseInt(id);
    const existing = await getEmployeeBranch(empId);

    if (!existing) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    if (existing.Emp_BranchID !== admin!.Emp_BranchID) {
      return NextResponse.json({ error: 'Cannot manage employees outside your assigned branch.' }, { status: 403 });
    }
    if (BLOCKED_POSITIONS.includes(existing.Emp_Position)) {
      return NextResponse.json({ error: 'Branch admins cannot manage admin accounts.' }, { status: 403 });
    }

    const body = await request.json();
    const { Emp_FName, Emp_LName, Emp_Position, Emp_PhoneNo, Emp_Email, Emp_Status, Emp_Password } = body;

    if (BLOCKED_POSITIONS.includes(Emp_Position)) {
      return NextResponse.json({ error: 'Branch admins cannot assign admin positions.' }, { status: 403 });
    }

    if (Emp_Password) {
      const hashedPassword = await bcrypt.hash(Emp_Password, 10);
      await query(
        `UPDATE Employee
         SET Emp_BranchID = ?, Emp_FName = ?, Emp_LName = ?, Emp_Position = ?,
             Emp_PhoneNo = ?, Emp_Email = ?, Emp_Status = ?, Emp_Password = ?
         WHERE Emp_ID = ?`,
        [admin!.Emp_BranchID, Emp_FName, Emp_LName, Emp_Position, Emp_PhoneNo, Emp_Email, Emp_Status, hashedPassword, empId]
      );
    } else {
      await query(
        `UPDATE Employee
         SET Emp_BranchID = ?, Emp_FName = ?, Emp_LName = ?, Emp_Position = ?,
             Emp_PhoneNo = ?, Emp_Email = ?, Emp_Status = ?
         WHERE Emp_ID = ?`,
        [admin!.Emp_BranchID, Emp_FName, Emp_LName, Emp_Position, Emp_PhoneNo, Emp_Email, Emp_Status, empId]
      );
    }

    invalidateCacheByPrefix(`admin:employees:${admin!.Emp_BranchID}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { admin, response } = await requireBranchAdmin(request);
    if (response) return response;

    const { id } = await params;
    const empId = parseInt(id);
    const existing = await getEmployeeBranch(empId);

    if (!existing) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    if (existing.Emp_BranchID !== admin!.Emp_BranchID) {
      return NextResponse.json({ error: 'Cannot delete employees outside your assigned branch.' }, { status: 403 });
    }
    if (BLOCKED_POSITIONS.includes(existing.Emp_Position)) {
      return NextResponse.json({ error: 'Branch admins cannot delete admin accounts.' }, { status: 403 });
    }

    await query('DELETE FROM Employee WHERE Emp_ID = ?', [empId]);
    invalidateCacheByPrefix(`admin:employees:${admin!.Emp_BranchID}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}
