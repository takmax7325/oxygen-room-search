'use client';

import { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { CollectLog } from '@/types/store';
import BottomNav from '@/components/BottomNav';

function getAdminPw(): string {
  return typeof window !== 'undefined'
    ? sessionStorage.getItem('admin_pw') || ''
    : '';
}

type CollectMode = 'url' | 'csv' | 'search';

interface CollectResult {
  total: number;
  success: number;
  error: number;
  duplicate: number;
  low_score: number;
  logs: CollectLog[];
}

export default function AiCollectPage() {
  const [mode, setMode] = useState<CollectMode>('url');
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

  useEffect(() => {
    const saved = getAdminPw();
    if (saved) setPwSaved(true);
    fetch('/api/ai-status')
      .then((r) => r.json())
      .then((d) => setAiConfigured(d.configured))
      .catch(() => setAiConfigured(false));
  }, []);

  const savePw = () => {
    if (!password.trim()) return;
    sessionStorage.setItem('admin_pw', password.trim());
    setPwSaved(true);
  };

  // URL mode
  const [urlInput, setUrlInput] = useState('');
  const [urlResult, setUrlResult] = useState<CollectLog | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);

  // CSV mode
  const [csvUrls, setCsvUrls] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvResult, setCsvResult] = useState<CollectResult | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvProgress, setCsvProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search mode
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchNum, setSearchNum] = useState(10);
  const [searchResult, setSearchResult] = useState<CollectResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleUrlCollect = async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    setUrlResult(null);
    try {
      const res = await fetch('/api/collect/url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': getAdminPw(),
        },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (res.status === 401) {
        sessionStorage.removeItem('admin_pw');
        setPwSaved(false);
        setUrlResult({ url: urlInput, status: 'error', message: 'パスワードが違います。再度入力してください。' });
        setUrlLoading(false);
        return;
      }
      const status: CollectLog['status'] = (['success','error','duplicate','low_score'].includes(data.status) ? data.status : 'error');
      const message = data.message || data.error || '不明なエラー';
      setUrlResult({ url: urlInput, status, message, store: data.store, score: data.score });
    } catch (err) {
      setUrlResult({ url: urlInput, status: 'error', message: err instanceof Error ? err.message : '通信エラー' });
    } finally {
      setUrlLoading(false);
    }
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setCsvUrls([]);
    setCsvResult(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data as Record<string, string>[];
        const urlKey = Object.keys(rows[0] || {}).find((k) => /url|link|website|site|href/i.test(k));
        if (!urlKey) { alert('URL列が見つかりませんでした'); return; }
        const urls = rows.map((r) => r[urlKey]).filter((u) => u && u.startsWith('http'));
        setCsvUrls(urls);
      },
      error: () => alert('CSVファイルの読み込みに失敗しました'),
    });
  };

  const handleCsvCollect = async () => {
    if (csvUrls.length === 0) return;
    setCsvLoading(true);
    setCsvResult(null);
    setCsvProgress(0);
    const progressInterval = setInterval(() => {
      setCsvProgress((prev) => Math.min(prev + 2, 90));
    }, 500);
    try {
      const res = await fetch('/api/collect/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': getAdminPw() },
        body: JSON.stringify({ urls: csvUrls }),
      });
      const data = await res.json();
      setCsvResult(data);
      setCsvProgress(100);
    } catch (err) {
      alert(err instanceof Error ? err.message : '処理エラー');
    } finally {
      clearInterval(progressInterval);
      setCsvLoading(false);
    }
  };

  const handleSearchCollect = async () => {
    if (!searchKeyword.trim()) return;
    setSearchLoading(true);
    setSearchResult(null);
    try {
      const res = await fetch('/api/collect/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': getAdminPw() },
        body: JSON.stringify({ keyword: searchKeyword, num: searchNum }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSearchResult(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : '処理エラー');
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-16">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3">
        <div className="max-w-[950px] mx-auto">
          <h1 className="font-bold text-gray-800 text-base">🤖 AI収集</h1>
          <p className="text-xs text-gray-400">AIで店舗情報を自動収集・登録</p>
        </div>
      </header>

      <div className="max-w-[950px] mx-auto px-4 py-4 space-y-4">

        {/* パスワード未設定の場合 */}
        {!pwSaved && (
          <div className="card space-y-3">
            <p className="text-sm font-medium text-gray-700">🔑 管理者パスワードを入力</p>
            <div className="flex gap-2">
              <input
                type="password"
                className="input-field flex-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
                onKeyDown={(e) => e.key === 'Enter' && savePw()}
              />
              <button className="btn-primary px-6" onClick={savePw} disabled={!password.trim()}>
                保存
              </button>
            </div>
          </div>
        )}

        {/* AI接続状態 */}
        {aiConfigured === true && (
          <div className="px-4 py-2.5 bg-green-50 border border-green-200 rounded-2xl text-xs text-green-700 flex items-center gap-2">
            <span>✅</span><span>Groq AI 接続済み（高精度抽出モード）</span>
          </div>
        )}
        {aiConfigured === false && (
          <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700">
            ⚠️ AIキーが未設定です
          </div>
        )}

        {/* モード選択 */}
        <div className="flex gap-2">
          {([
            { key: 'url', label: 'URL単体', icon: '🔗' },
            { key: 'csv', label: 'CSV一括', icon: '📄' },
            { key: 'search', label: 'Google検索', icon: '🔍' },
          ] as const).map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-2xl text-sm font-medium transition-all ${
                mode === m.key ? 'bg-primary text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary'
              }`}
            >
              <span className="text-xl">{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        {/* URL単体モード */}
        {mode === 'url' && (
          <div className="card space-y-4">
            <div>
              <label className="field-label">店舗URLを入力</label>
              <input
                type="url"
                className="input-field"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/oxygen-room"
                onKeyDown={(e) => e.key === 'Enter' && handleUrlCollect()}
              />
              <p className="text-xs text-gray-400 mt-1">HTMLを取得してAIが自動で店舗情報を抽出します</p>
            </div>
            <button
              className="btn-primary disabled:opacity-40"
              onClick={handleUrlCollect}
              disabled={urlLoading || !urlInput.trim() || aiConfigured === false}
            >
              {urlLoading ? <><span className="animate-spin mr-2">⟳</span>AI処理中...</> : '🤖 AIで抽出・登録'}
            </button>
            {urlResult && <LogItem log={urlResult} />}
          </div>
        )}

        {/* CSV一括モード */}
        {mode === 'csv' && (
          <div className="card space-y-4">
            <div>
              <label className="field-label">CSVファイルをアップロード</label>
              <div
                className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-3xl mb-2">📄</div>
                {csvFileName ? (
                  <p className="text-sm font-medium text-primary">{csvFileName}</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">クリックしてCSVを選択</p>
                    <p className="text-xs text-gray-400 mt-1">URL列（url, link, website等）が必要です</p>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
            </div>
            {csvUrls.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
                <strong>{csvUrls.length}件</strong>のURLを検出しました
              </div>
            )}
            {csvLoading && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>処理中...</span><span>{csvProgress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${csvProgress}%` }} />
                </div>
              </div>
            )}
            <button
              className="btn-primary disabled:opacity-40"
              onClick={handleCsvCollect}
              disabled={csvLoading || csvUrls.length === 0}
            >
              {csvLoading ? <><span className="animate-spin mr-2">⟳</span>並列処理中...</> : `🤖 ${csvUrls.length}件を一括処理`}
            </button>
            {csvResult && <ResultSummary result={csvResult} />}
          </div>
        )}

        {/* Google検索モード */}
        {mode === 'search' && (
          <div className="card space-y-4">
            <div>
              <label className="field-label">検索キーワード</label>
              <input
                type="text"
                className="input-field"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="例: 酸素カプセル 東京 体験"
                onKeyDown={(e) => e.key === 'Enter' && handleSearchCollect()}
              />
            </div>
            <div>
              <label className="field-label">取得件数</label>
              <div className="flex gap-2">
                {[5, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSearchNum(n)}
                    className={`flex-1 h-12 rounded-2xl text-sm font-medium transition-all ${searchNum === n ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    上位{n}件
                  </button>
                ))}
              </div>
            </div>
            <button
              className="btn-primary disabled:opacity-40"
              onClick={handleSearchCollect}
              disabled={searchLoading || !searchKeyword.trim()}
            >
              {searchLoading ? <><span className="animate-spin mr-2">⟳</span>検索・収集中...</> : '🔍 検索して自動収集'}
            </button>
            {searchResult && <ResultSummary result={searchResult} />}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function StatusBadge({ status }: { status: CollectLog['status'] }) {
  const map: Record<string, { label: string; className: string }> = {
    success: { label: '✅ 登録成功', className: 'bg-green-100 text-green-700' },
    error: { label: '❌ エラー', className: 'bg-red-100 text-red-600' },
    duplicate: { label: '🔁 重複', className: 'bg-yellow-100 text-yellow-700' },
    low_score: { label: '⚠️ スコア不足', className: 'bg-orange-100 text-orange-700' },
  };
  const { label, className } = map[status] ?? { label: '❌ エラー', className: 'bg-red-100 text-red-600' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${className}`}>{label}</span>;
}

function LogItem({ log }: { log: CollectLog }) {
  return (
    <div className={`p-3 rounded-xl border text-sm ${
      log.status === 'success' ? 'border-green-200 bg-green-50'
      : log.status === 'duplicate' ? 'border-yellow-200 bg-yellow-50'
      : log.status === 'low_score' ? 'border-orange-200 bg-orange-50'
      : 'border-red-200 bg-red-50'
    }`}>
      <div className="flex items-start gap-2">
        <StatusBadge status={log.status} />
        {log.score != null && <span className="text-xs text-gray-400">スコア: {log.score}</span>}
      </div>
      <p className="mt-1 text-gray-700">{log.message}</p>
      <p className="text-xs text-gray-400 mt-1 truncate">{log.url}</p>
      {log.store && <p className="text-xs text-gray-500 mt-1">🏪 {(log.store as Record<string, unknown>).name as string}</p>}
    </div>
  );
}

function ResultSummary({ result }: { result: CollectResult }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: '成功', value: result.success, color: 'green' },
          { label: '重複', value: result.duplicate, color: 'yellow' },
          { label: 'スコア不足', value: result.low_score, color: 'orange' },
          { label: 'エラー', value: result.error, color: 'red' },
        ].map((item) => (
          <div key={item.label} className={`rounded-xl p-2 text-center bg-${item.color}-50 border border-${item.color}-100`}>
            <p className="text-xl font-bold text-gray-800">{item.value}</p>
            <p className="text-xs text-gray-500">{item.label}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600 mb-2">処理ログ（{result.logs.length}件）</p>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {result.logs.map((log, i) => <LogItem key={i} log={log} />)}
        </div>
      </div>
    </div>
  );
}
