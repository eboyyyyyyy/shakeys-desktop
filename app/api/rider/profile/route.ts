import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcrypt';
import { updateLegacyLinkedStaffProfile } from '@/lib/firebase/staffProfile';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { Rider_FName, Rider_LName, Rider_PhoneNo, password, newPassword, id } = body;

    if (!Rider_FName?.trim()) return NextResponse.json({ error: 'First name is required' }, { status: 400 });
    if (!Rider_LName?.trim()) return NextResponse.json({ error: 'Last name is required' }, { status: 400 });
    if (!Rider_PhoneNo?.trim()) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    if (!/^\d+$/.test(Rider_PhoneNo.trim())) return NextResponse.json({ error: 'Phone number must contain numbers only' }, { status: 400 });
    if (Rider_PhoneNo.trim().length !== 11) return NextResponse.json({ error: 'Phone number must be 11 digits' }, { status: 400 });

    if (newPassword) {
      if (!password) return NextResponse.json({ error: 'Current password is required to set a new password' }, { status: 400 });
      if (newPassword.length < 8) return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });

      const riders = await query<any[]>('SELECT Rider_Password FROM Rider WHERE Rider_ID = ?', [id]);
      if (riders.length === 0) return NextResponse.json({ error: 'Rider not found' }, { status: 404 });

      const match = await bcrypt.compare(password, riders[0].Rider_Password);
      if (!match) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });

      const hashed = await bcrypt.hash(newPassword, 10);
      await query(
        'UPDATE Rider SET Rider_FName = ?, Rider_LName = ?, Rider_PhoneNo = ?, Rider_Password = ? WHERE Rider_ID = ?',
        [Rider_FName.trim(), Rider_LName.trim(), Rider_PhoneNo.trim(), hashed, id]
      );
    } else {
      await query(
        'UPDATE Rider SET Rider_FName = ?, Rider_LName = ?, Rider_PhoneNo = ? WHERE Rider_ID = ?',
        [Rider_FName.trim(), Rider_LName.trim(), Rider_PhoneNo.trim(), id]
      );
    }

    const updated = await query<any[]>(
      'SELECT Rider_ID, Rider_FName, Rider_LName, Rider_PhoneNo, Rider_Status, Rider_BranchID FROM Rider WHERE Rider_ID = ?',
      [id]
    );

    const rider = updated[0];
    if (!rider) {
      return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
    }

    await updateLegacyLinkedStaffProfile(Number(rider.Rider_ID), {
      firstName: rider.Rider_FName,
      lastName: rider.Rider_LName,
      phoneNo: rider.Rider_PhoneNo,
      branchId: rider.Rider_BranchID,
      position: 'Rider',
      status: rider.Rider_Status,
    }, {
      branchId: rider.Rider_BranchID,
      role: 'rider',
    });

    return NextResponse.json(rider);
  } catch (error) {
    console.error('Error updating rider profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
