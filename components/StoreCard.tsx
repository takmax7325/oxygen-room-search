'use client';

import Link from 'next/link';
import { Store } from '@/types/store';
import { formatDistance } from '@/lib/distance';

interface StoreCardProps {
  store: Store & { distance?: number };
}

export default function StoreCard({ store }: StoreCardProps) {
  return (
    <Link href={`/stores/${store.id}`} className="block">
      <div className="card hover:shadow-card-hover transition-all duration-200 active:scale-[0.99]">
        <div className="flex items-start gap-3">
          {/* アイコン */}
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl">
            🫧
          </div>

          {/* 情報 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-800 text-sm leading-snug">
                {store.name}
              </h3>
              {store.distance != null && (
                <span className="flex-shrink-0 text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                  {formatDistance(store.distance)}
                </span>
              )}
            </div>

            {store.address && (
              <p className="text-xs text-gray-400 mt-1 truncate">
                📍 {store.address}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {store.price && (
                <span className="badge-accent">
                  💰 {store.price}
                </span>
              )}
              {store.normalized_price && (
                <span className="badge-primary">
                  60分 ¥{Math.round(store.normalized_price).toLocaleString()}
                </span>
              )}
              {store.closed_days && (
                <span className="badge-gray text-xs">
                  定休: {store.closed_days}
                </span>
              )}
            </div>
          </div>

          {/* 矢印 */}
          <div className="flex-shrink-0 text-gray-300 self-center">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
