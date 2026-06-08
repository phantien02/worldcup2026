"use server";
import { supabaseAdmin } from '@/lib/supabase-server';

export async function registerUserAdmin(username: string, password: string) {
  const email = `${username.toLowerCase().trim()}@wc2026.local`;
  
  // Create user via Admin API (bypasses Email Signups Disabled restriction)
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: username
    }
  });

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
}
