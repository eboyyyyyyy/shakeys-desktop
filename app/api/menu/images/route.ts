import { NextResponse } from 'next/server';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { getOrSetCache } from '@/lib/serverCache';

function toLabel(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, '');
  return baseName
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export async function GET() {
  try {
    const options = await getOrSetCache('menu:images', 5 * 60_000, async () => {
      const menuDir = path.join(process.cwd(), 'public', 'menu');
      const entries = await readdir(menuDir, { withFileTypes: true });

      return entries
        .filter((entry) => entry.isFile())
        .map((entry) => ({
          label: toLabel(entry.name),
          value: `/menu/${entry.name}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    });

    return NextResponse.json(options, {
      headers: {
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    console.error('Error loading menu images:', error);
    return NextResponse.json({ error: 'Failed to load menu images' }, { status: 500 });
  }
}
