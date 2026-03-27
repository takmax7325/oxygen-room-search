'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PREFECTURES } from '@/types/store';
import { normalizePrice } from '@/lib/normalize';

function getAdminPw(): string {
  return typeof window !== 'undefined'
    ? sessionStorage.getItem('admin_pw') || ''
    : '';
}

const MACHINE_TYPES = ['SS', 'S', 'M', 'L', 'スクエア', '特注'];

const DEFAULT_FORM = {
  name: '',
  prefecture: '',
  address: '',
  postal_code: '',
  price: '',
  closed_days: '',
  website_url: '',
  description: '',
  machine_type: '',
  image_url: '',
  is_published: false,
};

export default function NewStorePage() {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [postalLoading, setPostalLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fetchUrl, setFetchUrl] = useState('');
  const [fetchedImages, setFetchedImages] = useState<string[]>([]);
  const [imageLoading, setImageLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  };

  const handlePostalCode = async (value: string) => {
    const digits = value.replace(/[^0-9]/g, '');
    setForm((prev) => ({ ...prev, postal_code: digits }));
    if (digits.length !== 7) return;
    setPostalLoading(true);
    try {
      const res = await fetch(
        `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`
      );
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const r = data.results[0];
        setForm((prev) => ({
          ...prev,
          prefecture: r.address1,
          address: `${r.address2}${r.address3}`,
        }));
      }
    } catch {
      // ignore
    } finally {
      setPostalLoading(false);
    }
  };

  const handleFetchImages = async () => {
    const url = fetchUrl || form.website_url;
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
    if (!form.name.trim()) {
      setError('店舗名は必須です');
      return;
    }
    setSaving(true);
    setError('');

    const normalized_price = form.price ? normalizePrice(form.price) : null;

    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': getAdminPw(),
        },
        body: JSON.stringify({
          ...form,
          postal_code: form.postal_code || null,
          image_url: form.image_url || null,
          normalized_price,
          score: 100,
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

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/stores"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-gray-800">店舗を追加</h1>
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
            value={form.name}
            onChange={handleChange}
            placeholder="例: 酸素ルームヘルス渋谷"
            required
          />
        </Field>

        <Field label="郵便番号">
          <div className="flex items-center gap-2">
            <input
              className="input-field"
              value={form.postal_code}
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
              value={form.prefecture}
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
            value={form.address}
            onChange={handleChange}
            placeholder="例: 東京都渋谷区道玄坂1-1-1"
          />
        </Field>

        <Field label="料金">
          <input
            name="price"
            className="input-field"
            value={form.price}
            onChange={handleChange}
            placeholder="例: 60分2,200円"
          />
          {form.price && (
            <p className="text-xs text-gray-400 mt-1">
              60分換算:{' '}
              {normalizePrice(form.price)
                ? `¥${normalizePrice(form.price)!.toLocaleString()}`
                : '計算不可'}
            </p>
          )}
        </Field>

        <Field label="定休日">
          <input
            name="closed_days"
            className="input-field"
            value={form.closed_days}
            onChange={handleChange}
            placeholder="例: 毎週火曜日・水曜日"
          />
        </Field>

        <Field label="公式サイトURL">
          <input
            name="website_url"
            type="url"
            className="input-field"
            value={form.website_url}
            onChange={handleChange}
            placeholder="https://"
          />
        </Field>

        <Field label="機器タイプ">
          <div className="relative">
            <select
              name="machine_type"
              className="select-field pr-10"
              value={form.machine_type}
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
            value={form.description}
            onChange={handleChange}
            placeholder="施設の特徴や説明..."
          />
        </Field>

        {/* 画像セクション */}
        <Field label="画像">
          {form.image_url && (
            <div className="mb-3 relative w-full h-40 rounded-xl overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.image_url}
                alt="選択中の画像"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, image_url: '' }))}
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
              placeholder={form.website_url || 'https://（画像を取得したいURL）'}
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
                  onClick={() => setForm((prev) => ({ ...prev, image_url: img }))}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    form.image_url === img
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
            value={form.image_url}
            onChange={handleChange}
            placeholder="または画像URLを直接入力"
          />
        </Field>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                is_published: !prev.is_published,
              }))
            }
            className={`w-12 h-6 rounded-full transition-all relative ${
              form.is_published ? 'bg-primary' : 'bg-gray-200'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                form.is_published ? 'left-6' : 'left-0.5'
              }`}
            />
          </button>
          <span className="text-sm text-gray-600">
            {form.is_published ? '公開する' : '下書き（非公開）'}
          </span>
        </div>

        <button
          type="submit"
          className="btn-primary disabled:opacity-40"
          disabled={saving}
        >
          {saving ? '保存中...' : '店舗を追加'}
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
