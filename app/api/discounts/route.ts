import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Discount } from '@/lib/types';

export async function GET() {
  try {
    const discounts = await query<Discount[]>(
      'SELECT * FROM Discount ORDER BY Disc_Name'
    );
    return NextResponse.json(discounts);
  } catch (error) {
    console.error('Error fetching discounts:', error);
    return NextResponse.json({ error: 'Failed to fetch discounts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, rate } = body;

    // Generate new ID
    const maxIdResult = await query<{ maxId: number }[]>('SELECT MAX(Disc_ID) as maxId FROM Discount');
    const newId = (maxIdResult[0]?.maxId || 10000) + 1;

    await query(
      'INSERT INTO Discount (Disc_ID, Disc_Name, Disc_Type, Disc_Rate) VALUES (?, ?, ?, ?)',
      [newId, name, type, rate]
    );

    return NextResponse.json({ success: true, discountId: newId });
  } catch (error) {
    console.error('Error creating discount:', error);
    return NextResponse.json({ error: 'Failed to create discount' }, { status: 500 });
  }
}
