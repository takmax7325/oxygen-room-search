import { ExtractedStore } from '@/types/store';

export interface ScoreResult {
  score: number;
  breakdown: {
    name: number;
    address: number;
    price: number;
    validation: number;
  };
}

/**
 * 抽出データのスコアリング
 * - name: +20
 * - address: +30
 * - price: +10
 * - validation: +30
 * 合計70以上のみ登録
 */
export function scoreStore(
  extracted: ExtractedStore,
  validationPassed: boolean
): ScoreResult {
  const breakdown = {
    name: 0,
    address: 0,
    price: 0,
    validation: 0,
  };

  // 店名チェック (+20)
  if (extracted.name && extracted.name.trim().length >= 2) {
    breakdown.name = 20;
  }

  // 住所チェック (+30)
  if (extracted.address && extracted.address.trim().length >= 5) {
    breakdown.address = 30;
  }

  // 価格チェック (+10)
  if (extracted.price && extracted.price.trim().length >= 2) {
    breakdown.price = 10;
  }

  // バリデーション (+30)
  if (validationPassed) {
    breakdown.validation = 30;
  }

  const score =
    breakdown.name +
    breakdown.address +
    breakdown.price +
    breakdown.validation;

  return { score, breakdown };
}

export const MIN_SCORE = 70;
