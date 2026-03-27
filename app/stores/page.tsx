'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Store, SortType } from '@/types/store';
import { calcDistance, formatDistance } from '@/lib/distance';
import StoreCard from '@/components/StoreCard';

function StoreListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const prefecture = searchParams.get('prefecture') || '';

  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortType, setSortType] = useState<SortType>('recommended');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  // 店舗データ取得
  useEffect(() => {
    if (!prefecture) {
      router.push('/');
      return;
    }
    setLoading(true);
    fetch(
      `/api/stores?prefecture=${encodeURIComponent(prefecture)}`
    )
      .then((r) => r.json())
      .then((data) => {
        setStores(data.stores || []);
      })
      .catch(() => setStores([]))
      .finally(() => setLoading(false));
  }, [prefecture, router]);

  // 現在地取得
  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError(true);
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setSortType('distance');
        setGeoLoading(false);
      },
      () => {
        setGeoError(true);
        setGeoLoading(false);
      },
      { timeout: 10000 }
    );
  }, []);

  // ソート処理
  const sortedStores = [...stores]
    .map((store) => ({
      ...store,
      distance:
        userLat && userLng && store.lat && store.lng
          ? calcDistance(userLat, userLng, store.lat, store.lng)
          : undefined,
    }))
    .sort((a, b) => {
      if (sortType === 'recommended') {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return b.score - a.score;
      }
      if (sortType === 'distance') {
        if (a.distance == null && b.distance == null) return 0;
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      }
      if (sortType === 'price') {
        if (a.normalized_price == null && b.normalized_price == null) return 0;
        if (a.normalized_price == null) return 1;
        if (b.normalized_price == null) return -1;
        return a.normalized_price - b.normalized_price;
      }
      return 0;
    });

  const SORT_OPTIONS: { value: SortType; label: string; icon: string }[] = [
    { value: 'recommended', label: 'おすすめ', icon: '⭐' },
    { value: 'distance', label: '近い順', icon: '📍' },
    { value: 'price', label: '安い順', icon: '💰' },
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3 max-w-xl mx-auto">
          <Link
            href="/"
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-800 truncate">
              {prefecture}の酸素ルーム
            </h1>
            {!loading && (
              <p className="text-xs text-gray-500">{stores.length}件</p>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-4">
        {/* 並び替えタブ */}
        <div className="flex gap-2 mb-4 no-scrollbar overflow-x-auto pb-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                if (opt.value === 'distance' && !userLat) {
                  getLocation();
                } else {
                  setSortType(opt.value);
                }
              }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                sortType === opt.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}

          {/* 現在地取得ボタン */}
          {!userLat && sortType !== 'distance' && (
            <button
              onClick={getLocation}
              disabled={geoLoading}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium bg-white text-gray-600 border border-dashed border-gray-300 hover:border-primary transition-all"
            >
              {geoLoading ? (
                <>
                  <span className="animate-spin">⟳</span>
                  <span>取得中...</span>
                </>
              ) : (
                <>
                  <span>📡</span>
                  <span>現在地</span>
                </>
              )}
            </button>
          )}
        </div>

        {geoError && (
          <div className="mb-3 px-4 py-2.5 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-700">
            位置情報を取得できませんでした
          </div>
        )}

        {/* 現在地情報 */}
        {userLat && (
          <div className="mb-3 px-4 py-2.5 bg-primary/10 rounded-xl text-xs text-primary-700 flex items-center gap-1.5">
            <span>📍</span>
            <span>現在地から距離を計算中</span>
          </div>
        )}

        {/* ローディング */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="card h-32 animate-pulse bg-gray-100"
              />
            ))}
          </div>
        )}

        {/* 店舗リスト */}
        {!loading && sortedStores.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-gray-500 font-medium">店舗が見つかりません</p>
            <p className="text-gray-400 text-sm mt-1">
              {prefecture}のデータを準備中です
            </p>
          </div>
        )}

        {!loading && (
          <div className="space-y-3">
            {sortedStores.map((store, i) => (
              <div
                key={store.id}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <StoreCard store={store} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StoreListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-gray-400 text-sm">読み込み中...</div>
      </div>
    }>
      <StoreListContent />
    </Suspense>
  );
}
