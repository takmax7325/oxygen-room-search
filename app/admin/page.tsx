'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Store, StoreStats } from '@/types/store';

function getAdminPw(): string {
  return typeof window !== 'undefined'
    ? sessionStorage.getItem('admin_pw') || ''
    : '';
}

export default function AdminDashboardPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/stores?admin=true', {
        headers: { 'x-admin-password': getAdminPw() },
      }).then((r) => r.json()),
      fetch('/api/stats').then((r) => r.json()),
    ])
      .then(([storeData, statsData]) => {
        setStores(storeData.stores || []);
        setStats(statsData.stats || null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRecalcStats = async () => {
    setRecalculating(true);
    setMessage('');
    try {
      const res = await fetch('/api/stats', {
        method: 'POST',
        headers: { 'x-admin-password': getAdminPw() },
      });
      const data = await res.json();
      if (data.stats) setStats(data.stats);
      setMessage(data.message || '更新しました');
    } catch {
      setMessage('更新に失敗しました');
    } finally {
      setRecalculating(false);
    }
  };

  const publishedCount = stores.filter((s) => s.is_published).length;
  const unpublishedCount = stores.length - publishedCount;
  const avgScore =
    stores.length > 0
      ? Math.round(stores.reduce((sum, s) => sum + s.score, 0) / stores.length)
      : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-800">ダッシュボード</h1>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-24 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : (
        <>
          {/* 統計カード */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon="🏪"
              label="総店舗数"
              value={stores.length.toString()}
              color="blue"
            />
            <StatCard
              icon="✅"
              label="公開中"
              value={publishedCount.toString()}
              color="green"
            />
            <StatCard
              icon="📦"
              label="非公開"
              value={unpublishedCount.toString()}
              color="gray"
            />
            <StatCard
              icon="⭐"
              label="平均スコア"
              value={`${avgScore}/100`}
              color="yellow"
            />
          </div>

          {/* 平均価格カード */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-700">平均価格統計</h2>
              <button
                onClick={handleRecalcStats}
                disabled={recalculating}
                className="text-xs text-primary font-medium hover:text-primary-600 disabled:opacity-50"
              >
                {recalculating ? '計算中...' : '↻ 再計算'}
              </button>
            </div>
            {message && (
              <p className="text-sm text-green-600 mb-2">{message}</p>
            )}
            {stats ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">対象店舗数</span>
                  <span className="font-semibold text-gray-800">
                    {stats.total_count}件
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    全国平均（60分換算）
                  </span>
                  <span className="font-semibold text-gray-800">
                    {stats.avg_price_60min
                      ? `¥${Math.round(stats.avg_price_60min).toLocaleString()}`
                      : `未表示（${stats.total_count}/100件）`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">最終更新</span>
                  <span className="text-xs text-gray-400">
                    {new Date(stats.updated_at).toLocaleString('ja-JP')}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">データなし</p>
            )}
          </div>

          {/* クイックアクション */}
          <div className="card">
            <h2 className="font-semibold text-gray-700 mb-3">
              クイックアクション
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/admin/stores/new"
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                <span className="text-2xl">➕</span>
                <span className="text-sm font-medium text-gray-700">
                  店舗を追加
                </span>
              </Link>
              <Link
                href="/admin/collect"
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-accent/20 hover:bg-accent/30 transition-colors"
              >
                <span className="text-2xl">🤖</span>
                <span className="text-sm font-medium text-gray-700">
                  AI収集
                </span>
              </Link>
              <Link
                href="/admin/stores"
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <span className="text-2xl">📋</span>
                <span className="text-sm font-medium text-gray-700">
                  店舗一覧
                </span>
              </Link>
              <Link
                href="/"
                target="_blank"
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors"
              >
                <span className="text-2xl">🌐</span>
                <span className="text-sm font-medium text-gray-700">
                  サイトを見る
                </span>
              </Link>
            </div>
          </div>

          {/* スコア分布 */}
          <div className="card">
            <h2 className="font-semibold text-gray-700 mb-3">
              データ品質スコア分布
            </h2>
            <ScoreDistribution stores={stores} />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'gray' | 'yellow';
}) {
  const colorMap = {
    blue: 'bg-blue-50 border-blue-100',
    green: 'bg-green-50 border-green-100',
    gray: 'bg-gray-50 border-gray-100',
    yellow: 'bg-yellow-50 border-yellow-100',
  };
  return (
    <div
      className={`rounded-2xl p-4 border ${colorMap[color]}`}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function ScoreDistribution({ stores }: { stores: Store[] }) {
  const ranges = [
    { label: '90-100', min: 90, max: 100, color: 'bg-green-500' },
    { label: '70-89', min: 70, max: 89, color: 'bg-blue-400' },
    { label: '50-69', min: 50, max: 69, color: 'bg-yellow-400' },
    { label: '0-49', min: 0, max: 49, color: 'bg-red-400' },
  ];

  const total = stores.length;
  if (total === 0) return <p className="text-sm text-gray-400">データなし</p>;

  return (
    <div className="space-y-2">
      {ranges.map((range) => {
        const count = stores.filter(
          (s) => s.score >= range.min && s.score <= range.max
        ).length;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={range.label} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-16 flex-shrink-0">
              {range.label}
            </span>
            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${range.color} rounded-full transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-8 text-right">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
