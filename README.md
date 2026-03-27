# 酸素ルーム店舗検索システム 🫧

日本全国の酸素ルーム・酸素カプセル設置店舗を検索できるPWA。
AIによる自動データ収集・重複判定・精度管理を内蔵。

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 14 (App Router) |
| 言語 | TypeScript |
| スタイリング | TailwindCSS |
| DB / Auth | Supabase |
| AI | OpenAI GPT-4o-mini |
| 地図 | Google Maps Geocoding API |
| 検索 | SerpAPI |
| CSV | PapaParse |
| デプロイ | Vercel |

---

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone <your-repo>
cd oxygen-room-search
npm install
```

### 2. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集して各APIキーを設定:

```env
# Supabase（必須）
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# OpenAI（必須）
OPENAI_API_KEY=sk-...

# Google Maps（任意 - 住所→座標変換）
GOOGLE_MAPS_API_KEY=AIza...

# SerpAPI（任意 - Google検索収集）
SERPAPI_KEY=...

# 管理パスワード（必須）
ADMIN_PASSWORD=your-secure-password
```

### 3. Supabaseデータベースの設定

Supabaseダッシュボード → SQL Editor で以下を実行:

```sql
-- supabase/migrations/001_initial.sql の内容をコピペ
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアクセス

---

## Vercelへのデプロイ

### 1. Vercel CLIでデプロイ

```bash
npm i -g vercel
vercel
```

### 2. 環境変数を設定

Vercelダッシュボード → Settings → Environment Variables で
`.env.local.example` の全項目を設定

### 3. ビルド設定

Vercelは自動的に以下を検出します:
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`

---

## ディレクトリ構成

```
oxygen-room-search/
├── app/
│   ├── layout.tsx              # ルートレイアウト（PWA設定含む）
│   ├── page.tsx                # トップページ（検索）
│   ├── globals.css             # グローバルスタイル
│   ├── stores/
│   │   ├── page.tsx            # 店舗一覧
│   │   └── [id]/page.tsx       # 店舗詳細
│   ├── admin/
│   │   ├── layout.tsx          # 管理画面レイアウト（認証）
│   │   ├── page.tsx            # ダッシュボード
│   │   ├── stores/
│   │   │   ├── page.tsx        # 店舗管理
│   │   │   ├── new/page.tsx    # 店舗追加
│   │   │   └── [id]/edit/page.tsx  # 店舗編集
│   │   └── collect/page.tsx    # AIデータ収集
│   └── api/
│       ├── stores/route.ts         # GET/POST /api/stores
│       ├── stores/[id]/route.ts    # GET/PUT/DELETE /api/stores/[id]
│       ├── stats/route.ts          # 平均価格統計
│       └── collect/
│           ├── url/route.ts        # URL単体収集
│           ├── csv/route.ts        # CSV一括収集
│           └── search/route.ts     # Google検索収集
├── components/
│   └── StoreCard.tsx           # 店舗カードコンポーネント
├── lib/
│   ├── supabase.ts             # Supabase クライアント
│   ├── supabase-server.ts      # Supabase サーバーサイド
│   ├── openai.ts               # AI抽出・検証・重複判定
│   ├── geocoding.ts            # Google Maps Geocoding
│   ├── serpapi.ts              # SerpAPI検索・HTML取得
│   ├── distance.ts             # ハーサイン距離計算
│   ├── normalize.ts            # 価格・住所正規化
│   └── scoring.ts              # データ品質スコアリング
├── types/
│   └── store.ts                # TypeScript型定義
├── public/
│   ├── manifest.json           # PWAマニフェスト
│   ├── sw.js                   # Service Worker
│   └── icons/                  # アプリアイコン
└── supabase/
    └── migrations/
        └── 001_initial.sql     # DBスキーマ
```

---

## 機能一覧

### ユーザー機能
- 都道府県からの店舗検索
- 現在地から近い順にソート（Geolocation API）
- 価格の安い順ソート（60分換算）
- おすすめ順ソート（priority + score）
- 店舗詳細表示・Google Mapリンク
- 全国平均価格表示（100件以上で表示）
- PWA対応（ホーム画面追加・オフライン対応）

### 管理機能
- 店舗の追加 / 編集 / 削除
- 公開 / 非公開の切り替え
- Priority設定
- ダッシュボード（統計・品質スコア分布）

### AIデータ収集
- URL単体から自動抽出
- CSV一括処理（並列5件）
- Google検索キーワードから自動収集
- 重複判定（信頼度80%以上で重複扱い）
- データ品質スコアリング（70点以上のみ登録）
- 処理ログ・成功/失敗数表示

---

## スコアリングロジック

| 項目 | 点数 | 条件 |
|------|------|------|
| 店舗名 | +20 | 2文字以上 |
| 住所 | +30 | 5文字以上 |
| 価格 | +10 | 2文字以上 |
| AI検証 | +30 | 住所整合性・店舗名チェック通過 |
| **合計** | 70点以上 | **登録可能** |

---

## 価格正規化ロジック

```
"30分1,500円" → 60分換算 = 3,000円
"60分2,000円" → 60分換算 = 2,000円
"1時間3,000円" → 60分換算 = 3,000円
```

除外条件:
- 回数券を含む価格
- 範囲価格（「〜」を含む）
- 不明・要問合せ

---

## PWA設定

- `public/manifest.json`: アプリ名・アイコン・テーマカラー設定
- `public/sw.js`: Service Worker（Cache First戦略）
- APIはネットワーク優先（オフライン時503を返す）
- ホーム画面ショートカット（東京・大阪）

---

## セキュリティ

- APIキーはサーバーサイドのみ（`NEXT_PUBLIC_`なし）
- 管理APIは`x-admin-password`ヘッダーで認証
- Supabase RLS（公開データのみ読み取り可能）
- Service Role Keyはサーバーサイドのみ使用

---

## アイコンの作成

`public/icons/` にPNG形式のアイコンを配置:
- `icon-192.png`: 192x192px
- `icon-512.png`: 512x512px

Figma・Canva等で作成するか、オンラインツールを使用してください。

---

## ライセンス

MIT
