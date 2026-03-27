import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import {
  isSupabaseConfigured,
  localDb_getStats,
  localDb_recalcStats,
} from '@/lib/local-db';

// GET /api/stats - 統計情報取得
export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      const stats = localDb_getStats();
      return NextResponse.json({ stats });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('stats')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ stats: data });
  } catch (err) {
    console.error('GET /api/stats error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/stats - 平均価格を再計算して更新
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
      const stats = localDb_recalcStats();
      return NextResponse.json({
        stats,
        message: `平均価格を更新しました (${stats.total_count}件)`,
      });
    }

    const supabase = createAdminClient();

    const { data: stores, error: storeError } = await supabase
      .from('stores')
      .select('normalized_price')
      .eq('is_published', true)
      .not('normalized_price', 'is', null)
      .gt('normalized_price', 0);

    if (storeError) {
      return NextResponse.json({ error: storeError.message }, { status: 500 });
    }

    const prices = (stores || [])
      .map((s) => s.normalized_price as number)
      .filter((p) => p > 0);

    const totalCount = prices.length;
    const avgPrice =
      totalCount >= 100
        ? prices.reduce((sum, p) => sum + p, 0) / totalCount
        : null;

    const { data: updatedStats, error: updateError } = await supabase
      .from('stats')
      .update({
        avg_price_60min: avgPrice,
        total_count: totalCount,
        updated_at: new Date().toISOString(),
      })
      .order('updated_at', { ascending: false })
      .limit(1)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      stats: updatedStats,
      message: `平均価格を更新しました (${totalCount}件)`,
    });
  } catch (err) {
    console.error('POST /api/stats error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function isAdmin(request: NextRequest): boolean {
  const auth = request.headers.get('x-admin-password');
  return auth === process.env.ADMIN_PASSWORD;
}
