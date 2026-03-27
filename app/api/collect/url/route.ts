import { NextRequest, NextResponse } from 'next/server';
import { extractStoreFromHtml, validateStore, checkDuplicate } from '@/lib/openai';
import { geocodeAddress } from '@/lib/geocoding';
import { normalizePrice, normalizeAddress, extractPrefecture } from '@/lib/normalize';
import { scoreStore, MIN_SCORE } from '@/lib/scoring';
import { fetchHtml } from '@/lib/serpapi';
import {
  isSupabaseConfigured,
  localDb_getStores,
  localDb_createStore,
} from '@/lib/local-db';

// POST /api/collect/url - URL単体からの店舗データ収集
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const result = await collectFromUrl(url);
    return NextResponse.json(result);
  } catch (err) {
    console.error('POST /api/collect/url error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function collectFromUrl(url: string): Promise<{
  status: 'success' | 'error' | 'duplicate' | 'low_score';
  message: string;
  store?: Record<string, unknown>;
  score?: number;
}> {
  try {
    // 1. HTMLを取得
    const html = await fetchHtml(url);

    // 2. 抽出（Claude API が設定されていれば AI、なければパターンマッチング）
    const extracted = await extractStoreFromHtml(html);

    if (!extracted.name) {
      return { status: 'error', message: '店舗情報を抽出できませんでした' };
    }

    // 3. 住所正規化
    const normalizedAddress = normalizeAddress(extracted.address);
    const prefecture =
      extracted.prefecture || extractPrefecture(normalizedAddress);

    // 4. Geocoding
    const geo = normalizedAddress
      ? await geocodeAddress(normalizedAddress)
      : null;

    // 5. 価格正規化
    const normalizedPrice = normalizePrice(extracted.price);

    // 6. バリデーション
    const validation = await validateStore({
      ...extracted,
      address: normalizedAddress,
    });

    // 7. スコアリング
    const { score } = scoreStore(extracted, validation.is_valid);

    if (score < MIN_SCORE) {
      return {
        status: 'low_score',
        message: `スコア不足 (${score}/${MIN_SCORE})`,
        score,
      };
    }

    const storeData = {
      name: extracted.name,
      prefecture: prefecture || null,
      address: normalizedAddress || null,
      postal_code: null,
      lat: geo?.lat || null,
      lng: geo?.lng || null,
      price: extracted.price || null,
      normalized_price: normalizedPrice,
      closed_days: extracted.closed_days || null,
      description: extracted.description || null,
      website_url: url,
      machine_type: null,
      image_url: null,
      score,
      is_published: false,
      priority: 0,
    };

    if (isSupabaseConfigured()) {
      // Supabase に保存
      const { createAdminClient } = await import('@/lib/supabase-server');
      const supabase = createAdminClient();

      // 8. 重複チェック
      const { data: existingStores } = await supabase
        .from('stores')
        .select('id, name, address, lat, lng')
        .eq('prefecture', prefecture);

      const duplicateResult = await checkDuplicate(
        { ...extracted, address: normalizedAddress, lat: geo?.lat, lng: geo?.lng },
        existingStores || []
      );

      if (duplicateResult.is_duplicate) {
        return {
          status: 'duplicate',
          message: `重複店舗の可能性 (信頼度: ${duplicateResult.confidence}%)`,
        };
      }

      const { data: savedStore, error } = await supabase
        .from('stores')
        .insert([storeData])
        .select()
        .single();

      if (error) {
        return { status: 'error', message: `保存エラー: ${error.message}` };
      }

      return {
        status: 'success',
        message: `「${extracted.name}」を登録しました`,
        store: savedStore,
        score,
      };
    } else {
      // ローカルDB に保存
      const existing = localDb_getStores({ prefecture: prefecture || undefined, includeUnpublished: true });

      const duplicateResult = await checkDuplicate(
        { ...extracted, address: normalizedAddress, lat: geo?.lat, lng: geo?.lng },
        existing
      );

      if (duplicateResult.is_duplicate) {
        return {
          status: 'duplicate',
          message: `重複店舗の可能性 (信頼度: ${duplicateResult.confidence}%)`,
        };
      }

      const savedStore = localDb_createStore(storeData);

      return {
        status: 'success',
        message: `「${extracted.name}」を登録しました`,
        store: savedStore as unknown as Record<string, unknown>,
        score,
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '不明なエラー';
    return { status: 'error', message };
  }
}

function isAdmin(request: NextRequest): boolean {
  const auth = request.headers.get('x-admin-password');
  return auth === process.env.ADMIN_PASSWORD;
}
