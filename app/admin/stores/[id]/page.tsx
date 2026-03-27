'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Store } from '@/types/store';

function getAdminPw(): string {
  return typeof window !== 'undefined'
    ? sessionStorage.getItem('admin_pw') || ''
    : '';
}

export default function AdminStoreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  // 画像取得
  const [images, setImages] = useState<string[]>([]);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState('');
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/stores/${params.id}`, {
      headers: { 'x-admin-password': getAdminPw() },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.store) {
          setStore(data.store);
          setSelectedImg(data.store.image_url || null);
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const fetchImages = async () => {
    if (!store?.website_url) return;
    setImgLoading(true);
    setImgError('');
    setImages([]);
    try {
      const res = await fetch(
        `/api/fetch-images?url=${encodeURIComponent(store.website_url)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '取得失敗');
      setImages(data.images || []);
      if ((data.images || []).length === 0) setImgError('画像が見つかりませんでした');
    } catch (e) {
      setImgError(e instanceof Error ? e.message : '取得に失敗しました');
    } finally {
      setImgLoading(false);
    }
  };

  const saveImage = async (imgUrl: string | null) => {
    if (!store) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`/api/stores/${store.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': getAdminPw(),
        },
        body: JSON.stringify({ image_url: imgUrl }),
      });
      if (!res.ok) throw new Error('保存失敗');
      setSelectedImg(imgUrl);
      setStore((prev) => (prev ? { ...prev, image_url: imgUrl } : null));
      setSaveMsg('保存しました');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch {
      setSaveMsg('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const deleteStore = async () => {
    if (!store) return;
    if (!confirm(`「${store.name}」を削除しますか？`)) return;
    const res = await fetch(`/api/stores/${store.id}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': getAdminPw() },
    });
    if (res.ok) router.push('/admin/stores');
    else alert('削除に失敗しました');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-3xl animate-pulse-slow">🫧</div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">店舗が見つかりません</p>
        <Link href="/admin/stores" className="text-primary text-sm mt-2 block">
          一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/stores"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-gray-800 flex-1 truncate">
          {store.name}
        </h1>
        <Link
          href={`/admin/stores/${store.id}/edit`}
          className="text-xs text-primary font-medium px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
        >
          編集
        </Link>
        <button
          onClick={deleteStore}
          className="text-xs text-red-400 font-medium px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 transition-colors"
        >
          削除
        </button>
      </div>

      {/* 基本情報 */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {store.is_published ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
              公開中
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
              非公開
            </span>
          )}
          {store.machine_type && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {store.machine_type}
            </span>
          )}
          {store.prefecture && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {store.prefecture}
            </span>
          )}
        </div>

        {store.postal_code && (
          <Row label="郵便番号" value={`〒${store.postal_code}`} />
        )}
        {store.address && (
          <Row label="住所" value={store.address} />
        )}
        {store.price && (
          <Row label="料金" value={store.price} highlight />
        )}
        {store.closed_days && (
          <Row label="定休日" value={store.closed_days} />
        )}
        {store.website_url && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">公式サイト</p>
            <a
              href={store.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary truncate block hover:underline"
            >
              {store.website_url}
            </a>
          </div>
        )}
        {store.description && (
          <Row label="説明" value={store.description} />
        )}
      </div>

      {/* 画像セクション */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">サムネイル画像</h2>
          {saveMsg && (
            <span className={`text-xs ${saveMsg.includes('失敗') ? 'text-red-500' : 'text-green-600'}`}>
              {saveMsg}
            </span>
          )}
        </div>

        {/* 現在の画像 */}
        {selectedImg ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImg}
              alt={store.name}
              className="w-full h-48 object-cover rounded-xl"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <button
              onClick={() => saveImage(null)}
              disabled={saving}
              className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center text-xs hover:bg-black/70"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="w-full h-32 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 text-sm">
            画像未設定
          </div>
        )}

        {/* URLから取得ボタン */}
        {store.website_url && (
          <button
            onClick={fetchImages}
            disabled={imgLoading}
            className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 text-sm text-gray-600 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            {imgLoading ? '取得中...' : '🔍 サイトから画像を取得'}
          </button>
        )}
        {!store.website_url && (
          <p className="text-xs text-gray-400 text-center">
            公式サイトURLを設定すると画像を取得できます
          </p>
        )}

        {imgError && (
          <p className="text-xs text-red-500">{imgError}</p>
        )}

        {/* 画像グリッド */}
        {images.length > 0 && (
          <>
            <p className="text-xs text-gray-400">{images.length}件の画像が見つかりました。使用する画像を選んでください。</p>
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => saveImage(img)}
                  disabled={saving}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:opacity-80 ${
                    selectedImg === img
                      ? 'border-primary'
                      : 'border-transparent'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).parentElement!.style.display =
                        'none';
                    }}
                  />
                  {selectedImg === img && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <span className="text-white text-lg">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm ${highlight ? 'font-bold text-gray-800' : 'text-gray-700'}`}>
        {value}
      </p>
    </div>
  );
}
