'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Store } from '@/types/store';
import { PREFECTURES } from '@/types/store';
import { normalizePrice } from '@/lib/normalize';

function getAdminPw(): string {
  return typeof window !== 'undefined'
    ? sessionStorage.getItem('admin_pw') || ''
    : '';
}

const MACHINE_TYPES = ['SS', 'S', 'M', 'L', 'スクエア', '特注'];

export default function EditStorePage() {
  const params = useParams();
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [postalLoading, setPostalLoading] = useState(false);
  const [fetchUrl, setFetchUrl] = useState('');
  const [fetchedImages, setFetchedImages] = useState<string[]>([]);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/stores/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.store) setStore(data.store);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setStore((prev) =>
      prev
        ? {
            ...prev,
            [name]:
              type === 'checkbox'
                ? (e.target as HTMLInputElement).checked
                : value,
          }
        : null
    );
  };

  const handlePostalCode = async (value: string) => {
    const digits = value.replace(/[^0-9]/g, '');
    setStore((prev) => (prev ? { ...prev, postal_code: digits } : null));
    if (digits.length !== 7) return;
    setPostalLoading(true);
    try {
      const res = await fetch(
        `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`
      );
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const r = data.results[0];
        setStore((prev) =>
          prev
            ? {
                ...prev,
                prefecture: r.address1,
                address: `${r.address2}${r.address3}`,
              }
            : null
        );
      }
    } catch {
      // ignore
    } finally {
      setPostalLoading(false);
    }
  };

  const handleFetchImages = async () => {
    const url = fetchUrl || store?.website_url || '';
    if (!url) return;
    setImageLoading(true);
    setFetchedImages([]);
    try {
      const res = await fetch(
        `/api/fetch-images?url=${encodeURIComponent(url)}`
      );
      const data = await res.json();
      setFetchedImages(data.images || []);
    } catch {
      // ignore
    } finally {
      setImageLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    setSaving(true);
    setError('');

    const normalized_price = store.price ? normalizePrice(store.price) : null;

    try {
      const res = await fetch(`/api/stores/${store.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': getAdminPw(),
        },
        body: JSON.stringify({
          ...store,
          normalized_price,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '保存に失敗しました');
      }

      router.push('/admin/stores');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
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
      <div className="flex items-center gap-3">
        <Link
          href="/admin/stores"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-gray-800">店舗を編集</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}

        <Field label="店舗名 *">
          <input
            name="name"
            className="input-field"
            value={store.name}
            onChange={handleChange}
            required
          />
        </Field>

        <Field label="郵便番号">
          <div className="flex items-center gap-2">
            <input
              className="input-field"
              value={store.postal_code || ''}
              onChange={(e) => handlePostalCode(e.target.value)}
              placeholder="例: 1500043（ハイフンなし）"
              maxLength={7}
              inputMode="numeric"
            />
            {postalLoading && (
              <span className="text-xs text-gray-400 whitespace-nowrap">検索中...</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            7桁入力で都道府県・住所を自動入力
          </p>
        </Field>

        <Field label="都道府県">
          <div className="relative">
            <select
              name="prefecture"
              className="select-field pr-10"
              value={store.prefecture || ''}
              onChange={handleChange}
            >
              <option value="">-- 選択 --</option>
              {PREFECTURES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <span className="text-gray-400">▼</span>
            </div>
          </div>
        </Field>

        <Field label="住所">
          <input
            name="address"
            className="input-field"
            value={store.address || ''}
            onChange={handleChange}
          />
        </Field>

        <Field label="料金">
          <input
            name="price"
            className="input-field"
            value={store.price || ''}
            onChange={handleChange}
            placeholder="例: 60分2,200円"
          />
          {store.price && (
            <p className="text-xs text-gray-400 mt-1">
              60分換算:{' '}
              {normalizePrice(store.price)
                ? `¥${normalizePrice(store.price)!.toLocaleString()}`
                : '計算不可'}
            </p>
          )}
        </Field>

        <Field label="定休日">
          <input
            name="closed_days"
            className="input-field"
            value={store.closed_days || ''}
            onChange={handleChange}
          />
        </Field>

        <Field label="公式サイトURL">
          <input
            name="website_url"
            type="url"
            className="input-field"
            value={store.website_url || ''}
            onChange={handleChange}
          />
        </Field>

        <Field label="機器タイプ">
          <div className="relative">
            <select
              name="machine_type"
              className="select-field pr-10"
              value={store.machine_type || ''}
              onChange={handleChange}
            >
              <option value="">-- 選択 --</option>
              {MACHINE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <span className="text-gray-400">▼</span>
            </div>
          </div>
        </Field>

        <Field label="説明">
          <textarea
            name="description"
            className="input-field h-24 py-3 resize-none"
            value={store.description || ''}
            onChange={handleChange}
          />
        </Field>

        {/* 画像セクション */}
        <Field label="画像">
          {store.image_url && (
            <div className="mb-3 relative w-full h-40 rounded-xl overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={store.image_url}
                alt="選択中の画像"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setStore((prev) => prev ? { ...prev, image_url: null } : null)}
                className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full text-sm flex items-center justify-center hover:bg-black/70"
              >
                ✕
              </button>
            </div>
          )}

          {/* URLから取得 */}
          <div className="flex gap-2 mb-2">
            <input
              className="input-field flex-1 text-sm"
              value={fetchUrl}
              onChange={(e) => setFetchUrl(e.target.value)}
              placeholder={store.website_url || 'https://（画像を取得したいURL）'}
            />
            <button
              type="button"
              onClick={handleFetchImages}
              disabled={imageLoading}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium whitespace-nowrap disabled:opacity-50 transition-colors"
            >
              {imageLoading ? '取得中...' : '画像を取得'}
            </button>
          </div>

          {fetchedImages.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-2">
              {fetchedImages.map((img) => (
                <button
                  key={img}
                  type="button"
                  onClick={() =>
                    setStore((prev) => (prev ? { ...prev, image_url: img } : null))
                  }
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    store.image_url === img
                      ? 'border-primary shadow-md scale-95'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).parentElement!.style.display = 'none';
                    }}
                  />
                </button>
              ))}
            </div>
          )}

          <input
            name="image_url"
            className="input-field text-sm"
            value={store.image_url || ''}
            onChange={handleChange}
            placeholder="または画像URLを直接入力"
          />
        </Field>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setStore((prev) =>
                prev ? { ...prev, is_published: !prev.is_published } : null
              )
            }
            className={`w-12 h-6 rounded-full transition-all relative ${
              store.is_published ? 'bg-primary' : 'bg-gray-200'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                store.is_published ? 'left-6' : 'left-0.5'
              }`}
            />
          </button>
          <span className="text-sm text-gray-600">
            {store.is_published ? '公開中' : '非公開（下書き）'}
          </span>
        </div>

        <button
          type="submit"
          className="btn-primary disabled:opacity-40"
          disabled={saving}
        >
          {saving ? '保存中...' : '変更を保存'}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
