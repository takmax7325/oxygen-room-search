import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '酸素ルーム検索 | O2Room Finder',
  description: '日本全国の酸素ルーム・酸素カプセル設置店舗を検索できます',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '酸素ルーム検索',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    title: '酸素ルーム検索 | O2Room Finder',
    description: '日本全国の酸素ルーム・酸素カプセル設置店舗を検索できます',
  },
};

export const viewport: Viewport = {
  themeColor: '#7EC8E3',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                // 開発環境では古いキャッシュによる誤動作を防ぐためSWを登録しない
                if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js');
                  });
                } else {
                  // 開発環境: 既存のSWをすべてアンレジスター
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    regs.forEach(function(reg) { reg.unregister(); });
                  });
                }
              }
            `,
          }}
        />
      </head>
      <body className="bg-[#F9FAFB] min-h-screen">
        {children}
      </body>
    </html>
  );
}
