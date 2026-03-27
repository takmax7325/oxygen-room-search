export interface SerpResult {
  title: string;
  link: string;
  snippet: string;
}

/**
 * SerpAPIを使用してGoogle検索結果を取得する
 */
export async function searchGoogle(
  query: string,
  num: number = 10
): Promise<SerpResult[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) throw new Error('SERPAPI_KEY is not configured');

  const url = new URL('https://serpapi.com/search');
  url.searchParams.set('engine', 'google');
  url.searchParams.set('q', query);
  url.searchParams.set('num', String(num));
  url.searchParams.set('hl', 'ja');
  url.searchParams.set('gl', 'jp');
  url.searchParams.set('api_key', apiKey);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url.toString());

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`SerpAPI error ${res.status}: ${body}`);
      }

      const data = await res.json();
      const organicResults = data.organic_results || [];

      return organicResults.map((r: Record<string, string>) => ({
        title: r.title || '',
        link: r.link || '',
        snippet: r.snippet || '',
      }));
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) await sleep(1000 * (attempt + 1));
    }
  }

  throw lastError || new Error('SerpAPI search failed');
}

/**
 * URLのHTMLコンテンツを取得する
 */
export async function fetchHtml(url: string): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; OxygenRoomBot/1.0; +https://oxygen-room.vercel.app)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ja,en;q=0.9',
        },
        signal: AbortSignal.timeout(15000), // 15秒タイムアウト
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
      return await res.text();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < 2) await sleep(1000 * (attempt + 1));
    }
  }

  throw lastError || new Error(`Failed to fetch: ${url}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
