import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireGeneralAdmin } from '@/lib/adminAuth';
import { deleteBranchFromFirestore, syncBranchToFirestore } from '@/lib/referenceSync';
import { invalidateCacheByPrefix } from '@/lib/serverCache';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireGeneralAdmin(request);
    if (response) return response;

    const { id } = await params;
    const branchId = parseInt(id);

    if (isNaN(branchId)) {
      return NextResponse.json({ error: 'Invalid branch ID' }, { status: 400 });
    }

    const body = await request.json();
    const { Brnch_Name, Brnch_Address, Brnch_City, Brnch_PhoneNo, Brnch_Status } = body;

    if (!Brnch_Name?.trim()) return NextResponse.json({ error: 'Branch name is required' }, { status: 400 });
    if (!Brnch_Address?.trim()) return NextResponse.json({ error: 'Branch address is required' }, { status: 400 });
    if (!Brnch_City?.trim()) return NextResponse.json({ error: 'Branch city is required' }, { status: 400 });
    if (!Brnch_PhoneNo?.trim()) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    if (!/^\d+$/.test(Brnch_PhoneNo.trim())) return NextResponse.json({ error: 'Phone number must contain numbers only' }, { status: 400 });
    if (Brnch_PhoneNo.trim().length < 7 || Brnch_PhoneNo.trim().length > 12) {
      return NextResponse.json({ error: 'Phone number must be between 7 and 12 digits' }, { status: 400 });
    }

    const duplicates = await query<any[]>(
      "SELECT Brnch_ID FROM Branch WHERE LOWER(Brnch_Name) = LOWER(?) AND Brnch_ID != ? AND Brnch_Status != 'Deleted'",
      [Brnch_Name.trim(), branchId]
    );
    if (duplicates.length > 0) {
      return NextResponse.json({ error: 'A branch with this name already exists' }, { status: 400 });
    }

    await query(
      `UPDATE Branch
       SET Brnch_Name = ?, Brnch_Address = ?, Brnch_City = ?,
           Brnch_PhoneNo = ?, Brnch_Status = ?
       WHERE Brnch_ID = ?`,
      [Brnch_Name.trim(), Brnch_Address.trim(), Brnch_City.trim(),
       Brnch_PhoneNo.trim(), Brnch_Status, branchId]
    );

    await syncBranchToFirestore({
      Brnch_ID: branchId,
      Brnch_Name: Brnch_Name.trim(),
      Brnch_Address: Brnch_Address.trim(),
      Brnch_City: Brnch_City.trim(),
      Brnch_PhoneNo: Brnch_PhoneNo.trim(),
      Brnch_Status: Brnch_Status,
    });

    invalidateCacheByPrefix('branch:list:');
    invalidateCacheByPrefix('admin:branches:');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating branch:', error);
    return NextResponse.json({ error: 'Failed to update branch' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireGeneralAdmin(request);
    if (response) return response;

    const { id } = await params;
    const branchId = parseInt(id);

    if (isNaN(branchId)) {
      return NextResponse.json({ error: 'Invalid branch ID' }, { status: 400 });
    }

    const branchRows = await query<any[]>(
      `SELECT Brnch_ID FROM Branch WHERE Brnch_ID = ?`,
      [branchId]
    );

    const branch = branchRows[0];
    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    try {
      await query('DELETE FROM Branch WHERE Brnch_ID = ?', [branchId]);
      await deleteBranchFromFirestore(branchId);
      invalidateCacheByPrefix('branch:list:');
      invalidateCacheByPrefix('admin:branches:');
      return NextResponse.json({ success: true, deleted: true, removedFromFirestore: true });
    } catch (error) {
      const sqlError = error as { code?: string };
      if (sqlError.code === 'ER_ROW_IS_REFERENCED_2') {
        await query("UPDATE Branch SET Brnch_Status = 'Deleted' WHERE Brnch_ID = ?", [branchId]);
        await deleteBranchFromFirestore(branchId);
        invalidateCacheByPrefix('branch:list:');
        invalidateCacheByPrefix('admin:branches:');
        return NextResponse.json({
          success: true,
          deleted: false,
          archived: true,
          removedFromFirestore: true,
          message: 'Branch was removed from Firebase and archived in SQL because linked records still exist.',
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error deleting branch:', error);
    return NextResponse.json({ error: 'Failed to delete branch' }, { status: 500 });
  }
}
