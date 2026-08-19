import type { NextRequest } from 'next/server';

const LOCAL_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3003',
  'app://.',
];

function buildAllowlist(): string[] {
  const fromEnv = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const base = process.env.NEXT_PUBLIC_BASE_URL?.trim();

  const vercelUrl = process.env.VERCEL_URL?.trim();
  const vercelOrigin = vercelUrl ? `https://${vercelUrl}` : null;

  return [
    ...LOCAL_ORIGINS,
    ...(base ? [base] : []),
    ...(vercelOrigin ? [vercelOrigin] : []),
    ...fromEnv,
  ];
}

export function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;
  return buildAllowlist().includes(origin);
}

/** Resolve CORS Allow-Origin for a request (never reflects unknown origins). */
export function getAllowedOrigin(req: NextRequest): string {
  const origin = req.headers.get('origin') || '';
  if (isOriginAllowed(origin)) return origin;
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}
