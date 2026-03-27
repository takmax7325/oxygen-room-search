import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: 'メッセージが空です' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI設定が完了していません' }, { status: 500 });
    }

    const systemPrompt = `あなたは酸素ルーム・酸素カプセルの専門アドバイザーです。
ユーザーの質問に対して、酸素ルームに関する情報・効果・利用方法・料金の目安などを
分かりやすく日本語で回答してください。
回答は200文字以内にまとめ、親しみやすいトーンで話してください。`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 400,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Groq API エラー (${res.status}): ${body}`);
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content ?? '回答を取得できませんでした';

    return NextResponse.json({ reply });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '不明なエラー';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
