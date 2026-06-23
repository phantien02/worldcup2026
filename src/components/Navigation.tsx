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
    <header className="header flex flex-col md:flex-row justify-between items-center px-4 py-3 md:px-8 md:py-5 bg-[#09090c]/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/10">
      <Link href="/" className="logo mb-2 md:mb-0" style={{ whiteSpace: 'nowrap' }}>
        <span style={{ color: 'var(--success)' }}>WC 2026</span> <span style={{ color: 'var(--primary)', filter: 'brightness(1.5)' }}>PREDICTOR</span>
      </Link>
      <nav className="flex w-full md:w-auto justify-between md:justify-center items-center">

        {isAdminPage ? (
          <>
            <span style={{ fontWeight: 900, color: 'var(--danger)', padding: '0 0.5rem' }}>HỆ THỐNG ADMIN</span>
            {pathname !== '/admin/login' && (
              <button 
                onClick={async () => {
                  await fetch('/api/admin/logout', { method: 'POST' });
                  window.location.href = '/admin/login';
                }} 
                className="btn btn-secondary text-sm md:text-base px-3 py-1.5 md:px-5 md:py-2" 
                style={{ border: '1px solid rgba(255,255,255,0.2)' }}
              >
                🚪 Đăng Xuất
              </button>
            )}
          </>
        ) : user ? (
          <div className="flex items-center justify-between w-full md:w-auto md:gap-6">
            <div className="flex flex-col items-start md:items-end justify-center" style={{ lineHeight: '1.2' }}>
              <span className="font-bold text-[0.95rem] md:text-[1rem] text-white tracking-wide">
                {user.email === 'guest@wc2026.local' ? 'Khách Tham Quan' : (user.user_metadata?.display_name || user.email)}
              </span>
              {points !== null && (
                <span className="text-[0.85rem] md:text-[0.95rem] font-bold text-[var(--accent)]">
                  {points} điểm
                </span>
              )}
            </div>
            <button onClick={signOut} className="btn btn-danger text-[0.8rem] md:text-[1rem]" style={{ padding: '0.4rem 0.8rem', whiteSpace: 'nowrap' }}>ĐĂNG XUẤT</button>
          </div>
        ) : null}
      </nav>
    </header>
  );
}
