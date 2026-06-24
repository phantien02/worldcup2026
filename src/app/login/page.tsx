"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    let { error } = await supabase.auth.signInWithPassword({
      email: `${username.toLowerCase().trim()}@wc2026.local`,
      password,
    });

    // Fallback cho các tài khoản cũ được tạo lúc chưa có hàm toLowerCase
    if (error && error.message === 'Invalid login credentials') {
      const fallback = await supabase.auth.signInWithPassword({
        email: `${username.trim()}@wc2026.local`,
        password,
      });
      if (!fallback.error) {
        error = null;
      }
    }

    if (error) {
      if (error.message.includes('rate limit')) {
        setError('Hệ thống Supabase đang giới hạn (Rate limit). Vui lòng tắt "Confirm email" trong cài đặt Supabase.');
      } else if (error.message.includes('Email not confirmed')) {
        setError('Tài khoản chưa được kích hoạt. Hãy tắt "Confirm email" trong Supabase Auth và thử đăng ký lại tên khác.');
      } else if (error.message === 'Invalid login credentials') {
        setError('Tên đăng nhập hoặc mật khẩu không đúng');
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
      router.push('/');
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    const guestEmail = 'guest@wc2026.local';
    const guestPassword = 'Guest_Password_123!';

    let { error } = await supabase.auth.signInWithPassword({
      email: guestEmail,
      password: guestPassword,
    });

    if (error && error.message === 'Invalid login credentials') {
      try {
        const { registerUserAdmin } = await import('../register/actions');
        await registerUserAdmin('guest', guestPassword);
        
        const fallback = await supabase.auth.signInWithPassword({
          email: guestEmail,
          password: guestPassword,
        });
        if (fallback.error) throw fallback.error;
        error = null;
      } catch (err: any) {
        setError('Lỗi tạo tài khoản Khách: ' + err.message);
        setLoading(false);
        return;
      }
    }

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Vui lòng nhập tên đăng nhập của bạn.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { error } = await supabase
      .from('password_requests')
      .insert({ username: username.trim() });

    if (error) {
      setError('Lỗi gửi yêu cầu: ' + error.message);
    } else {
      setSuccess('Đã gửi yêu cầu cấp lại mật khẩu thành công! Vui lòng chờ Admin xử lý và liên hệ lại với bạn.');
      setUsername('');
    }
    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center" style={{ minHeight: '80vh' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <h2 className="text-center mb-6 logo" style={{ fontSize: '2rem' }}>
          {isForgotPassword ? 'Quên Mật Khẩu' : 'Đăng nhập'}
        </h2>
        
        {error && <div className="badge badge-danger mb-4 block text-center" style={{ padding: '0.75rem', fontSize: '1rem' }}>{error}</div>}
        {success && <div className="badge badge-success mb-4 block text-center" style={{ padding: '0.75rem', fontSize: '1rem' }}>{success}</div>}
        
        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
            <p className="text-center mb-2" style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Nhập tên đăng nhập của bạn. Quản trị viên (Admin) sẽ đặt lại mật khẩu và cấp lại cho bạn.
            </p>
            <div className="flex flex-col gap-2">
              <label>Tên đăng nhập</label>
              <input 
                type="text" 
                required 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Nhập tên của bạn"
              />
            </div>
            
            <button type="submit" className="btn btn-warning mt-2" disabled={loading} style={{ background: 'var(--warning)', color: '#000' }}>
              {loading ? 'Đang gửi...' : 'GỬI YÊU CẦU'}
            </button>
            
            <button type="button" onClick={() => { setIsForgotPassword(false); setError(null); setSuccess(null); }} className="btn btn-secondary mt-2">
              Quay lại đăng nhập
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label>Tên đăng nhập</label>
              <input 
                id="username"
                name="username"
                type="text" 
                required 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Nhập tên của bạn"
                autoComplete="username"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label>Mật khẩu</label>
                <button type="button" onClick={() => { setIsForgotPassword(true); setError(null); setSuccess(null); }} style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                  Quên mật khẩu?
                </button>
              </div>
              <input 
                id="password"
                name="password"
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            
            <button type="submit" className="btn btn-primary mt-4" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'ĐĂNG NHẬP'}
            </button>
          </form>
        )}

        {!isForgotPassword && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', margin: '2rem 0' }}>
              <div style={{ flex: 1, borderTop: '1px solid #4b5563' }}></div>
              <span style={{ padding: '0 1rem', fontSize: '0.875rem', color: '#9ca3af' }}>HOẶC</span>
              <div style={{ flex: 1, borderTop: '1px solid #4b5563' }}></div>
            </div>
            <button 
              type="button" 
              onClick={handleGuestLogin}
              className="btn btn-secondary w-full" 
              disabled={loading}
              style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              🎭 TRẢI NGHIỆM TƯ CÁCH KHÁCH
            </button>
          </>
        )}

        {!isForgotPassword && (
          <div className="text-center mt-6" style={{ fontSize: '0.875rem', opacity: 0.8 }}>
            Chưa có tài khoản? <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Đăng ký ngay</Link>
          </div>
        )}
      </div>
    </div>
  );
}
