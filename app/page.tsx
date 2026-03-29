'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PREFECTURES } from '@/types/store';
import BottomNav from '@/components/BottomNav';

interface Stats {
  avg_price_60min: number | null;
  total_count: number;
}

export default function TopPage() {
  const router = useRouter();
  const [prefecture, setPrefecture] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => { if (data.stats) setStats(data.stats); })
      .catch(() => {});
  }, []);

  const handleSearch = () => {
    if (!prefecture) return;
    router.push(`/stores?prefecture=${encodeURIComponent(prefecture)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/20 to-[#F9FAFB] flex flex-col pb-16">
      {/* ヘッダー */}
      <header className="pt-12 pb-6 px-6 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-card mb-4">
          <span className="text-4xl">🫧</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
          酸素ルーム検索
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          全国の酸素ルーム施設を探す
        </p>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 px-4 md:px-6 pb-safe">
        <div className="max-w-[950px] mx-auto">

          {/* 平均価格バナー（100件以上の場合のみ表示）*/}
          {stats && stats.avg_price_60min && stats.total_count >= 100 && (
            <div className="mb-6 animate-fade-in">
              <div
                className="rounded-2xl p-4 text-center shadow-card"
                style={{ background: 'linear-gradient(135deg, #7EC8E3 0%, #F8BBD0 100%)' }}
              >
                <p className="text-white text-xs font-medium mb-1">
                  📊 全国 {stats.total_count}店舗のデータより
                </p>
                <p className="text-white text-lg font-bold">全国平均価格 1回60分</p>
                <p className="text-white text-3xl font-extrabold">
                  約{Math.round(stats.avg_price_60min).toLocaleString()}円
                </p>
              </div>
            </div>
          )}

          {/* iPad以上は2カラムレイアウト */}
          <div className="md:grid md:grid-cols-2 md:gap-6">

            {/* 検索カード */}
            <div className="card mb-6 md:mb-0">
              <h2 className="text-base font-semibold text-gray-700 mb-4">
                都道府県から探す
              </h2>
              <div className="mb-4">
                <label className="field-label">都道府県を選択</label>
                <div className="relative">
                  <select
                    className="select-field pr-10"
                    value={prefecture}
                    onChange={(e) => setPrefecture(e.target.value)}
                  >
                    <option value="">-- 都道府県を選択 --</option>
                    {PREFECTURES.map((pref) => (
                      <option key={pref} value={pref}>{pref}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              <button
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={handleSearch}
                disabled={!prefecture}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                この都道府県で検索
              </button>
            </div>

            {/* 使い方カード */}
            <div className="card">
              <h2 className="text-base font-semibold text-gray-700 mb-3">使い方</h2>
              <div className="space-y-3">
                {[
                  { icon: '📍', text: '都道府県を選んで検索' },
                  { icon: '📏', text: '現在地から近い順に並び替え' },
                  { icon: '💰', text: '価格の安い順にも対応' },
                  { icon: '🗺️', text: 'Google Mapで場所を確認' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-sm text-gray-600">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <BottomNav prefecture={prefecture} />
    </div>
  );
}
