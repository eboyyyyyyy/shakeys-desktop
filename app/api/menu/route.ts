import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { MenuItemWithDiscount } from '@/lib/types';
import { syncMenuItemToFirestore } from '@/lib/referenceSync';
import { getOrSetCache, invalidateCacheByPrefix } from '@/lib/serverCache';

type LegacyMenuRow = {
  Menu_ID: number;
  Menu_Name: string;
  Menu_Description: string | null;
  Menu_Category: string;
  Menu_Price: number | string;
  Menu_Availability: string;
  Menu_Image?: string | null;
};

let hasMenuImageColumnCache: boolean | null = null;

async function hasMenuImageColumn() {
  if (hasMenuImageColumnCache !== null) {
    return hasMenuImageColumnCache;
  }

  const rows = await query<{ Field: string }[]>("SHOW COLUMNS FROM Menu_Item LIKE 'Menu_Image'");
  hasMenuImageColumnCache = rows.length > 0;
  return hasMenuImageColumnCache;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const available = searchParams.get('available');
  const cacheKey = `menu:list:${category ?? 'all'}:${available ?? 'any'}`;

  try {
    const normalized = await getOrSetCache(cacheKey, 30_000, async () => {
      let sql = `
        SELECT m.*, 
               d.Disc_Rate as discountRate,
               CASE 
                 WHEN d.Disc_Rate IS NOT NULL 
                 THEN m.Menu_Price * (1 - d.Disc_Rate)
                 ELSE m.Menu_Price 
               END as discountedPrice
        FROM Menu_Item m
        LEFT JOIN Menu_Item_Discount md ON m.Menu_ID = md.MDisc_MenuID 
          AND CURDATE() BETWEEN md.MDisc_StartDate AND COALESCE(md.MDisc_EndDate, CURDATE())
        LEFT JOIN Discount d ON md.MDisc_DiscountID = d.Disc_ID
        WHERE 1=1
      `;

      const params: string[] = [];

      if (category) {
        sql += ' AND m.Menu_Category = ?';
        params.push(category);
      }

      if (available !== null) {
        sql += ' AND m.Menu_Availability = ?';
        params.push(available === 'true' ? 'Y' : 'N');
      }

      sql += ' ORDER BY m.Menu_Category, m.Menu_Name';

      const menuItems = await query<MenuItemWithDiscount[]>(sql, params);

      return menuItems.map((item) => ({
        ...item,
        Menu_Price: parseFloat(item.Menu_Price as any),
        discountedPrice: item.discountedPrice ? parseFloat(item.discountedPrice as any) : null,
        discountRate: item.discountRate ? parseFloat(item.discountRate as any) : null,
      }));
    });

    return NextResponse.json(normalized, {
      headers: {
        'Cache-Control': 'private, max-age=15',
      },
    });
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { Menu_Name, Menu_Description, Menu_Category, Menu_Price, Menu_Availability, Menu_Image } = body;

    const maxIdResult = await query<{ maxId: number }[]>('SELECT MAX(Menu_ID) as maxId FROM Menu_Item');
    const newId = (maxIdResult[0]?.maxId || 10000) + 1;

    const imagePath = typeof Menu_Image === 'string' && Menu_Image.trim()
      ? Menu_Image.trim()
      : null;

    if (await hasMenuImageColumn()) {
      await query(
        `INSERT INTO Menu_Item (Menu_ID, Menu_Name, Menu_Description, Menu_Category, Menu_Price, Menu_Availability, Menu_Image)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [newId, Menu_Name, Menu_Description, Menu_Category, Menu_Price, Menu_Availability || 'Y', imagePath]
      );
    } else {
      await query(
        `INSERT INTO Menu_Item (Menu_ID, Menu_Name, Menu_Description, Menu_Category, Menu_Price, Menu_Availability)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newId, Menu_Name, Menu_Description, Menu_Category, Menu_Price, Menu_Availability || 'Y']
      );
    }

    const createdRows = await query<LegacyMenuRow[]>(
      `SELECT Menu_ID, Menu_Name, Menu_Description, Menu_Category, Menu_Price, Menu_Availability, Menu_Image
       FROM Menu_Item
       WHERE Menu_ID = ?`,
      [newId]
    );

    if (createdRows[0]) {
      await syncMenuItemToFirestore(createdRows[0]);
    }

    invalidateCacheByPrefix('menu:list:');

    return NextResponse.json({ success: true, Menu_ID: newId });
  } catch (error) {
    console.error('Error creating menu item:', error);
    return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 });
  }
}
