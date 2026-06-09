import { NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';
import type mysql from 'mysql2/promise';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const branchId = searchParams.get('branchId');
    const riderId = searchParams.get('riderId');

    let sql = `
      SELECT o.*,
             c.Cust_FirstName, c.Cust_LastName, c.Cust_PhoneNo,
             b.Brnch_Name, b.Brnch_Address
      FROM \`Order\` o
      JOIN Customer c ON o.Order_CustomerID = c.Cust_ID
      JOIN Branch b ON o.Order_BranchID = b.Brnch_ID
      LEFT JOIN Delivery d ON d.Dlvry_OrderID = o.Order_ID
      WHERE 1=1
    `;

    const params: (string | number)[] = [];

    if (customerId) {
      sql += ' AND o.Order_CustomerID = ?';
      params.push(parseInt(customerId));
    }

    if (status) {
      sql += ' AND o.Order_Status = ?';
      params.push(status);
    }

    if (branchId) {
      sql += ' AND o.Order_BranchID = ?';
      params.push(Number(branchId));
    }

    if (riderId) {
      sql += ' AND d.Dlvry_RiderID = ?';
      params.push(parseInt(riderId));
    }

    sql += ' ORDER BY o.Order_Date DESC, o.Order_Time DESC';

    const orders = await query<Record<string, any>[]>(sql, params);

    if (orders.length === 0) return NextResponse.json([]);

    const orderIds = orders.map(o => o.Order_ID);
    const placeholders = orderIds.map(() => '?').join(',');

    const [allItems, allPayments, allDeliveries] = await Promise.all([
      query<Record<string, any>[]>(
        `SELECT oi.*, m.Menu_Name, m.Menu_Category
         FROM Order_Item oi
         JOIN Menu_Item m ON oi.OItem_MenuID = m.Menu_ID
         WHERE oi.OItem_OrderID IN (${placeholders})`,
        orderIds
      ),
      query<Record<string, any>[]>(
        `SELECT * FROM Payment WHERE Pay_OrderID IN (${placeholders})`,
        orderIds
      ),
      query<Record<string, any>[]>(
        `SELECT d.*, r.Rider_FName, r.Rider_LName, r.Rider_PhoneNo
         FROM Delivery d
         LEFT JOIN Rider r ON d.Dlvry_RiderID = r.Rider_ID
         WHERE d.Dlvry_OrderID IN (${placeholders})`,
        orderIds
      ),
    ]);

    const itemsByOrder = allItems.reduce((acc, item) => {
      const id = item.OItem_OrderID;
      if (!acc[id]) acc[id] = [];
      acc[id].push({
        ...item,
        OItem_UnitPrice: parseFloat(item.OItem_UnitPrice),
        OItem_Subtotal: parseFloat(item.OItem_Subtotal),
      });
      return acc;
    }, {} as Record<number, any[]>);

    const paymentByOrder = allPayments.reduce((acc, p) => {
      acc[p.Pay_OrderID] = { ...p, Pay_Amount: parseFloat(p.Pay_Amount) };
      return acc;
    }, {} as Record<number, any>);

    const deliveryByOrder = allDeliveries.reduce((acc, d) => {
      acc[d.Dlvry_OrderID] = {
        Del_ID: d.Dlvry_ID,
        Del_OrderID: d.Dlvry_OrderID,
        Del_RiderID: d.Dlvry_RiderID,
        Del_Address: d.Dlvry_Address,
        Del_Status: d.Dlvry_Status,
        Del_Date: d.Dlvry_Date,
        Del_Time: d.Dlvry_Time,
        Del_Fee: parseFloat(d.Dlvry_Fee),
        Rider_FName: d.Rider_FName,
        Rider_LName: d.Rider_LName,
        Rider_PhoneNo: d.Rider_PhoneNo,
      };
      return acc;
    }, {} as Record<number, any>);

    const result = orders.map(order => ({
      ...order,
      Order_Total: parseFloat(order.Order_Total),
      items: itemsByOrder[order.Order_ID] || [],
      payment: paymentByOrder[order.Order_ID] || null,
      delivery: deliveryByOrder[order.Order_ID] || null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    const body = await request.json();
    const { customerId, branchId, orderType, items, deliveryAddress, deliveryFee } = body;

    let total = items.reduce((sum: number, item: { price: number; quantity: number }) =>
      sum + (item.price * item.quantity), 0);

    if (orderType === 'Delivery' && deliveryFee) {
      total += deliveryFee;
    }

    const [maxOrderResult] = await connection.execute<mysql.RowDataPacket[]>(
      'SELECT MAX(Order_ID) as maxId FROM `Order`'
    );
    const newOrderId = ((maxOrderResult as { maxId: number }[])[0]?.maxId || 10000000) + 1;

    // Orders start as Pending — not Preparing
    await connection.execute(
      `INSERT INTO \`Order\` (Order_ID, Order_Date, Order_Time, Order_Type, Order_Status, Order_Total, Order_CustomerID, Order_BranchID)
       VALUES (?, CURDATE(), CURTIME(), ?, 'Pending', ?, ?, ?)`,
      [newOrderId, orderType, total, customerId, branchId]
    );

    const [maxItemResult] = await connection.execute<mysql.RowDataPacket[]>(
      'SELECT MAX(OItem_ID) as maxId FROM Order_Item'
    );
    let itemId = ((maxItemResult as { maxId: number }[])[0]?.maxId || 10000000) + 1;

    for (const item of items) {
      const subtotal = item.price * item.quantity;
      await connection.execute(
        `INSERT INTO Order_Item (OItem_ID, OItem_OrderID, OItem_MenuID, OItem_Quantity, OItem_UnitPrice, OItem_Subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [itemId++, newOrderId, item.menuId, item.quantity, item.price, subtotal]
      );
    }

    // For delivery orders, create a delivery record with no rider yet (rider assigned later by employee)
    if (orderType === 'Delivery' && deliveryAddress) {
      const [maxDelResult] = await connection.execute<mysql.RowDataPacket[]>(
        'SELECT MAX(Dlvry_ID) as maxId FROM Delivery'
      );
      const newDelId = ((maxDelResult as { maxId: number }[])[0]?.maxId || 10000000) + 1;

      await connection.execute(
        `INSERT INTO Delivery (Dlvry_ID, Dlvry_OrderID, Dlvry_RiderID, Dlvry_Address, Dlvry_Status, Dlvry_Date, Dlvry_Fee)
         VALUES (?, ?, NULL, ?, 'Pending', CURDATE(), ?)`,
        [newDelId, newOrderId, deliveryAddress, deliveryFee || 50.00]
      );
    }

    await connection.commit();
    return NextResponse.json({ success: true, orderId: newOrderId, total });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  } finally {
    connection.release();
  }
}