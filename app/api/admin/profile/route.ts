import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcrypt';
import { updateLegacyLinkedStaffProfile } from '@/lib/firebase/staffProfile';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { Emp_FName, Emp_LName, Emp_PhoneNo, password, newPassword, id } = body;

    if (!Emp_FName?.trim()) return NextResponse.json({ error: 'First name is required' }, { status: 400 });
    if (!Emp_LName?.trim()) return NextResponse.json({ error: 'Last name is required' }, { status: 400 });
    if (!Emp_PhoneNo?.trim()) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    if (!/^\d+$/.test(Emp_PhoneNo.trim())) return NextResponse.json({ error: 'Phone number must contain numbers only' }, { status: 400 });
    if (Emp_PhoneNo.trim().length !== 11) return NextResponse.json({ error: 'Phone number must be 11 digits' }, { status: 400 });

    const employees = await query<any[]>('SELECT Emp_Password, Emp_Position FROM Employee WHERE Emp_ID = ?', [id]);
    if (employees.length === 0) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });

    if (newPassword) {
      if (!password) return NextResponse.json({ error: 'Current password is required to set a new password' }, { status: 400 });
      if (newPassword.length < 8) return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });

      const match = await bcrypt.compare(password, employees[0].Emp_Password);
      if (!match) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });

      const hashed = await bcrypt.hash(newPassword, 10);
      await query(
        'UPDATE Employee SET Emp_FName = ?, Emp_LName = ?, Emp_PhoneNo = ?, Emp_Password = ? WHERE Emp_ID = ?',
        [Emp_FName.trim(), Emp_LName.trim(), Emp_PhoneNo.trim(), hashed, id]
      );
    } else {
      await query(
        'UPDATE Employee SET Emp_FName = ?, Emp_LName = ?, Emp_PhoneNo = ? WHERE Emp_ID = ?',
        [Emp_FName.trim(), Emp_LName.trim(), Emp_PhoneNo.trim(), id]
      );
    }

    const updated = await query<any[]>(
      'SELECT Emp_ID, Emp_BranchID, Emp_FName, Emp_LName, Emp_Position, Emp_PhoneNo, Emp_Email, Emp_Status FROM Employee WHERE Emp_ID = ?',
      [id]
    );

    const admin = updated[0];
    if (!admin) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });

    await updateLegacyLinkedStaffProfile(Number(admin.Emp_ID), {
      firstName: admin.Emp_FName,
      lastName: admin.Emp_LName,
      email: admin.Emp_Email,
      phoneNo: admin.Emp_PhoneNo,
      branchId: admin.Emp_BranchID,
      position: admin.Emp_Position,
      status: admin.Emp_Status,
    }, {
      branchId: admin.Emp_BranchID,
      role: admin.Emp_Position === 'General Admin' ? 'general_admin' : 'branch_admin',
    });

    return NextResponse.json(admin);
  } catch (error) {
    console.error('Error updating admin profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
