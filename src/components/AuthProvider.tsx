"use client";
import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const lastActivityRef = useRef<number>(typeof window !== 'undefined' ? Date.now() : 0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const signOut = async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    await supabase.auth.signOut();
  };

  const handleTimeout = useCallback(() => {
    signOut().then(() => {
      alert("Phiên làm việc đã tự động kết thúc do 30 phút không có hoạt động. Vui lòng tải lại trang hoặc đăng nhập lại.");
      router.push('/');
    });
  }, [router]);

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('last_activity', lastActivityRef.current.toString());
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Khôi phục thời gian thao tác cuối cùng nếu có
    const storedActivity = window.localStorage.getItem('last_activity');
    if (storedActivity) {
      lastActivityRef.current = parseInt(storedActivity, 10);
    } else {
      updateActivity();
    }

    // Lắng nghe thay đổi từ các tab khác
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'last_activity' && e.newValue) {
        lastActivityRef.current = parseInt(e.newValue, 10);
      }
    };
    window.addEventListener('storage', handleStorage);

    // Kiểm tra timeout mỗi 10 giây
    intervalRef.current = setInterval(() => {
      if (Date.now() - lastActivityRef.current > TIMEOUT_MS) {
        // Chỉ log out nếu thực sự có user
        supabase.auth.getSession().then(({ data }) => {
           if (data.session) {
             handleTimeout();
           }
        });
      }
    }, 10000);

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, updateActivity));
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      events.forEach(e => window.removeEventListener(e, updateActivity));
      window.removeEventListener('storage', handleStorage);
    };
  }, [handleTimeout, updateActivity]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (_event === 'SIGNED_OUT') {
         router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
