import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const workerPath = join(process.cwd(), 'node_modules', 'gif.js', 'dist', 'gif.worker.js');
    const content = await readFile(workerPath, { encoding: 'utf-8' });
    return new NextResponse(content as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (e) {
    return new NextResponse('gif.worker.js not found', { status: 404 });
  }
}


