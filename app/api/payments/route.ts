import { NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';
import type { Payment } from '@/lib/types';
import type mysql from 'mysql2/promise';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    let sql = 'SELECT * FROM Payment WHERE 1=1';
    const params: number[] = [];

    if (orderId) {
      sql += ' AND Pay_OrderID = ?';
      params.push(parseInt(orderId));
    }

    sql += ' ORDER BY Pay_Date DESC';

    const payments = await query<Payment[]>(sql, params);
    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    const body = await request.json();
    const { orderId, method, amount, cardId, pointsRedeemed } = body;

    // Generate payment ID
    const [maxResult] = await connection.execute<mysql.RowDataPacket[]>(
      'SELECT MAX(Pay_ID) as maxId FROM Payment'
    );
    const newPayId = ((maxResult as { maxId: number }[])[0]?.maxId || 10000000) + 1;

    // Insert payment
    await connection.execute(
      `INSERT INTO Payment (Pay_ID, Pay_OrderID, Pay_Method, Pay_Amount, Pay_Date, Pay_Status, Pay_CardID) 
       VALUES (?, ?, ?, ?, CURDATE(), 'Completed', ?)`,
      [newPayId, orderId, method, amount, cardId || null]
    );

    // Order remains Pending after payment — employee will accept and move it forward
    // No status change needed here

    // Get membership info for this order's customer
    const [orderResult] = await connection.execute<mysql.RowDataPacket[]>(
      `SELECT m.Mem_ID, m.Mem_Type
       FROM \`Order\` o
       JOIN Customer c ON o.Order_CustomerID = c.Cust_ID
       LEFT JOIN Membership m ON c.Cust_MembershipID = m.Mem_ID
       WHERE o.Order_ID = ?`,
      [orderId]
    );

    const membership = (orderResult as { Mem_ID: number | null; Mem_Type: string | null }[])[0];

    if (membership?.Mem_ID) {
      const membershipId = membership.Mem_ID;
      const tier = membership.Mem_Type; // 'Silver' or 'Gold'

      // Earn 1 point per ₱10 spent (both tiers)
      const pointsEarned = Math.floor(amount / 10);

      // Deduct redeemed points
      const redeemedPoints = Math.floor(Number(pointsRedeemed) || 0);

      // Discount value depends on tier:
      // Silver: 1 pt = ₱1
      // Gold:   1 pt = ₱2
      const pointValue = tier === 'Gold' ? 2 : 1;
      const discountAmount = redeemedPoints * pointValue;

      // Update points: deduct redeemed, add earned
      await connection.execute(
        'UPDATE Membership SET Mem_Points = GREATEST(0, Mem_Points - ? + ?) WHERE Mem_ID = ?',
        [redeemedPoints, pointsEarned, membershipId]
      );

      // Update order total to reflect the actual discount applied
      if (discountAmount > 0) {
        await connection.execute(
          'UPDATE `Order` SET Order_Total = GREATEST(0, Order_Total - ?) WHERE Order_ID = ?',
          [discountAmount, orderId]
        );
      }
    }

    await connection.commit();
    return NextResponse.json({ success: true, paymentId: newPayId });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  } finally {
    connection.release();
  }
}