import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { Toaster } from 'react-hot-toast';
import Navigation from '@/components/Navigation';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import BackgroundChanger from '@/components/BackgroundChanger';
import BackgroundMusic from '@/components/BackgroundMusic';

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
      <body className="antialiased">
        <div id="portal-root"></div>
        <BackgroundChanger />
        <AuthProvider>
          <BackgroundMusic />
          <Navigation />

          <main className="container animate-fade-in">
            {children}
          </main>
        </AuthProvider>
        <Toaster position="top-right" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
