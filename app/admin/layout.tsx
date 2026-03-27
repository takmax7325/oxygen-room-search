'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin', label: 'ダッシュボード', icon: '📊', exact: true },
  { href: '/admin/stores', label: '店舗管理', icon: '🏪', exact: false },
  { href: '/admin/collect', label: 'データ収集', icon: '🤖', exact: false },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  // セッションストレージから認証状態を復元
  useEffect(() => {
    const savedPw = sessionStorage.getItem('admin_pw');
    if (savedPw) {
      setPassword(savedPw);
      setAuthenticated(true);
    }
  }, []);

  const handleLogin = async () => {
    if (!password) return;
    setChecking(true);
    setError('');

    try {
      const res = await fetch('/api/stats', {
        headers: { 'x-admin-password': password },
      });
      // statsは誰でも読めるのでステータスでは判断できない
      // 実際の認証はAPIで行う
      const testRes = await fetch('/api/stores?admin=true', {
        headers: { 'x-admin-password': password },
      });

      if (testRes.ok) {
        sessionStorage.setItem('admin_pw', password);
        setAuthenticated(true);
      } else if (testRes.status === 401) {
        setError('パスワードが違います');
      } else {
        setError('サーバーエラーが発生しました');
      }
    } catch {
      setError('接続エラーが発生しました');
    } finally {
      setChecking(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🔐</div>
            <h1 className="text-xl font-bold text-gray-800">管理画面</h1>
            <p className="text-gray-500 text-sm mt-1">
              管理者パスワードを入力してください
            </p>
          </div>
          <div className="card">
            <div className="mb-4">
              <label className="field-label">パスワード</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="管理者パスワード"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm mb-3 text-center">{error}</p>
            )}
            <button
              className="btn-primary disabled:opacity-40"
              onClick={handleLogin}
              disabled={checking || !password}
            >
              {checking ? '確認中...' : 'ログイン'}
            </button>
          </div>
          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
              ← トップに戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isActive = (item: (typeof NAV_ITEMS)[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* サイドバー / トップナビ */}
      <header className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🫧</span>
            <span className="font-bold text-gray-800 text-sm">
              管理画面
            </span>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem('admin_pw');
              setAuthenticated(false);
              setPassword('');
            }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ログアウト
          </button>
        </div>

        {/* ナビゲーション */}
        <div className="max-w-5xl mx-auto mt-3 flex gap-2 no-scrollbar overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                isActive(item)
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
