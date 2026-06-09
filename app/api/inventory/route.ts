import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Inventory } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const lowStock = searchParams.get('lowStock');

    let sql = `
      SELECT i.*, b.Brnch_Name 
      FROM Inventory i
      JOIN Branch b ON i.Inv_BranchID = b.Brnch_ID
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (branchId) {
      sql += ' AND i.Inv_BranchID = ?';
      params.push(parseInt(branchId));
    }

    if (lowStock === 'true') {
      sql += ' AND i.Inv_Quantity <= i.Inv_MinLevel';
    }

    sql += ' ORDER BY b.Brnch_Name, i.Inv_ItemName';

    const inventory = await query<Inventory[]>(sql, params);
    return NextResponse.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { inventoryId, quantity } = body;

    await query(
      'UPDATE Inventory SET Inv_Quantity = ?, Inv_LastUpdated = CURDATE() WHERE Inv_ID = ?',
      [quantity, inventoryId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating inventory:', error);
    return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 });
  }
}
