import { NextRequest, NextResponse } from 'next/server';
import { collectFromUrl } from '../url/route';
import { CollectLog } from '@/types/store';

const MAX_CONCURRENT = 5;

// POST /api/collect/csv - CSV一括収集
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const urls: string[] = body.urls || [];

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'URLs array is required' }, { status: 400 });
    }

    const logs: CollectLog[] = [];
    let success = 0;
    let error = 0;
    let duplicate = 0;
    let low_score = 0;

    // 並列処理（最大5件ずつ）
    for (let i = 0; i < urls.length; i += MAX_CONCURRENT) {
      const batch = urls.slice(i, i + MAX_CONCURRENT);

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

      // バッチ間で少し待機（API制限対策）
      if (i + MAX_CONCURRENT < urls.length) {
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
    });
  } catch (err) {
    console.error('POST /api/collect/csv error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
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
