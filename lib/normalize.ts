/**
 * 価格文字列から60分換算価格を算出する
 * 例: "30分1,500円" → 3000
 *     "60分2,000円" → 2000
 *     "1時間3,000円" → 3000
 *     "2,000円/60分" → 2000
 */
export function normalizePrice(priceStr: string): number | null {
  if (!priceStr) return null;

  // 除外条件: 回数券・不明・範囲価格
  const excludePatterns = [/回数券/,  /〜/, /不明/, /要問合/, /要相談/, /応相談/];
  for (const pattern of excludePatterns) {
    if (pattern.test(priceStr)) return null;
  }

  // 金額を抽出 (カンマ区切りを除去)
  const priceMatch = priceStr.replace(/,/g, '').match(/(\d+)/g);
  if (!priceMatch) return null;

  // 時間を抽出
  const minuteMatch = priceStr.match(/(\d+)\s*分/);
  const hourMatch = priceStr.match(/(\d+)\s*時間/);

  let minutes = 60; // デフォルト60分

  if (minuteMatch) {
    minutes = parseInt(minuteMatch[1], 10);
  } else if (hourMatch) {
    minutes = parseInt(hourMatch[1], 10) * 60;
  }

  // 最初の数値を価格として使用
  const price = parseInt(priceMatch[0], 10);

  // 不正な価格を除外 (100円未満 or 100,000円以上)
  if (price < 100 || price > 100000) return null;

  // 60分換算
  const normalized = Math.round((price / minutes) * 60);

  // 換算後も不正値チェック
  if (normalized < 100 || normalized > 50000) return null;

  return normalized;
}

/**
 * 住所フォーマットを統一する
 * 例: "東京都渋谷区〜" → そのまま
 *     "〒150-0001 東京都渋谷区〜" → "東京都渋谷区〜"
 */
export function normalizeAddress(address: string): string {
  if (!address) return '';

  // 郵便番号を除去
  let normalized = address.replace(/〒?\s*\d{3}-?\d{4}\s*/g, '');

  // 全角スペースを半角に
  normalized = normalized.replace(/　/g, ' ').trim();

  // 連続するスペースを1つに
  normalized = normalized.replace(/\s+/g, ' ');

  return normalized;
}

/**
 * 都道府県を住所から抽出する
 */
export function extractPrefecture(address: string): string {
  const PREFECTURES = [
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
    '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
    '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
    '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
  ];

  for (const pref of PREFECTURES) {
    if (address.includes(pref)) return pref;
  }
  return '';
}
