'use client';

import { useState, useRef, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

const SUGGESTIONS = [
  '酸素ルームの効果は？',
  '初めて利用する際の注意点は？',
  '1回の利用時間はどのくらいがおすすめ？',
  '肩こりや疲労回復に効果はある？',
];

export default function AiPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: '酸素ルームについて何でも聞いてください！効果・料金・利用方法など、お気軽にどうぞ😊' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg = text.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: data.reply || data.error || '回答を取得できませんでした' },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: 'エラーが発生しました。もう一度お試しください。' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col pb-16">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3">
        <div className="max-w-[950px] mx-auto">
          <h1 className="font-bold text-gray-800 text-base">AI相談</h1>
          <p className="text-xs text-gray-400">酸素ルームのことを何でも聞いてみよう</p>
        </div>
      </header>

      {/* チャット */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-[950px] mx-auto space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                  <span className="text-sm">🫧</span>
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-tr-sm'
                    : 'bg-white text-gray-700 shadow-sm rounded-tl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-2 flex-shrink-0">
                <span className="text-sm">🫧</span>
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* サジェスト */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <div className="max-w-[950px] mx-auto flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-3 py-2 bg-white border border-gray-200 rounded-full text-gray-600 hover:border-primary hover:text-primary transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 入力欄 */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 mb-16">
        <div className="max-w-[950px] mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="質問を入力..."
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:border-primary"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40 transition-opacity flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
