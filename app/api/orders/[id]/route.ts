import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { VALID_TRANSITIONS } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);

    const orders = await query<Record<string, any>[]>(
      `SELECT o.*, 
              c.Cust_FirstName, c.Cust_LastName, c.Cust_Email, c.Cust_PhoneNo, c.Cust_Address,
              b.Brnch_Name, b.Brnch_Address, b.Brnch_City
       FROM \`Order\` o
       JOIN Customer c ON o.Order_CustomerID = c.Cust_ID
       JOIN Branch b ON o.Order_BranchID = b.Brnch_ID
       WHERE o.Order_ID = ?`,
      [orderId]
    );

    if (orders.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orders[0];

    const items = await query<Record<string, any>[]>(
      `SELECT oi.*, m.Menu_Name, m.Menu_Description, m.Menu_Category
       FROM Order_Item oi
       JOIN Menu_Item m ON oi.OItem_MenuID = m.Menu_ID
       WHERE oi.OItem_OrderID = ?`,
      [orderId]
    );

    const payments = await query<Record<string, any>[]>(
      `SELECT * FROM Payment WHERE Pay_OrderID = ?`,
      [orderId]
    );

    const deliveries = await query<Record<string, any>[]>(
      `SELECT d.*, r.Rider_FName, r.Rider_LName, r.Rider_PhoneNo
       FROM Delivery d
       LEFT JOIN Rider r ON d.Dlvry_RiderID = r.Rider_ID
       WHERE d.Dlvry_OrderID = ?`,
      [orderId]
    );

    const payment = payments[0] || null;
    const rawDelivery = deliveries[0] || null;

    // Only expose rider info once the order is In_Transit or Completed
    const riderVisible = ['In_Transit', 'Completed'].includes(order.Order_Status);

    const delivery = rawDelivery ? {
      Del_ID: rawDelivery.Dlvry_ID,
      Del_OrderID: rawDelivery.Dlvry_OrderID,
      Del_RiderID: rawDelivery.Dlvry_RiderID,
      Del_Address: rawDelivery.Dlvry_Address,
      Del_Status: rawDelivery.Dlvry_Status,
      Del_Date: rawDelivery.Dlvry_Date instanceof Date
        ? rawDelivery.Dlvry_Date.toISOString().split('T')[0]
        : rawDelivery.Dlvry_Date,
      Del_Time: rawDelivery.Dlvry_Time,
      Del_Fee: parseFloat(rawDelivery.Dlvry_Fee),
      Rider_FName: riderVisible ? rawDelivery.Rider_FName : null,
      Rider_LName: riderVisible ? rawDelivery.Rider_LName : null,
      Rider_PhoneNo: riderVisible ? rawDelivery.Rider_PhoneNo : null,
    } : null;

    const orderDate = order.Order_Date instanceof Date
      ? order.Order_Date.toISOString().split('T')[0]
      : order.Order_Date;

    return NextResponse.json({
      ...order,
      Order_Date: orderDate,
      Order_Total: parseFloat(order.Order_Total),
      items: items.map((item) => ({
        ...item,
        OItem_UnitPrice: parseFloat(item.OItem_UnitPrice),
        OItem_Subtotal: parseFloat(item.OItem_Subtotal),
      })),
      payment: payment ? {
        ...payment,
        Pay_Amount: parseFloat(payment.Pay_Amount),
      } : null,
      delivery,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
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

    // Fetch current order status
    const rows = await query<Record<string, any>[]>(
      'SELECT Order_Status, Order_BranchID, Order_Type FROM `Order` WHERE Order_ID = ?',
      [orderId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const currentStatus = rows[0].Order_Status;
    const branchId = rows[0].Order_BranchID;
    const orderType = rows[0].Order_Type;

    // Validate status transition
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${currentStatus} to ${status}` },
        { status: 400 }
      );
    }

    // When moving to Ready_For_Delivery, a rider must already be assigned for Delivery orders
    if (status === 'Ready_For_Delivery' && orderType === 'Delivery') {
      const deliveries = await query<Record<string, any>[]>(
        'SELECT Dlvry_RiderID FROM Delivery WHERE Dlvry_OrderID = ?',
        [orderId]
      );
      const hasRider = deliveries[0]?.Dlvry_RiderID != null;
      if (!hasRider) {
        return NextResponse.json(
          { error: 'A rider must be assigned before marking the order as ready for delivery.' },
          { status: 400 }
        );
      }
    }

    // Handle rider assignment (during Preparing → assign rider)
    if (riderId) {
      // Validate rider belongs to same branch
      const riderRows = await query<Record<string, any>[]>(
        'SELECT Rider_BranchID, Rider_Status FROM Rider WHERE Rider_ID = ?',
        [riderId]
      );

      if (riderRows.length === 0) {
        return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
      }

      if (riderRows[0].Rider_BranchID !== branchId) {
        return NextResponse.json(
          { error: 'Rider does not belong to the same branch.' },
          { status: 400 }
        );
      }

      if (riderRows[0].Rider_Status !== 'Active') {
        return NextResponse.json(
          { error: 'Rider is not active.' },
          { status: 400 }
        );
      }

      // Check rider's current active delivery count (max 2)
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

      // Assign rider to delivery record
      await query(
        'UPDATE Delivery SET Dlvry_RiderID = ? WHERE Dlvry_OrderID = ?',
        [riderId, orderId]
      );
    }

    // Update order status
    await query(
      'UPDATE `Order` SET Order_Status = ? WHERE Order_ID = ?',
      [status, orderId]
    );

    // Sync delivery status
    if (status === 'In_Transit') {
      await query(
        'UPDATE Delivery SET Dlvry_Status = ? WHERE Dlvry_OrderID = ?',
        ['In_Transit', orderId]
      );
    } else if (status === 'Completed') {
      await query(
        'UPDATE Delivery SET Dlvry_Status = ?, Dlvry_Time = CURTIME() WHERE Dlvry_OrderID = ?',
        ['Completed', orderId]
      );
    } else if (status === 'Cancelled') {
      await query(
        'UPDATE Delivery SET Dlvry_Status = ? WHERE Dlvry_OrderID = ?',
        ['Failed', orderId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}