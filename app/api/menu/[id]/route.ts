import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { deleteMenuItemFromFirestore, syncMenuItemToFirestore } from '@/lib/referenceSync';
import { invalidateCacheByPrefix } from '@/lib/serverCache';

type MenuPatchPayload = {
  Menu_Name?: string;
  Menu_Description?: string;
  Menu_Category?: string;
  Menu_Price?: number;
  Menu_Availability?: 'Y' | 'N';
  Menu_Image?: string | null;
};

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

async function fetchMenuRow(menuId: number) {
  const rows = await query<LegacyMenuRow[]>(
    `SELECT Menu_ID, Menu_Name, Menu_Description, Menu_Category, Menu_Price, Menu_Availability, Menu_Image
     FROM Menu_Item
     WHERE Menu_ID = ?`,
    [menuId]
  );

  return rows[0] ?? null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const menuId = parseInt(id, 10);
    const body = (await request.json()) as MenuPatchPayload;

    if (!Number.isFinite(menuId)) {
      return NextResponse.json({ error: 'Invalid menu item ID' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: Array<string | number | null> = [];

    if (body.Menu_Name !== undefined) {
      updates.push('Menu_Name = ?');
      values.push(body.Menu_Name.trim());
    }

    if (body.Menu_Description !== undefined) {
      updates.push('Menu_Description = ?');
      values.push(body.Menu_Description.trim());
    }

    if (body.Menu_Category !== undefined) {
      updates.push('Menu_Category = ?');
      values.push(body.Menu_Category.trim());
    }

    if (body.Menu_Price !== undefined) {
      updates.push('Menu_Price = ?');
      values.push(body.Menu_Price);
    }

    if (body.Menu_Availability !== undefined) {
      if (!['Y', 'N'].includes(body.Menu_Availability)) {
        return NextResponse.json({ error: 'Invalid availability value' }, { status: 400 });
      }
      updates.push('Menu_Availability = ?');
      values.push(body.Menu_Availability);
    }

    if (body.Menu_Image !== undefined && await hasMenuImageColumn()) {
      updates.push('Menu_Image = ?');
      values.push(body.Menu_Image && body.Menu_Image.trim() ? body.Menu_Image.trim() : null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No changes were provided' }, { status: 400 });
    }

    values.push(menuId);

    await query(
      `UPDATE Menu_Item SET ${updates.join(', ')} WHERE Menu_ID = ?`,
      values
    );

    const updatedRow = await fetchMenuRow(menuId);
    if (updatedRow) {
      await syncMenuItemToFirestore(updatedRow);
    }

    invalidateCacheByPrefix('menu:list:');

    return NextResponse.json({ success: true, Menu_ID: menuId });
  } catch (error) {
    console.error('Error updating menu item:', error);
    return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const menuId = parseInt(id, 10);

    if (!Number.isFinite(menuId)) {
      return NextResponse.json({ error: 'Invalid menu item ID' }, { status: 400 });
    }

    try {
      await query('DELETE FROM Menu_Item WHERE Menu_ID = ?', [menuId]);
      await deleteMenuItemFromFirestore(menuId);
      invalidateCacheByPrefix('menu:list:');
      return NextResponse.json({ success: true, deleted: true });
    } catch (error) {
      const sqlError = error as { code?: string };
      if (sqlError.code === 'ER_ROW_IS_REFERENCED_2') {
        await query('UPDATE Menu_Item SET Menu_Availability = ? WHERE Menu_ID = ?', ['N', menuId]);
        const updatedRow = await fetchMenuRow(menuId);
        if (updatedRow) {
          await syncMenuItemToFirestore(updatedRow);
        }
        invalidateCacheByPrefix('menu:list:');
        return NextResponse.json({
          success: true,
          deleted: false,
          deactivated: true,
          message: 'Menu item has existing order history, so it was marked unavailable instead of deleted.',
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json({ error: 'Failed to delete menu item' }, { status: 500 });
  }
}
