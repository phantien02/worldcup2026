"use client";
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  
  const isAdminPage = pathname?.startsWith('/admin');

  return (
    <header className="header">
      <Link href="/" className="logo">
        <span style={{ color: 'var(--success)' }}>WC 2026</span> <span style={{ color: 'var(--primary)', filter: 'brightness(1.5)' }}>PREDICTOR</span>
      </Link>
      <nav className="flex gap-4 items-center">
        <Link href="/" className="btn btn-secondary">Trang chủ</Link>
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
          <>
            <span style={{ fontWeight: 600 }}>{user.user_metadata?.display_name || user.email}</span>
            <button onClick={signOut} className="btn btn-danger">Đăng xuất</button>
          </>
        ) : (
          <Link href="/login" className="btn btn-primary">Đăng nhập</Link>
        )}
      </nav>
    </header>
  );
}
