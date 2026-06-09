import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcrypt';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const phone = searchParams.get('phone');
  const password = searchParams.get('password');

  if (!email && !phone) {
    return NextResponse.json({ error: 'Email or phone is required' }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }

  try {
    let sql = `SELECT e.Emp_ID, e.Emp_BranchID, e.Emp_FName, e.Emp_LName, e.Emp_Position,
                      e.Emp_PhoneNo, e.Emp_Email, e.Emp_Password, e.Emp_Status, b.Brnch_Name
               FROM Employee e
               LEFT JOIN Branch b ON e.Emp_BranchID = b.Brnch_ID
               WHERE e.Emp_Status = 'Active' AND `;
    const param = email ? email : phone;
    sql += email ? 'e.Emp_Email = ?' : 'e.Emp_PhoneNo = ?';

    const employees = await query<Record<string, any>[]>(sql, [param]);

    if (employees.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const emp = employees[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, emp.Emp_Password);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Return employee without password
    return NextResponse.json({
      Emp_ID: emp.Emp_ID,
      Emp_BranchID: emp.Emp_BranchID,
      Emp_FName: emp.Emp_FName,
      Emp_LName: emp.Emp_LName,
      Emp_Position: emp.Emp_Position,
      Emp_Email: emp.Emp_Email,
      Emp_Status: emp.Emp_Status,
      Brnch_Name: emp.Brnch_Name,
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 });
  }
}