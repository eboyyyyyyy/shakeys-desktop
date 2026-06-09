import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireBranchAdmin } from '@/lib/adminAuth';
import bcrypt from 'bcrypt';
import { invalidateCacheByPrefix } from '@/lib/serverCache';

async function getRiderBranch(riderId: number) {
  const rows = await query<Record<string, any>[]>(
    'SELECT Rider_BranchID FROM Rider WHERE Rider_ID = ?',
    [riderId]
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
    const riderId = parseInt(id);
    const existing = await getRiderBranch(riderId);

    if (!existing) return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
    if (existing.Rider_BranchID !== admin!.Emp_BranchID) {
      return NextResponse.json({ error: 'Cannot manage riders outside your assigned branch.' }, { status: 403 });
    }

    const body = await request.json();
    const { Rider_FName, Rider_LName, Rider_PhoneNo, Rider_Status, Rider_Password } = body;

    if (Rider_Password) {
      const hashedPassword = await bcrypt.hash(Rider_Password, 10);
      await query(
        `UPDATE Rider
         SET Rider_FName = ?, Rider_LName = ?, Rider_PhoneNo = ?,
             Rider_BranchID = ?, Rider_Status = ?, Rider_Password = ?
         WHERE Rider_ID = ?`,
        [Rider_FName, Rider_LName, Rider_PhoneNo, admin!.Emp_BranchID, Rider_Status, hashedPassword, riderId]
      );
    } else {
      await query(
        `UPDATE Rider
         SET Rider_FName = ?, Rider_LName = ?, Rider_PhoneNo = ?,
             Rider_BranchID = ?, Rider_Status = ?
         WHERE Rider_ID = ?`,
        [Rider_FName, Rider_LName, Rider_PhoneNo, admin!.Emp_BranchID, Rider_Status, riderId]
      );
    }

    invalidateCacheByPrefix(`admin:riders:${admin!.Emp_BranchID}:`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating rider:', error);
    return NextResponse.json({ error: 'Failed to update rider' }, { status: 500 });
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
    const riderId = parseInt(id);
    const existing = await getRiderBranch(riderId);

    if (!existing) return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
    if (existing.Rider_BranchID !== admin!.Emp_BranchID) {
      return NextResponse.json({ error: 'Cannot delete riders outside your assigned branch.' }, { status: 403 });
    }

    try {
      await query('DELETE FROM Rider WHERE Rider_ID = ?', [riderId]);
      invalidateCacheByPrefix(`admin:riders:${admin!.Emp_BranchID}:`);
      return NextResponse.json({ success: true, deleted: true });
    } catch (error) {
      const sqlError = error as { code?: string };
      if (sqlError.code === 'ER_ROW_IS_REFERENCED_2') {
        await query('UPDATE Rider SET Rider_Status = ? WHERE Rider_ID = ?', ['Inactive', riderId]);
        invalidateCacheByPrefix(`admin:riders:${admin!.Emp_BranchID}:`);
        return NextResponse.json({
          success: true,
          deleted: false,
          deactivated: true,
          message: 'Rider has delivery history, so the account was set to Inactive instead of being deleted.',
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error deleting rider:', error);
    return NextResponse.json({ error: 'Failed to delete rider' }, { status: 500 });
  }
}
