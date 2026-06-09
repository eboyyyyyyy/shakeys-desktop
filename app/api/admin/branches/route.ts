import { NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';
import { requireGeneralAdmin } from '@/lib/adminAuth';
import type mysql from 'mysql2/promise';
import { syncBranchToFirestore } from '@/lib/referenceSync';
import { getOrSetCache, invalidateCacheByPrefix } from '@/lib/serverCache';

export async function GET(request: Request) {
  try {
    const { response } = await requireGeneralAdmin(request);
    if (response) return response;

    const branches = await getOrSetCache('admin:branches:list', 20_000, async () => query<Record<string, any>[]>(
      `SELECT b.Brnch_ID, b.Brnch_Name, b.Brnch_Address, b.Brnch_City,
              b.Brnch_PhoneNo, b.Brnch_Status,
              CONCAT(e.Emp_FName, ' ', e.Emp_LName) AS Manager_Name
       FROM Branch b
       LEFT JOIN Employee e ON e.Emp_BranchID = b.Brnch_ID
         AND e.Emp_Position = 'Branch Manager'
         AND e.Emp_Status = 'Active'
       WHERE b.Brnch_Status != 'Deleted'
       ORDER BY b.Brnch_ID`
    ));

    return NextResponse.json(branches, {
      headers: {
        'Cache-Control': 'private, max-age=15',
      },
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    return NextResponse.json({ error: 'Failed to fetch branches' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { response } = await requireGeneralAdmin(request);
  if (response) return response;

  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const body = await request.json();
    const { Brnch_Name, Brnch_Address, Brnch_City, Brnch_PhoneNo } = body;

    if (!Brnch_Name?.trim()) return NextResponse.json({ error: 'Branch name is required' }, { status: 400 });
    if (!Brnch_Address?.trim()) return NextResponse.json({ error: 'Branch address is required' }, { status: 400 });
    if (!Brnch_City?.trim()) return NextResponse.json({ error: 'Branch city is required' }, { status: 400 });
    if (!Brnch_PhoneNo?.trim()) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    if (!/^\d+$/.test(Brnch_PhoneNo.trim())) return NextResponse.json({ error: 'Phone number must contain numbers only' }, { status: 400 });
    if (Brnch_PhoneNo.trim().length < 7 || Brnch_PhoneNo.trim().length > 12) {
      return NextResponse.json({ error: 'Phone number must be between 7 and 12 digits' }, { status: 400 });
    }

    const [existing] = await connection.execute<mysql.RowDataPacket[]>(
      "SELECT Brnch_ID FROM Branch WHERE LOWER(Brnch_Name) = LOWER(?) AND Brnch_Status != 'Deleted'",
      [Brnch_Name.trim()]
    );
    if ((existing as any[]).length > 0) {
      return NextResponse.json({ error: 'A branch with this name already exists' }, { status: 400 });
    }

    const [maxResult] = await connection.execute<mysql.RowDataPacket[]>(
      'SELECT MAX(Brnch_ID) as maxId FROM Branch'
    );
    const newId = ((maxResult as { maxId: number }[])[0]?.maxId || 200) + 1;

    if (newId > 999) {
      return NextResponse.json({ error: 'Maximum branch limit reached' }, { status: 400 });
    }

    await connection.execute(
      `INSERT INTO Branch (Brnch_ID, Brnch_Name, Brnch_Address, Brnch_City, Brnch_PhoneNo, Brnch_Status)
       VALUES (?, ?, ?, ?, ?, 'Active')`,
      [newId, Brnch_Name.trim(), Brnch_Address.trim(), Brnch_City.trim(), Brnch_PhoneNo.trim()]
    );

    await connection.commit();

    await syncBranchToFirestore({
      Brnch_ID: newId,
      Brnch_Name: Brnch_Name.trim(),
      Brnch_Address: Brnch_Address.trim(),
      Brnch_City: Brnch_City.trim(),
      Brnch_PhoneNo: Brnch_PhoneNo.trim(),
      Brnch_Status: 'Active',
    });

    invalidateCacheByPrefix('branch:list:');
    invalidateCacheByPrefix('admin:branches:');

    return NextResponse.json({ success: true, Brnch_ID: newId });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating branch:', error);
    return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 });
  } finally {
    connection.release();
  }
}
