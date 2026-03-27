'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Store } from '@/types/store';

function getAdminPw(): string {
  return typeof window !== 'undefined'
    ? sessionStorage.getItem('admin_pw') || ''
    : '';
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadStores = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stores?admin=true', {
        headers: { 'x-admin-password': getAdminPw() },
      });
      const data = await res.json();
      setStores(data.stores || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  const togglePublished = async (store: Store) => {
    const newValue = !store.is_published;
    // 楽観的更新
    setStores((prev) =>
      prev.map((s) =>
        s.id === store.id ? { ...s, is_published: newValue } : s
      )
    );
    try {
      await fetch(`/api/stores/${store.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': getAdminPw(),
        },
        body: JSON.stringify({ is_published: newValue }),
      });
    } catch {
      // ロールバック
      setStores((prev) =>
        prev.map((s) =>
          s.id === store.id ? { ...s, is_published: !newValue } : s
        )
      );
    }
  };

  const deleteStore = async (storeId: string, storeName: string) => {
    if (!confirm(`「${storeName}」を削除しますか？`)) return;
    setDeleting(storeId);
    try {
      await fetch(`/api/stores/${storeId}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': getAdminPw() },
      });
      setStores((prev) => prev.filter((s) => s.id !== storeId));
    } catch {
      alert('削除に失敗しました');
    } finally {
      setDeleting(null);
    }
  };

  const filteredStores = stores
    .filter((s) => {
      if (filter === 'published') return s.is_published;
      if (filter === 'unpublished') return !s.is_published;
      return true;
    })
    .filter((s) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.prefecture || '').toLowerCase().includes(q) ||
        (s.address || '').toLowerCase().includes(q)
      );
    });

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-end">
        <Link href="/admin/stores/new" className="btn-primary w-auto px-4 h-10 text-sm">
          ＋ 追加
        </Link>
      </div>

      {/* フィルター */}
      <div className="card">
        <div className="flex gap-2 mb-3">
          {(['all', 'published', 'unpublished'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {f === 'all' ? 'すべて' : f === 'published' ? '公開中' : '非公開'}
              <span className="ml-1 opacity-70">
                (
                {f === 'all'
                  ? stores.length
                  : f === 'published'
                  ? stores.filter((s) => s.is_published).length
                  : stores.filter((s) => !s.is_published).length}
                )
              </span>
            </button>
          ))}
        </div>
        <input
          type="text"
          className="input-field h-10 text-sm"
          placeholder="店舗名・都道府県で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* ローディング */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-20 animate-pulse bg-gray-100" />
          ))}
        </div>
      )}

      {/* 店舗リスト */}
      {!loading && (
        <div className="space-y-2">
          {filteredStores.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm">該当する店舗がありません</p>
            </div>
          )}

          {filteredStores.map((store) => (
            <div
              key={store.id}
              className="card flex items-center gap-3 py-3"
            >
              {/* 公開切替 */}
              <button
                onClick={() => togglePublished(store)}
                className={`flex-shrink-0 w-12 h-6 rounded-full transition-all relative ${
                  store.is_published ? 'bg-primary' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                    store.is_published ? 'left-6' : 'left-0.5'
                  }`}
                />
              </button>

              {/* 店舗情報 */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/admin/stores/${store.id}`}
                  className="font-medium text-sm text-gray-800 truncate block hover:text-primary transition-colors"
                >
                  {store.name}
                </Link>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {store.prefecture && (
                    <span className="text-xs text-gray-400">
                      {store.prefecture}
                    </span>
                  )}
                  {store.machine_type && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {store.machine_type}
                    </span>
                  )}
                  {store.price && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 truncate max-w-[120px]">
                      {store.price}
                    </span>
                  )}
                </div>
              </div>

              {/* アクション */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/admin/stores/${store.id}/edit`}
                  className="text-xs text-primary font-medium hover:text-primary-600"
                >
                  編集
                </Link>
                <button
                  onClick={() => deleteStore(store.id, store.name)}
                  disabled={deleting === store.id}
                  className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40"
                >
                  {deleting === store.id ? '...' : '削除'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
