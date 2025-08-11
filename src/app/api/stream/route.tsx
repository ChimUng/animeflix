import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const referer = req.nextUrl.searchParams.get('referer');

  if (!url) {
    return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
  }

  const res = await fetch(url, {
    headers: referer ? { Referer: referer } : {}
  });

  const contentType = res.headers.get('content-type') || '';

  // Nếu là .m3u8 thì cần rewrite URL
  if (contentType.includes('application/vnd.apple.mpegurl')) {
    let playlist = await res.text();

    const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);

    playlist = playlist.replace(
      /^(?!#)(.*)$/gm, // dòng không bắt đầu bằng "#"
      (match) => {
        const absUrl = match.startsWith('http')
          ? match
          : new URL(match, baseUrl).href;
        return `/api/stream?url=${encodeURIComponent(absUrl)}&referer=${encodeURIComponent(referer || '')}`;
      }
    );

    return new NextResponse(playlist, {
      headers: { 'Content-Type': 'application/vnd.apple.mpegurl' }
    });
  }

  // Nếu là .ts hoặc video
  return new NextResponse(res.body, {
    headers: { 'Content-Type': contentType }
  });
}
