import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTS = new Set([
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
]);

function safeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() || 'image.png';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned.length > 0 ? cleaned : 'image.png';
}

export async function POST(req: NextRequest) {
  let body: { url?: string; filename?: string };
  try {
    body = (await req.json()) as { url?: string; filename?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: 'URL host not allowed' }, { status: 403 });
  }

  const filename = safeFilename(
    typeof body.filename === 'string' ? body.filename : 'image.png'
  );

  const upstream = await fetch(rawUrl, {
    redirect: 'follow',
    headers: { Accept: 'image/*,*/*' },
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: 'Could not fetch image from storage' },
      { status: 502 }
    );
  }

  const buf = Buffer.from(await upstream.arrayBuffer());
  const contentType =
    upstream.headers.get('content-type')?.split(';')[0]?.trim() || 'image/png';

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
