'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  {
    href: '/',
    label: 'ホーム',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-primary' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    exact: true,
  },
  {
    href: '/stores',
    label: '店舗一覧',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-primary' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    exact: false,
  },
];

export default function BottomNav({ prefecture }: { prefecture?: string }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-50">
      {NAV_ITEMS.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const href = item.href === '/stores' && prefecture
          ? `/stores?prefecture=${encodeURIComponent(prefecture)}`
          : item.href;

        return (
          <Link
            key={item.href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1"
          >
            {item.icon(isActive)}
            <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-gray-400'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
