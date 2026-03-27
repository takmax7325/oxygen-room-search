/**
 * HTMLから店舗情報を抽出するモジュール
 * Groq API（無料枠）を使用 - llama-3.3-70b-versatile
 */

import { ExtractedStore, DuplicateCheckResult } from '@/types/store';
import { Store } from '@/types/store';

// ---- Groq API 呼び出し ----

async function callGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GROQ_API_KEY が設定されていません。.env.local に GROQ_API_KEY を追加してサーバーを再起動してください。'
    );
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 800,
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq API エラー (${res.status}): ${body}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq API から空のレスポンスが返されました');
  return text;
}

// ---- 店舗情報の抽出 ----

const EXTRACT_PROMPT = (text: string) => `あなたは日本の酸素ルーム・酸素カプセル施設情報を抽出する専門家です。
以下のWebページテキストから施設情報を抽出し、JSONのみを返してください。

ルール：
- 推測・補完は禁止。テキストに明示されている情報のみ抽出すること
- 情報がない場合は必ず空文字 "" を返す
- prefectureは都道府県名のみ（例: "東京都", "大阪府"）
- descriptionは200文字以内
- 出力はJSONのみ、説明文・コードブロック不要

出力形式:
{"name":"施設名","address":"市区町村以降の住所","prefecture":"都道府県名","price":"価格情報","closed_days":"定休日","description":"施設説明"}

Webページテキスト:
${text}`;

export async function extractStoreFromHtml(html: string): Promise<ExtractedStore> {
  const text = cleanText(html).slice(0, 5000);
  const raw = await callGroq(EXTRACT_PROMPT(text));

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Groq のレスポンスからJSONを取得できませんでした');
  }

  const parsed = JSON.parse(jsonMatch[0]) as ExtractedStore;
  return {
    name: parsed.name || '',
    address: parsed.address || '',
    prefecture: parsed.prefecture || '',
    price: parsed.price || '',
    closed_days: parsed.closed_days || '',
    description: parsed.description || '',
  };
}

// ---- バリデーション ----

export async function validateStore(
  store: Partial<ExtractedStore>
): Promise<{ is_valid: boolean; reason: string }> {
  if (!store.name) {
    return { is_valid: false, reason: '店舗名が取得できませんでした' };
  }
  return { is_valid: true, reason: 'OK' };
}

// ---- 重複チェック ----

export async function checkDuplicate(
  newStore: Partial<ExtractedStore & { lat?: number; lng?: number }>,
  existingStores: Array<Pick<Store, 'id' | 'name' | 'address' | 'lat' | 'lng'>>
): Promise<DuplicateCheckResult> {
  if (existingStores.length === 0) {
    return { is_duplicate: false, confidence: 0 };
  }

  for (const existing of existingStores) {
    const nameSimilar =
      newStore.name && existing.name && areSimilar(newStore.name, existing.name);
    const addressSimilar =
      newStore.address && existing.address && areSimilar(newStore.address, existing.address);

    if (nameSimilar && addressSimilar) {
      return { is_duplicate: true, confidence: 95, matched_store_id: existing.id };
    }
    if (nameSimilar || addressSimilar) {
      return { is_duplicate: true, confidence: 75, matched_store_id: existing.id };
    }
  }

  return { is_duplicate: false, confidence: 0 };
}

// ---- ユーティリティ ----

function areSimilar(a: string, b: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[\s　・\-_]/g, '').replace(/[ァ-ン]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0x60)
    );
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  let matches = 0;
  for (const char of shorter) {
    if (longer.includes(char)) matches++;
  }
  return shorter.length > 0 && matches / shorter.length > 0.7;
}

export function cleanText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
