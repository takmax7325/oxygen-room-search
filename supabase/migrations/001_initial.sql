-- =====================================================
-- 酸素ルーム店舗データベース初期マイグレーション
-- =====================================================

-- stores テーブル
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  prefecture TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  machine_type TEXT,
  capacity INTEGER,
  price TEXT,
  normalized_price DOUBLE PRECISION,
  closed_days TEXT,
  website_url TEXT,
  description TEXT,
  image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- stats テーブル
CREATE TABLE IF NOT EXISTS stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avg_price_60min DOUBLE PRECISION,
  total_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 初期stats行を挿入
INSERT INTO stats (avg_price_60min, total_count)
VALUES (NULL, 0)
ON CONFLICT DO NOTHING;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_stores_prefecture ON stores(prefecture);
CREATE INDEX IF NOT EXISTS idx_stores_is_published ON stores(is_published);
CREATE INDEX IF NOT EXISTS idx_stores_priority ON stores(priority DESC);
CREATE INDEX IF NOT EXISTS idx_stores_score ON stores(score DESC);
CREATE INDEX IF NOT EXISTS idx_stores_normalized_price ON stores(normalized_price);
CREATE INDEX IF NOT EXISTS idx_stores_lat_lng ON stores(lat, lng);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS (Row Level Security) 設定
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;

-- 公開データは誰でも読める
CREATE POLICY "Public stores are viewable by everyone"
  ON stores FOR SELECT
  USING (is_published = true);

-- statsは誰でも読める
CREATE POLICY "Stats are viewable by everyone"
  ON stats FOR SELECT
  USING (true);

-- Service role は全操作可能 (RLSバイパスはservice_roleで自動適用)
-- 管理操作はサーバーサイドのservice_role keyで実行

-- =====================================================
-- 平均価格を更新するファンクション
-- =====================================================
CREATE OR REPLACE FUNCTION update_avg_price()
RETURNS void AS $$
DECLARE
  avg_price DOUBLE PRECISION;
  store_count INTEGER;
BEGIN
  SELECT
    AVG(normalized_price),
    COUNT(*)
  INTO avg_price, store_count
  FROM stores
  WHERE
    is_published = true
    AND normalized_price IS NOT NULL
    AND normalized_price > 0;

  -- 100件以上の場合のみ平均を記録
  IF store_count >= 100 THEN
    UPDATE stats
    SET
      avg_price_60min = avg_price,
      total_count = store_count,
      updated_at = NOW();
  ELSE
    UPDATE stats
    SET
      avg_price_60min = NULL,
      total_count = store_count,
      updated_at = NOW();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
