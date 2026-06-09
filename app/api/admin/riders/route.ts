import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { requireBranchAdmin } from '@/lib/adminAuth';
import bcrypt from 'bcrypt';
import type mysql from 'mysql2/promise';
import { getOrSetCache, invalidateCacheByPrefix } from '@/lib/serverCache';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const requestedBranchId = searchParams.get('branchId');
    const { admin, response } = await requireBranchAdmin(request);
    if (response && !requestedBranchId) return response;
    const branchId = admin?.Emp_BranchID ?? Number(requestedBranchId);
    const cacheKey = `admin:riders:${branchId}:${status ?? 'all'}`;

    const riders = await getOrSetCache(cacheKey, 15_000, async () => {
      const connection = await getConnection();
      try {
        let sql = `
          SELECT r.Rider_ID, r.Rider_FName, r.Rider_LName, r.Rider_PhoneNo,
                 r.Rider_Status, r.Rider_BranchID,
                 b.Brnch_Name, b.Brnch_Address
          FROM Rider r
          JOIN Branch b ON r.Rider_BranchID = b.Brnch_ID
          WHERE r.Rider_BranchID = ?
        `;
        const params: (string | number)[] = [branchId];

        if (status) {
          sql += ' AND r.Rider_Status = ?';
          params.push(status);
        }

        sql += ' ORDER BY r.Rider_LName';

        const [rows] = await connection.execute<mysql.RowDataPacket[]>(sql, params);
        return rows;
      } finally {
        connection.release();
      }
    });

    return NextResponse.json(riders, {
      headers: {
        'Cache-Control': 'private, max-age=10',
      },
    });
  } catch (error) {
    console.error('Error fetching riders:', error);
    return NextResponse.json({ error: 'Failed to fetch riders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { admin, response } = await requireBranchAdmin(request);
  if (response) return response;

  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const body = await request.json();
    const { Rider_FName, Rider_LName, Rider_PhoneNo, Rider_Password } = body;

    if (!Rider_Password) return NextResponse.json({ error: 'Password is required' }, { status: 400 });

    const hashedPassword = await bcrypt.hash(Rider_Password, 10);

    const [maxResult] = await connection.execute<mysql.RowDataPacket[]>(
      'SELECT MAX(Rider_ID) as maxId FROM Rider'
    );
    const newId = ((maxResult as { maxId: number }[])[0]?.maxId || 10000) + 1;

    await connection.execute(
      `INSERT INTO Rider (Rider_ID, Rider_FName, Rider_LName, Rider_PhoneNo, Rider_Password, Rider_Status, Rider_BranchID)
       VALUES (?, ?, ?, ?, ?, 'Active', ?)`,
      [newId, Rider_FName, Rider_LName, Rider_PhoneNo, hashedPassword, admin!.Emp_BranchID]
    );

    await connection.commit();
    invalidateCacheByPrefix(`admin:riders:${admin!.Emp_BranchID}:`);
    return NextResponse.json({ success: true, Rider_ID: newId });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating rider:', error);
    return NextResponse.json({ error: 'Failed to create rider' }, { status: 500 });
  } finally {
    connection.release();
  }
}
