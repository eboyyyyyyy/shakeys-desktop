import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);

    const deliveries = await query<Record<string, unknown>[]>(
      `SELECT d.*, 
              r.Rider_FName, r.Rider_LName, r.Rider_PhoneNo,
              o.Order_Status, o.Order_Total, o.Order_Type,
              c.Cust_FirstName, c.Cust_LastName, c.Cust_PhoneNo
       FROM Delivery d
       LEFT JOIN Rider r ON d.Dlvry_RiderID = r.Rider_ID
       JOIN \`Order\` o ON d.Dlvry_OrderID = o.Order_ID
       JOIN Customer c ON o.Order_CustomerID = c.Cust_ID
       WHERE d.Dlvry_OrderID = ?`,
      [orderId]
    );

    if (deliveries.length === 0) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    return NextResponse.json(deliveries[0]);
  } catch (error) {
    console.error('Error fetching delivery:', error);
    return NextResponse.json({ error: 'Failed to fetch delivery' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);
    const body = await request.json();
    const { status, riderId } = body;

    if (riderId && !status) {
      const orderRows = await query<Record<string, any>[]>(
        `SELECT o.Order_BranchID, o.Order_Status, o.Order_Type, d.Dlvry_ID
         FROM \`Order\` o
         LEFT JOIN Delivery d ON d.Dlvry_OrderID = o.Order_ID
         WHERE o.Order_ID = ?`,
        [orderId]
      );

      if (orderRows.length === 0) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const order = orderRows[0];

      if (order.Order_Type !== 'Delivery' || !order.Dlvry_ID) {
        return NextResponse.json({ error: 'Delivery not found for this order.' }, { status: 404 });
      }

      if (order.Order_Status !== 'Preparing') {
        return NextResponse.json(
          { error: 'Riders can only be assigned while an order is being prepared.' },
          { status: 400 }
        );
      }

      const riderRows = await query<Record<string, any>[]>(
        'SELECT Rider_BranchID, Rider_Status FROM Rider WHERE Rider_ID = ?',
        [riderId]
      );

      if (riderRows.length === 0) {
        return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
      }

      if (riderRows[0].Rider_BranchID !== order.Order_BranchID) {
        return NextResponse.json(
          { error: 'Rider does not belong to the same branch.' },
          { status: 400 }
        );
      }

      if (riderRows[0].Rider_Status !== 'Active') {
        return NextResponse.json({ error: 'Rider is not active.' }, { status: 400 });
      }

      const activeDeliveries = await query<Record<string, any>[]>(
        `SELECT COUNT(*) as cnt FROM \`Order\` o
         JOIN Delivery d ON d.Dlvry_OrderID = o.Order_ID
         WHERE d.Dlvry_RiderID = ? AND o.Order_Status IN ('Ready_For_Delivery', 'In_Transit')`,
        [riderId]
      );

      if ((activeDeliveries[0]?.cnt || 0) >= 2) {
        return NextResponse.json(
          { error: 'Rider already has the maximum number of active deliveries.' },
          { status: 400 }
        );
      }

      await query(
        'UPDATE Delivery SET Dlvry_RiderID = ? WHERE Dlvry_OrderID = ?',
        [riderId, orderId]
      );

      return NextResponse.json({ success: true });
    }

    if (status === 'In_Transit') {
      if (riderId) {
        const deliveries = await query<Record<string, any>[]>(
          'SELECT Dlvry_RiderID FROM Delivery WHERE Dlvry_OrderID = ?',
          [orderId]
        );
        if (deliveries[0]?.Dlvry_RiderID !== riderId) {
          return NextResponse.json({ error: 'You are not assigned to this delivery.' }, { status: 403 });
        }
      }

      await query(
        'UPDATE Delivery SET Dlvry_Status = ? WHERE Dlvry_OrderID = ?',
        ['In_Transit', orderId]
      );
      await query(
        'UPDATE `Order` SET Order_Status = ? WHERE Order_ID = ?',
        ['In_Transit', orderId]
      );
    }

    if (status === 'Completed') {
      await query(
        'UPDATE Delivery SET Dlvry_Status = ?, Dlvry_Time = CURTIME() WHERE Dlvry_OrderID = ?',
        ['Completed', orderId]
      );
      await query(
        'UPDATE `Order` SET Order_Status = ? WHERE Order_ID = ?',
        ['Completed', orderId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating delivery:', error);
    return NextResponse.json({ error: 'Failed to update delivery' }, { status: 500 });
  }
}