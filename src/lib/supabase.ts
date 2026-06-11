import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const isBrowser = typeof window !== 'undefined';

const cookieStorage = {
  getItem: (key: string): string | null => {
    if (!isBrowser) return null;
    const match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  },
  setItem: (key: string, value: string): void => {
    if (!isBrowser) return;
    // No expires/max-age means it's a Session Cookie (deleted when browser closes)
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
  },
  removeItem: (key: string): void => {
    if (!isBrowser) return;
    document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  }
};

// Client used for normal operations (Auth, fetching data with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: cookieStorage,
  }
})
