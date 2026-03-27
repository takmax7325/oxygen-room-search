// 酸素ルーム検索 Service Worker
const CACHE_NAME = 'o2room-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// インストール時 — 静的アセットをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // キャッシュ失敗は無視（オフライン対応は後から）
      });
    })
  );
  self.skipWaiting();
});

// アクティベート時 — 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// フェッチ時 — Cache First（静的）/ Network First（API）
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // APIリクエストはネットワーク優先
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 成功したAPIレスポンスはキャッシュしない
          return response;
        })
        .catch(() => {
          // オフライン時はエラーをそのまま返す
          return new Response(
            JSON.stringify({ error: 'Network unavailable' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        })
    );
    return;
  }

  // 静的アセット — Cache First
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // GETリクエストのみキャッシュ
          if (
            request.method === 'GET' &&
            response.status === 200 &&
            !url.pathname.startsWith('/admin')
          ) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // オフラインフォールバック
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('', { status: 503 });
        });
    })
  );
});

// バックグラウンド同期（将来の拡張用）
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-stores') {
    event.waitUntil(syncStores());
  }
});

async function syncStores() {
  // バックグラウンドでデータを更新（将来実装）
}
