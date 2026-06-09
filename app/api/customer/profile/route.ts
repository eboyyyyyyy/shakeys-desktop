import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcrypt';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { Cust_FirstName, Cust_LastName, Cust_Email, Cust_PhoneNo, Cust_Address, password, newPassword, id } = body;

    if (!Cust_FirstName?.trim()) return NextResponse.json({ error: 'First name is required' }, { status: 400 });
    if (!Cust_LastName?.trim()) return NextResponse.json({ error: 'Last name is required' }, { status: 400 });
    if (!Cust_Email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(Cust_Email.trim())) return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    if (!Cust_PhoneNo?.trim()) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    if (!/^\d+$/.test(Cust_PhoneNo.trim())) return NextResponse.json({ error: 'Phone number must contain numbers only' }, { status: 400 });
    if (Cust_PhoneNo.trim().length !== 11) return NextResponse.json({ error: 'Phone number must be 11 digits' }, { status: 400 });

    // Check duplicate email (excluding self)
    const dupEmail = await query<any[]>(
      'SELECT Cust_ID FROM Customer WHERE Cust_Email = ? AND Cust_ID != ?',
      [Cust_Email.trim(), id]
    );
    if (dupEmail.length > 0) return NextResponse.json({ error: 'Email already in use' }, { status: 400 });

    // Password change requested
    if (newPassword) {
      if (!password) return NextResponse.json({ error: 'Current password is required to set a new password' }, { status: 400 });
      if (newPassword.length < 8) return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });

      const customers = await query<any[]>('SELECT Cust_Password FROM Customer WHERE Cust_ID = ?', [id]);
      if (customers.length === 0) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

      const match = await bcrypt.compare(password, customers[0].Cust_Password);
      if (!match) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });

      const hashed = await bcrypt.hash(newPassword, 10);
      await query(
        `UPDATE Customer SET Cust_FirstName = ?, Cust_LastName = ?, Cust_Email = ?,
         Cust_PhoneNo = ?, Cust_Address = ?, Cust_Password = ? WHERE Cust_ID = ?`,
        [Cust_FirstName.trim(), Cust_LastName.trim(), Cust_Email.trim(),
         Cust_PhoneNo.trim(), Cust_Address?.trim() || null, hashed, id]
      );
    } else {
      await query(
        `UPDATE Customer SET Cust_FirstName = ?, Cust_LastName = ?, Cust_Email = ?,
         Cust_PhoneNo = ?, Cust_Address = ? WHERE Cust_ID = ?`,
        [Cust_FirstName.trim(), Cust_LastName.trim(), Cust_Email.trim(),
         Cust_PhoneNo.trim(), Cust_Address?.trim() || null, id]
      );
    }

    // Return updated customer
    const updated = await query<any[]>(
      `SELECT c.*, m.Mem_Type, m.Mem_Points FROM Customer c
       LEFT JOIN Membership m ON c.Cust_MembershipID = m.Mem_ID
       WHERE c.Cust_ID = ?`,
      [id]
    );
    const c = updated[0];
    return NextResponse.json({
      Cust_ID: c.Cust_ID,
      Cust_FirstName: c.Cust_FirstName,
      Cust_LastName: c.Cust_LastName,
      Cust_Email: c.Cust_Email,
      Cust_PhoneNo: c.Cust_PhoneNo,
      Cust_Address: c.Cust_Address,
      Cust_MembershipID: c.Cust_MembershipID,
      Mem_Type: c.Mem_Type || null,
      Mem_Points: c.Mem_Points ?? 0,
    });
  } catch (error) {
    console.error('Error updating customer profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
