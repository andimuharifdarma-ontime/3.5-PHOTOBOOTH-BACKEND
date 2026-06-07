import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

interface FrameInfo {
  id: string;
  name: string;
  url: string;
}

function toTitleCase(input: string): string {
  const withSpaces = input.replace(/[-_]+/g, ' ');
  return withSpaces
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export async function GET() {
  try {
    const framesDir = path.join(process.cwd(), 'public', 'frames');
    const entries = await fs.readdir(framesDir, { withFileTypes: true });

    const frames: FrameInfo[] = entries
      .filter(e => e.isFile())
      .map(e => e.name)
      .filter(name => name.toLowerCase().endsWith('.png'))
      .map(fileName => {
        const base = fileName.replace(/\.png$/i, '');
        return {
          id: base,
          name: toTitleCase(base),
          url: `/frames/${fileName}`,
        } as FrameInfo;
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ frames });
  } catch (error) {
    console.error('Error listing frames:', error);
    return NextResponse.json({ frames: [] }, { status: 200 });
  }
}

