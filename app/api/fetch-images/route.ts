import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; OxygenRoomBot/1.0; +https://example.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `fetch failed: ${res.status}` },
        { status: 502 }
      );
    }

    const html = await res.text();
    const images: string[] = [];

    // og:image
    const ogMatches = html.matchAll(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi
    );
    for (const m of ogMatches) images.push(m[1]);

    // og:image (reverse attribute order)
    const ogMatches2 = html.matchAll(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi
    );
    for (const m of ogMatches2) images.push(m[1]);

    // twitter:image
    const twMatches = html.matchAll(
      /<meta[^>]+(?:name|property)=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi
    );
    for (const m of twMatches) images.push(m[1]);

    // <img src> — large images (skip tiny icons)
    const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
    for (const m of imgMatches) {
      const src = m[0];
      // skip if width/height attribute looks small
      const wMatch = src.match(/width=["']?(\d+)/i);
      const hMatch = src.match(/height=["']?(\d+)/i);
      const w = wMatch ? parseInt(wMatch[1]) : 9999;
      const h = hMatch ? parseInt(hMatch[1]) : 9999;
      if (w < 100 || h < 100) continue;
      images.push(m[1]);
    }

    // resolve relative URLs
    const base = new URL(url);
    const resolved = images
      .map((src) => {
        try {
          return new URL(src, base).href;
        } catch {
          return null;
        }
      })
      .filter((s): s is string => !!s && s.startsWith('http'))
      // deduplicate
      .filter((v, i, arr) => arr.indexOf(v) === i)
      // only keep image-looking URLs
      .filter((s) =>
        /\.(jpe?g|png|gif|webp|svg|avif)(\?.*)?$/i.test(s) ||
        s.includes('/wp-content/') ||
        s.includes('/uploads/') ||
        s.includes('/images/')
      )
      .slice(0, 20);

    return NextResponse.json({ images: resolved });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 }
    );
  }
}
