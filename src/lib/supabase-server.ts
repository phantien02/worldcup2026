import { createClient } from '@supabase/supabase-js'

// Admin client used for backend server operations (Bypassing RLS)
// DO NOT use this on the client side!
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key'
)
