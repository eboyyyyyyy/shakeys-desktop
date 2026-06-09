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

    if (newPassword) {
      if (!password) return NextResponse.json({ error: 'Current password is required to set a new password' }, { status: 400 });
      if (newPassword.length < 8) return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });

      const employees = await query<any[]>('SELECT Emp_Password FROM Employee WHERE Emp_ID = ?', [id]);
      if (employees.length === 0) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

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

    const employee = updated[0];
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    await updateLegacyLinkedStaffProfile(Number(employee.Emp_ID), {
      firstName: employee.Emp_FName,
      lastName: employee.Emp_LName,
      email: employee.Emp_Email,
      phoneNo: employee.Emp_PhoneNo,
      branchId: employee.Emp_BranchID,
      position: employee.Emp_Position,
      status: employee.Emp_Status,
    }, {
      branchId: employee.Emp_BranchID,
      role: employee.Emp_Position === 'Admin' || employee.Emp_Position === 'General Admin'
        ? undefined
        : 'employee',
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Error updating employee profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
