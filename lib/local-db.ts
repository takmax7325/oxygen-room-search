/**
 * ローカル開発用 JSON ファイルDB
 * Supabase が未設定の場合に自動的に使用されます。
 * データは .data/ ディレクトリに保存されます。
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Store, StoreStats } from '@/types/store';

const DATA_DIR = path.join(process.cwd(), '.data');
const STORES_FILE = path.join(DATA_DIR, 'stores.json');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStores(): Store[] {
  ensureDir();
  if (!fs.existsSync(STORES_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(STORES_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeStores(stores: Store[]) {
  ensureDir();
  fs.writeFileSync(STORES_FILE, JSON.stringify(stores, null, 2), 'utf-8');
}

function readStats(): StoreStats | null {
  ensureDir();
  if (!fs.existsSync(STATS_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function writeStats(stats: StoreStats) {
  ensureDir();
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');
}

// ---- 店舗 CRUD ----

export function localDb_getStores(opts?: {
  prefecture?: string;
  includeUnpublished?: boolean;
}): Store[] {
  let stores = readStores();
  if (!opts?.includeUnpublished) {
    stores = stores.filter((s) => s.is_published);
  }
  if (opts?.prefecture) {
    stores = stores.filter((s) => s.prefecture === opts.prefecture);
  }
  return stores
    .sort((a, b) => b.priority - a.priority || b.score - a.score);
}

export function localDb_getStore(id: string): Store | null {
  return readStores().find((s) => s.id === id) ?? null;
}

export function localDb_createStore(body: Partial<Store>): Store {
  const stores = readStores();
  const now = new Date().toISOString();
  const newStore: Store = {
    id: randomUUID(),
    name: body.name ?? '',
    prefecture: body.prefecture ?? null,
    address: body.address ?? null,
    postal_code: body.postal_code ?? null,
    lat: body.lat ?? null,
    lng: body.lng ?? null,
    machine_type: body.machine_type ?? null,
    capacity: body.capacity ?? null,
    price: body.price ?? null,
    normalized_price: body.normalized_price ?? null,
    closed_days: body.closed_days ?? null,
    website_url: body.website_url ?? null,
    description: body.description ?? null,
    image_url: body.image_url ?? null,
    is_published: body.is_published ?? false,
    priority: body.priority ?? 0,
    score: body.score ?? 100,
    created_at: now,
  };
  stores.push(newStore);
  writeStores(stores);
  return newStore;
}

export function localDb_updateStore(
  id: string,
  body: Partial<Store>
): Store | null {
  const stores = readStores();
  const idx = stores.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  stores[idx] = { ...stores[idx], ...body };
  writeStores(stores);
  return stores[idx];
}

export function localDb_deleteStore(id: string): boolean {
  const stores = readStores();
  const filtered = stores.filter((s) => s.id !== id);
  if (filtered.length === stores.length) return false;
  writeStores(filtered);
  return true;
}

// ---- 統計 ----

export function localDb_getStats(): StoreStats {
  const cached = readStats();
  if (cached) return cached;
  return localDb_recalcStats();
}

export function localDb_recalcStats(): StoreStats {
  const stores = readStores().filter((s) => s.is_published);
  const prices = stores
    .map((s) => s.normalized_price)
    .filter((p): p is number => p !== null);
  const avg =
    prices.length > 0
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : null;
  const stats: StoreStats = {
    id: '1',
    avg_price_60min: avg,
    total_count: stores.length,
    updated_at: new Date().toISOString(),
  };
  writeStats(stats);
  return stats;
}

// ---- Supabase 未設定チェック ----

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return (
    url.startsWith('https://') &&
    !url.includes('your-project') &&
    url.includes('.supabase.co')
  );
}
