'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (data.success) {
        // Đăng xuất khỏi tài khoản người dùng bình thường (nếu đang đăng nhập)
        await supabase.auth.signOut();
        // Force refresh to allow middleware to recognize the cookie and allow access
        window.location.href = '/admin';
      } else {
        setError(data.message || 'Đăng nhập thất bại');
      }
    } catch (err) {
      setError('Đã có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="glass-panel w-full max-w-md p-8 relative z-10 animate-fade-in border border-white/5 shadow-2xl rounded-2xl" style={{ background: 'rgba(20, 20, 28, 0.7)' }}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
            ADMIN PORTAL
          </h1>
          <p className="text-gray-400 text-sm">Khu vực bảo mật. Vui lòng nhập mật mã.</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-300 uppercase tracking-widest ml-1">Mật khẩu hệ thống</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-[#111116] border border-white/10 rounded-lg p-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-center tracking-[0.5em] font-mono text-lg"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center font-medium animate-shake">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full relative group overflow-hidden bg-transparent font-black py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-80 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
            <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white to-transparent opacity-20 group-hover:animate-shine"></div>
            <span className="relative z-10 text-white tracking-widest text-lg drop-shadow-md flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  ĐANG XÁC THỰC...
                </>
              ) : (
                <>XÁC NHẬN TRUY CẬP <span className="text-xl">🚀</span></>
              )}
            </span>
          </button>
        </form>
        
        <div className="mt-8 flex justify-center">
          <button 
            onClick={() => router.push('/')} 
            className="group flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-full border border-white/5 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          >
            <span className="transform transition-transform group-hover:-translate-x-1">←</span>
            Quay lại trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
