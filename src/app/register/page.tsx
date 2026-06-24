"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp!');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { registerUserAdmin } = await import('./actions');
      await registerUserAdmin(username, password);

      // Sau khi tạo thành công qua Admin API, thực hiện Đăng nhập cho Client
      const email = `${username.toLowerCase().trim()}@wc2026.local`;
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) throw signInError;
      
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi đăng ký.');
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center" style={{ minHeight: '80vh' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <h2 className="text-center mb-8 logo" style={{ fontSize: '2rem' }}>Đăng ký</h2>
        
        {error && <div className="badge badge-danger mb-4 text-center">{error}</div>}
        
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label>Tên đăng nhập (Username)</label>
            <input 
              type="text" 
              required 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Ví dụ: TuanAnh99"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label>Mật khẩu</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label>Nhập lại mật khẩu</label>
            <input 
              type="password" 
              required 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          <button type="submit" className="btn btn-primary mt-4" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', opacity: 0.8 }}>
          Đã có tài khoản? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
