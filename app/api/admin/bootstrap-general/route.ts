import { NextResponse } from 'next/server';
import { getConnection, query } from '@/lib/db';
import bcrypt from 'bcrypt';
import type mysql from 'mysql2/promise';

interface SetupBranch {
  Brnch_ID: number;
  Brnch_Name: string;
  Brnch_City: string;
  Brnch_Status: string;
}

async function getGeneralAdminCount() {
  const rows = await query<{ total: number }[]>(
    "SELECT COUNT(*) AS total FROM Employee WHERE Emp_Position = 'General Admin'"
  );
  return Number(rows[0]?.total || 0);
}

export async function GET() {
  try {
    const [generalAdminCount, branches] = await Promise.all([
      getGeneralAdminCount(),
      query<SetupBranch[]>(
        "SELECT Brnch_ID, Brnch_Name, Brnch_City, Brnch_Status FROM Branch WHERE Brnch_Status = 'Active' ORDER BY Brnch_City, Brnch_Name"
      ),
    ]);

    return NextResponse.json({
      canSetup: generalAdminCount === 0,
      generalAdminExists: generalAdminCount > 0,
      branches,
    });
  } catch (error) {
    console.error('Error checking general admin setup:', error);
    return NextResponse.json({ error: 'Failed to load setup information' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    const [existingGeneralAdmin] = await connection.execute<mysql.RowDataPacket[]>(
      "SELECT Emp_ID FROM Employee WHERE Emp_Position = 'General Admin' LIMIT 1"
    );

    if ((existingGeneralAdmin as any[]).length > 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'A General Admin account already exists.' },
        { status: 409 }
      );
    }

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

    if (!Emp_FName?.trim()) {
      return NextResponse.json({ error: 'First name is required.' }, { status: 400 });
    }
    if (!Emp_LName?.trim()) {
      return NextResponse.json({ error: 'Last name is required.' }, { status: 400 });
    }
    if (!Emp_PhoneNo?.trim()) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }
    if (!/^\d+$/.test(Emp_PhoneNo.trim())) {
      return NextResponse.json({ error: 'Phone number must contain numbers only.' }, { status: 400 });
    }
    if (Emp_PhoneNo.trim().length !== 11) {
      return NextResponse.json({ error: 'Phone number must be 11 digits.' }, { status: 400 });
    }
    if (!Emp_Email?.trim()) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(Emp_Email.trim())) {
      return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
    }
    if (!Emp_Password) {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
    }
    if (Emp_Password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }
    if (!Emp_BranchID) {
      return NextResponse.json({ error: 'Please choose a home branch.' }, { status: 400 });
    }
    if (!Emp_HireDate) {
      return NextResponse.json({ error: 'Hire date is required.' }, { status: 400 });
    }

    const [branchRows] = await connection.execute<mysql.RowDataPacket[]>(
      'SELECT Brnch_ID FROM Branch WHERE Brnch_ID = ? AND Brnch_Status = ? LIMIT 1',
      [Emp_BranchID, 'Active']
    );
    if ((branchRows as any[]).length === 0) {
      return NextResponse.json({ error: 'Selected branch was not found.' }, { status: 400 });
    }

    const [duplicateEmail] = await connection.execute<mysql.RowDataPacket[]>(
      'SELECT Emp_ID FROM Employee WHERE Emp_Email = ? LIMIT 1',
      [Emp_Email.trim()]
    );
    if ((duplicateEmail as any[]).length > 0) {
      return NextResponse.json({ error: 'Email already in use.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(Emp_Password, 10);

    const [maxResult] = await connection.execute<mysql.RowDataPacket[]>(
      'SELECT MAX(Emp_ID) as maxId FROM Employee'
    );
    const newId = ((maxResult as { maxId: number }[])[0]?.maxId || 10000) + 1;

    await connection.execute(
      `INSERT INTO Employee (
        Emp_ID,
        Emp_BranchID,
        Emp_FName,
        Emp_LName,
        Emp_Position,
        Emp_PhoneNo,
        Emp_Email,
        Emp_Password,
        Emp_HireDate,
        Emp_Status
      ) VALUES (?, ?, ?, ?, 'General Admin', ?, ?, ?, ?, 'Active')`,
      [
        newId,
        Emp_BranchID,
        Emp_FName.trim(),
        Emp_LName.trim(),
        Emp_PhoneNo.trim(),
        Emp_Email.trim(),
        hashedPassword,
        Emp_HireDate,
      ]
    );

    await connection.commit();
    return NextResponse.json({ success: true, Emp_ID: newId });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating General Admin:', error);
    return NextResponse.json({ error: 'Failed to create General Admin account.' }, { status: 500 });
  } finally {
    connection.release();
  }
}


