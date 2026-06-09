import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Branch } from '@/lib/types';
import { getOrSetCache } from '@/lib/serverCache';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active');
    const cacheKey = `branch:list:${activeOnly === 'true' ? 'active' : 'all'}`;

    const branches = await getOrSetCache(cacheKey, 60_000, async () => {
      let sql = "SELECT * FROM Branch WHERE Brnch_Status != 'Deleted'";
      const params: string[] = [];

      if (activeOnly === 'true') {
        sql += ' AND Brnch_Status = ?';
        params.push('Active');
      }

      sql += ' ORDER BY Brnch_City, Brnch_Name';

      return query<Branch[]>(sql, params);
    });

    return NextResponse.json(branches, {
      headers: {
        'Cache-Control': 'private, max-age=30',
      },
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    return NextResponse.json({ error: 'Failed to fetch branches' }, { status: 500 });
  }
}
