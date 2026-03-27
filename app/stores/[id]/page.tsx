'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Store } from '@/types/store';

export default function StoreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/stores/${params.id}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data?.store) setStore(data.store);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse-slow">🫧</div>
          <p className="text-gray-400 text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (notFound || !store) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center px-6">
        <p className="text-5xl mb-4">😢</p>
        <p className="text-gray-600 font-medium">店舗が見つかりません</p>
        <Link href="/" className="mt-4 text-primary text-sm">
          トップに戻る
        </Link>
      </div>
    );
  }

  const googleMapsUrl = store.lat && store.lng
    ? `https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}`
    : store.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`
    : null;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3 max-w-xl mx-auto">
          <button
            onClick={() => router.back()}
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
          </button>
          <h1 className="font-bold text-gray-800 truncate flex-1">
            {store.name}
          </h1>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {/* メイン情報カード */}
        <div className="card animate-fade-in">
          {/* 店名・都道府県 */}
          <div className="mb-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-xl font-bold text-gray-800">{store.name}</h2>
              {store.prefecture && (
                <span className="badge-primary flex-shrink-0 mt-1">
                  {store.prefecture}
                </span>
              )}
            </div>
            {store.description && (
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                {store.description}
              </p>
            )}
          </div>

          {/* 区切り線 */}
          <div className="border-t border-gray-100 my-4" />

          {/* 詳細情報 */}
          <div className="space-y-3">
            {store.address && (
              <InfoRow
                icon="📍"
                label="住所"
                value={store.address}
              />
            )}
            {store.price && (
              <InfoRow
                icon="💰"
                label="料金"
                value={store.price}
                highlight
              />
            )}
            {store.normalized_price && (
              <InfoRow
                icon="⏱️"
                label="60分換算"
                value={`約${Math.round(store.normalized_price).toLocaleString()}円`}
              />
            )}
            {store.closed_days && (
              <InfoRow
                icon="📅"
                label="定休日"
                value={store.closed_days}
              />
            )}
            {store.machine_type && (
              <InfoRow
                icon="🫧"
                label="機器タイプ"
                value={store.machine_type}
              />
            )}
            {store.capacity && (
              <InfoRow
                icon="👤"
                label="収容人数"
                value={`${store.capacity}名`}
              />
            )}
          </div>
        </div>

        {/* アクションボタン */}
        <div className="space-y-3 animate-fade-in">
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              Google Mapで開く
            </a>
          )}
          {store.website_url && (
            <a
              href={store.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              公式サイトを見る
            </a>
          )}
        </div>

        {/* データ品質スコア */}
        <div className="text-center text-xs text-gray-300 mt-4">
          データ品質スコア: {store.score}/100
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <span className="text-lg flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p
          className={`text-sm ${
            highlight
              ? 'font-bold text-gray-800 text-base'
              : 'text-gray-700'
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
