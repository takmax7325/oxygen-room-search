import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import {
  isSupabaseConfigured,
  localDb_getStore,
  localDb_updateStore,
  localDb_deleteStore,
} from '@/lib/local-db';

// GET /api/stores/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isSupabaseConfigured()) {
      const store = localDb_getStore(params.id);
      if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });
      return NextResponse.json({ store });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    return NextResponse.json({ store: data });
  } catch (err) {
    console.error('GET /api/stores/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/stores/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!isSupabaseConfigured()) {
      const store = localDb_updateStore(params.id, body);
      if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });
      return NextResponse.json({ store });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('stores')
      .update(body)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ store: data });
  } catch (err) {
    console.error('PUT /api/stores/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/stores/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
      const ok = localDb_deleteStore(params.id);
      if (!ok) return NextResponse.json({ error: 'Store not found' }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/stores/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function isAdmin(request: NextRequest): boolean {
  const auth = request.headers.get('x-admin-password');
  return auth === process.env.ADMIN_PASSWORD;
}
