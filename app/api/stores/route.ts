import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import {
  isSupabaseConfigured,
  localDb_getStores,
  localDb_createStore,
} from '@/lib/local-db';

// GET /api/stores - 店舗一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prefecture = searchParams.get('prefecture');
    const includeUnpublished = searchParams.get('admin') === 'true';

    // 管理者モードはパスワード必須
    if (includeUnpublished && !isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- ローカルDB フォールバック ---
    if (!isSupabaseConfigured()) {
      const stores = localDb_getStores({ prefecture: prefecture ?? undefined, includeUnpublished });
      return NextResponse.json({ stores });
    }

    // --- Supabase ---
    const supabase = createAdminClient();
    let query = supabase
      .from('stores')
      .select('*')
      .order('priority', { ascending: false })
      .order('score', { ascending: false });

    if (!includeUnpublished) query = query.eq('is_published', true);
    if (prefecture) query = query.eq('prefecture', prefecture);

    const { data, error } = await query;
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ stores: data || [] });
  } catch (err) {
    console.error('GET /api/stores error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/stores - 店舗追加
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // --- ローカルDB フォールバック ---
    if (!isSupabaseConfigured()) {
      const store = localDb_createStore(body);
      return NextResponse.json({ store }, { status: 201 });
    }

    // --- Supabase ---
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('stores')
      .insert([body])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ store: data }, { status: 201 });
  } catch (err) {
    console.error('POST /api/stores error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function isAdmin(request: NextRequest): boolean {
  const auth = request.headers.get('x-admin-password');
  return auth === process.env.ADMIN_PASSWORD;
}
