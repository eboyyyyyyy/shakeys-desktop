import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcrypt';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');
  const password = searchParams.get('password');

  if (!phone) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }

  try {
    const riders = await query<Record<string, any>[]>(
      `SELECT Rider_ID, Rider_FName, Rider_LName, Rider_PhoneNo,
              Rider_Password, Rider_Status, Rider_BranchID
       FROM Rider
       WHERE Rider_PhoneNo = ? AND Rider_Status = 'Active'`,
      [phone]
    );

    if (riders.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const rider = riders[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, rider.Rider_Password);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Return rider without password
    return NextResponse.json({
      Rider_ID: rider.Rider_ID,
      Rider_FName: rider.Rider_FName,
      Rider_LName: rider.Rider_LName,
      Rider_PhoneNo: rider.Rider_PhoneNo,
      Rider_Status: rider.Rider_Status,
      Rider_BranchID: rider.Rider_BranchID,
    });
  } catch (error) {
    console.error('Error fetching rider:', error);
    return NextResponse.json({ error: 'Failed to fetch rider' }, { status: 500 });
  }
}