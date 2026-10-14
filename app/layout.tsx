import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';
import './globals.css';

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'فصلي — منصة الأستاذ والتلاميذ',
  description: 'منصة تعليمية مجانية لإدارة الأقسام والواجبات والتصحيح.',
};

export const viewport: Viewport = {
  themeColor: '#F5F5F7',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={arabic.variable}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
