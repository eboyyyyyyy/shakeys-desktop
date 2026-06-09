import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const categories = await query<{ Menu_Category: string }[]>(
      'SELECT DISTINCT Menu_Category FROM Menu_Item ORDER BY Menu_Category'
    );
    return NextResponse.json(categories.map(c => c.Menu_Category));
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
