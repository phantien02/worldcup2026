import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import Navigation from '@/components/Navigation';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'Cháy cùng World Cup 2026 - Phòng Mạng Lõi',
  description: 'Cháy cùng World Cup 2026 - Thử tài dự đoán của Phòng Mạng Lõi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>
          <Navigation />

          <main className="container animate-fade-in">
            {children}
          </main>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
