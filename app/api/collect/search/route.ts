import { NextRequest, NextResponse } from 'next/server';
import { searchGoogle } from '@/lib/serpapi';
import { collectFromUrl } from '../url/route';
import { CollectLog } from '@/types/store';

// POST /api/collect/search - Google検索からの自動収集
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { keyword, num = 10 } = await request.json();

    if (!keyword) {
      return NextResponse.json(
        { error: 'keyword is required' },
        { status: 400 }
      );
    }

    // 1. Google検索で上位N件を取得
    const searchResults = await searchGoogle(keyword, Math.min(num, 10));

    if (!searchResults || searchResults.length === 0) {
      return NextResponse.json({
        total: 0,
        success: 0,
        error: 0,
        duplicate: 0,
        low_score: 0,
        logs: [],
        message: '検索結果が見つかりませんでした',
      });
    }

    const logs: CollectLog[] = [];
    let success = 0;
    let error = 0;
    let duplicate = 0;
    let low_score = 0;

    // 2. 各URLから店舗情報を収集（最大5件並列）
    const urls = searchResults.map((r) => r.link).filter(Boolean);

    for (let i = 0; i < urls.length; i += 5) {
      const batch = urls.slice(i, i + 5);

      const results = await Promise.allSettled(
        batch.map((url) => collectFromUrl(url))
      );

      for (let j = 0; j < results.length; j++) {
        const url = batch[j];
        const result = results[j];

        if (result.status === 'fulfilled') {
          const r = result.value;
          logs.push({
            url,
            status: r.status,
            message: r.message,
            store: r.store as Record<string, unknown> | undefined,
            score: r.score,
          });

          if (r.status === 'success') success++;
          else if (r.status === 'error') error++;
          else if (r.status === 'duplicate') duplicate++;
          else if (r.status === 'low_score') low_score++;
        } else {
          logs.push({
            url,
            status: 'error',
            message: result.reason?.message || '処理エラー',
          });
          error++;
        }
      }

      if (i + 5 < urls.length) {
        await sleep(500);
      }
    }

    return NextResponse.json({
      total: urls.length,
      success,
      error,
      duplicate,
      low_score,
      logs,
      search_results: searchResults,
    });
  } catch (err) {
    console.error('POST /api/collect/search error:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAdmin(request: NextRequest): boolean {
  const auth = request.headers.get('x-admin-password');
  return auth === process.env.ADMIN_PASSWORD;
}
