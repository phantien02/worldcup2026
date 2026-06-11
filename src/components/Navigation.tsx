"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Navigation() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin');
  const [points, setPoints] = useState<number | null>(null);

  useEffect(() => {
    if (user && !isAdminPage) {
      if (user.email === 'guest@wc2026.local') {
        setPoints(999);
      } else {
        supabase
          .from('profiles')
          .select('total_points')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data) setPoints(data.total_points);
          });
      }
    }
  }, [user, isAdminPage]);

  return (
    <header className="header">
      <Link href="/" className="logo" style={{ whiteSpace: 'nowrap' }}>
        <span style={{ color: 'var(--success)' }}>WC 2026</span> <span style={{ color: 'var(--primary)', filter: 'brightness(1.5)' }}>PREDICTOR</span>
      </Link>
      <nav className="flex flex-wrap justify-center gap-2 md:gap-4 items-center">

        {isAdminPage ? (
          <>
            <span style={{ fontWeight: 900, color: 'var(--danger)', padding: '0 0.5rem' }}>HỆ THỐNG ADMIN</span>
            {pathname !== '/admin/login' && (
              <button 
                onClick={async () => {
                  await fetch('/api/admin/logout', { method: 'POST' });
                  window.location.href = '/admin/login';
                }} 
                className="btn btn-secondary" 
                style={{ border: '1px solid rgba(255,255,255,0.2)' }}
              >
                🚪 Đăng Xuất
              </button>
            )}
          </>
        ) : user ? (
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex flex-col items-end justify-center" style={{ lineHeight: '1.2' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', letterSpacing: '0.5px' }}>
                {user.email === 'guest@wc2026.local' ? 'Khách Tham Quan' : (user.user_metadata?.display_name || user.email)}
              </span>
              {points !== null && (
                <span style={{ fontSize: '0.95rem', color: 'var(--accent)', fontWeight: 'bold' }}>
                  {points} điểm
                </span>
              )}
            </div>
            <button onClick={signOut} className="btn btn-danger" style={{ padding: '0.5rem 1.2rem', whiteSpace: 'nowrap' }}>ĐĂNG XUẤT</button>
          </div>
        ) : (
          <Link href="/login" className="btn btn-primary">Đăng nhập</Link>
        )}
      </nav>
    </header>
  );
}
