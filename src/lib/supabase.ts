import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client used for normal operations (Auth, fetching data with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
