import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const referer = req.nextUrl.searchParams.get('referer');

  if (!url) {
    return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
  }

  // Forward toàn bộ header từ client, nhưng override Referer
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  if (referer) headers['referer'] = referer;

  const res = await fetch(url, { headers });

  const contentType = res.headers.get('content-type') || '';

  // Rewrite nếu là playlist m3u8
  if (contentType.includes('application/vnd.apple.mpegurl')) {
    let playlist = await res.text();
    const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);

    playlist = playlist.replace(/^(?!#)(.*)$/gm, (match) => {
      const absUrl = match.startsWith('http')
        ? match
        : new URL(match, baseUrl).href;
      return `/api/stream?url=${encodeURIComponent(absUrl)}&referer=${encodeURIComponent(referer || '')}`;
    });

    return new NextResponse(playlist, {
      headers: { 'Content-Type': 'application/vnd.apple.mpegurl' }
    });
  }

  // Forward nguyên stream + headers cho segment/video
  const responseHeaders: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return new NextResponse(res.body, { headers: responseHeaders });
}
