import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { requireBranchAdmin } from '@/lib/adminAuth';
import bcrypt from 'bcrypt';
import type mysql from 'mysql2/promise';
import { getOrSetCache, invalidateCacheByPrefix } from '@/lib/serverCache';

const BLOCKED_POSITIONS = ['Admin', 'General Admin'];

export async function GET(request: Request) {
  try {
    const { admin, response } = await requireBranchAdmin(request);
    if (response) return response;

    const cacheKey = `admin:employees:${admin!.Emp_BranchID}`;
    const normalized = await getOrSetCache(cacheKey, 15_000, async () => {
      const connection = await getConnection();
      try {
        const [employees] = await connection.execute<mysql.RowDataPacket[]>(
          `SELECT e.Emp_ID, e.Emp_BranchID, e.Emp_FName, e.Emp_LName,
                  e.Emp_Position, e.Emp_PhoneNo, e.Emp_Email,
                  e.Emp_HireDate, e.Emp_Status,
                  b.Brnch_Name, b.Brnch_Address
           FROM Employee e
           JOIN Branch b ON e.Emp_BranchID = b.Brnch_ID
           WHERE e.Emp_BranchID = ?
             AND e.Emp_Position NOT IN ('Admin', 'General Admin')
           ORDER BY e.Emp_LName`,
          [admin!.Emp_BranchID]
        );

        return (employees as Record<string, any>[]).map(e => ({
          ...e,
          Emp_HireDate: e.Emp_HireDate instanceof Date
            ? e.Emp_HireDate.toISOString().split('T')[0]
            : e.Emp_HireDate,
        }));
      } finally {
        connection.release();
      }
    });

    return NextResponse.json(normalized, {
      headers: {
        'Cache-Control': 'private, max-age=10',
      },
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { admin, response } = await requireBranchAdmin(request);
  if (response) return response;

  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const body = await request.json();
    const { Emp_FName, Emp_LName, Emp_Position, Emp_PhoneNo, Emp_Email, Emp_HireDate, Emp_Password } = body;

    if (!Emp_Password) return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    if (BLOCKED_POSITIONS.includes(Emp_Position)) {
      return NextResponse.json({ error: 'Branch admins cannot create admin accounts.' }, { status: 403 });
    }

    const hashedPassword = await bcrypt.hash(Emp_Password, 10);

    const [maxResult] = await connection.execute<mysql.RowDataPacket[]>(
      'SELECT MAX(Emp_ID) as maxId FROM Employee'
    );
    const newId = ((maxResult as { maxId: number }[])[0]?.maxId || 10000) + 1;

    await connection.execute(
      `INSERT INTO Employee (Emp_ID, Emp_BranchID, Emp_FName, Emp_LName, Emp_Position, Emp_PhoneNo, Emp_Email, Emp_Password, Emp_HireDate, Emp_Status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [newId, admin!.Emp_BranchID, Emp_FName, Emp_LName, Emp_Position, Emp_PhoneNo, Emp_Email, hashedPassword, Emp_HireDate]
    );

    await connection.commit();
    invalidateCacheByPrefix(`admin:employees:${admin!.Emp_BranchID}`);
    return NextResponse.json({ success: true, Emp_ID: newId });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  } finally {
    connection.release();
  }
}
