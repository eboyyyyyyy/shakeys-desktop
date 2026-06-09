import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireGeneralAdmin } from '@/lib/adminAuth';
import bcrypt from 'bcrypt';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireGeneralAdmin(request);
    if (response) return response;

    const { id } = await params;
    const empId = parseInt(id);

    if (isNaN(empId)) {
      return NextResponse.json({ error: 'Invalid admin ID' }, { status: 400 });
    }

    const body = await request.json();
    const { Emp_BranchID, Emp_FName, Emp_LName, Emp_PhoneNo, Emp_Email, Emp_Status, Emp_Password } = body;

    // --- Validation ---
    if (!Emp_FName?.trim()) return NextResponse.json({ error: 'First name is required' }, { status: 400 });
    if (!Emp_LName?.trim()) return NextResponse.json({ error: 'Last name is required' }, { status: 400 });
    if (!Emp_PhoneNo?.trim()) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    if (!/^\d+$/.test(Emp_PhoneNo.trim())) return NextResponse.json({ error: 'Phone number must contain numbers only' }, { status: 400 });
    if (Emp_PhoneNo.trim().length !== 11) return NextResponse.json({ error: 'Phone number must be 11 digits' }, { status: 400 });
    if (!Emp_Email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(Emp_Email.trim())) return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    if (Emp_Password && Emp_Password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

    // Check duplicate email (excluding self)
    const existing = await query<any[]>(
      'SELECT Emp_ID FROM Employee WHERE Emp_Email = ? AND Emp_ID != ?',
      [Emp_Email.trim(), empId]
    );
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already in use by another account' }, { status: 400 });
    }

    if (Emp_Password) {
      const hashedPassword = await bcrypt.hash(Emp_Password, 10);
      await query(
        `UPDATE Employee
         SET Emp_BranchID = ?, Emp_FName = ?, Emp_LName = ?,
             Emp_PhoneNo = ?, Emp_Email = ?, Emp_Status = ?, Emp_Password = ?
         WHERE Emp_ID = ?`,
        [Emp_BranchID, Emp_FName.trim(), Emp_LName.trim(),
         Emp_PhoneNo.trim(), Emp_Email.trim(), Emp_Status, hashedPassword, empId]
      );
    } else {
      await query(
        `UPDATE Employee
         SET Emp_BranchID = ?, Emp_FName = ?, Emp_LName = ?,
             Emp_PhoneNo = ?, Emp_Email = ?, Emp_Status = ?
         WHERE Emp_ID = ?`,
        [Emp_BranchID, Emp_FName.trim(), Emp_LName.trim(),
         Emp_PhoneNo.trim(), Emp_Email.trim(), Emp_Status, empId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating admin:', error);
    return NextResponse.json({ error: 'Failed to update admin' }, { status: 500 });
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
    const empId = parseInt(id);

    if (isNaN(empId)) {
      return NextResponse.json({ error: 'Invalid admin ID' }, { status: 400 });
    }

    await query('DELETE FROM Employee WHERE Emp_ID = ? AND Emp_Position = ?', [empId, 'Admin']);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting admin:', error);
    return NextResponse.json({ error: 'Failed to delete admin' }, { status: 500 });
  }
}