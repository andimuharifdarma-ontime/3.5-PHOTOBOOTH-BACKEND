import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = req.nextUrl.searchParams.get('url');
    if (!url) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Only proxy http/https URLs
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return NextResponse.json({ error: 'Invalid URL scheme' }, { status: 400 });
    }

    const res = await fetch(url);
    if (!res.ok) {
      return new NextResponse(`Failed to fetch image: HTTP ${res.status}`, { status: res.status });
    }

    const blob = await res.blob();
    const contentType = res.headers.get('content-type') || 'image/png';

    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error proxying image' }, { status: 500 });
  }
}
