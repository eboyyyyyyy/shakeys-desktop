import { NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';
import { requireGeneralAdmin } from '@/lib/adminAuth';
import bcrypt from 'bcrypt';
import type mysql from 'mysql2/promise';

export async function GET(request: Request) {
  try {
    const { response } = await requireGeneralAdmin(request);
    if (response) return response;
    const admins = await query<Record<string, any>[]>(
      `SELECT e.Emp_ID, e.Emp_BranchID, e.Emp_FName, e.Emp_LName,
              e.Emp_Position, e.Emp_PhoneNo, e.Emp_Email,
              e.Emp_HireDate, e.Emp_Status,
              b.Brnch_Name, b.Brnch_Address
       FROM Employee e
       JOIN Branch b ON e.Emp_BranchID = b.Brnch_ID
       WHERE e.Emp_Position = 'Admin'
       ORDER BY e.Emp_ID`
    );

    const normalized = admins.map(e => ({
      ...e,
      Emp_HireDate: e.Emp_HireDate instanceof Date
        ? e.Emp_HireDate.toISOString().split('T')[0]
        : e.Emp_HireDate,
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error('Error fetching admins:', error);
    return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { response } = await requireGeneralAdmin(request);
  if (response) return response;

  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const body = await request.json();
    const {
      Emp_BranchID,
      Emp_FName,
      Emp_LName,
      Emp_PhoneNo,
      Emp_Email,
      Emp_Password,
      Emp_HireDate,
    } = body;

    // --- Validation ---
    if (!Emp_FName?.trim()) return NextResponse.json({ error: 'First name is required' }, { status: 400 });
    if (!Emp_LName?.trim()) return NextResponse.json({ error: 'Last name is required' }, { status: 400 });
    if (!Emp_PhoneNo?.trim()) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    if (!/^\d+$/.test(Emp_PhoneNo.trim())) return NextResponse.json({ error: 'Phone number must contain numbers only' }, { status: 400 });
    if (Emp_PhoneNo.trim().length !== 11) return NextResponse.json({ error: 'Phone number must be 11 digits' }, { status: 400 });
    if (!Emp_Email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(Emp_Email.trim())) return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    if (!Emp_Password) return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    if (Emp_Password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    if (!Emp_BranchID) return NextResponse.json({ error: 'Branch is required' }, { status: 400 });
    if (!Emp_HireDate) return NextResponse.json({ error: 'Hire date is required' }, { status: 400 });

    // Check duplicate email
    const [existing] = await connection.execute<mysql.RowDataPacket[]>(
      'SELECT Emp_ID FROM Employee WHERE Emp_Email = ?',
      [Emp_Email.trim()]
    );
    if ((existing as any[]).length > 0) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(Emp_Password, 10);

    const [maxResult] = await connection.execute<mysql.RowDataPacket[]>(
      'SELECT MAX(Emp_ID) as maxId FROM Employee'
    );
    const newId = ((maxResult as { maxId: number }[])[0]?.maxId || 10000) + 1;

    await connection.execute(
      `INSERT INTO Employee (Emp_ID, Emp_BranchID, Emp_FName, Emp_LName, Emp_Position,
        Emp_PhoneNo, Emp_Email, Emp_Password, Emp_HireDate, Emp_Status)
       VALUES (?, ?, ?, ?, 'Admin', ?, ?, ?, ?, 'Active')`,
      [newId, Emp_BranchID, Emp_FName.trim(), Emp_LName.trim(),
       Emp_PhoneNo.trim(), Emp_Email.trim(), hashedPassword, Emp_HireDate]
    );

    await connection.commit();
    return NextResponse.json({ success: true, Emp_ID: newId });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating admin:', error);
    return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 });
  } finally {
    connection.release();
  }
}