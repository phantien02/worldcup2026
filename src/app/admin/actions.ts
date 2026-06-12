"use server";
import { supabaseAdmin } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/jwt';
import { internalUpdateMatchResult } from '@/lib/match-logic';

async function verifyAdmin() {
  const c = cookies() as any;
  const cookieStore = c.then ? await c : c;
  const token = cookieStore.get('admin_token')?.value;
  if (!token) throw new Error("Unauthorized: Cần quyền Admin để thực hiện hành động này!");
  const isValid = await verifyAdminToken(token);
  if (!isValid) throw new Error("Unauthorized: Token không hợp lệ hoặc đã hết hạn!");
}


export async function updateMatchResult(
  matchId: string, 
  homeScore: number, 
  awayScore: number,
  isKnockout: boolean = false,
  winnerId?: string,
  winMethod?: '90_mins' | 'extra_time' | 'penalties',
  score90Home?: number,
  score90Away?: number,
  penaltyHome?: number,
  penaltyAway?: number
) {
  await verifyAdmin();
  await internalUpdateMatchResult(matchId, homeScore, awayScore, isKnockout, winnerId, winMethod, score90Home, score90Away, penaltyHome, penaltyAway);
  revalidatePath('/');
  revalidatePath(`/match/${matchId}`);
  revalidatePath('/admin');
  return { success: true };
}

export async function createMatch(homeTeamId: string, awayTeamId: string, kickoffTime: string, round: string = 'Vòng Bảng') {
  await verifyAdmin();
  const { error } = await supabaseAdmin.from('matches').insert({
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    kickoff_time: kickoffTime,
    status: 'pending',
    round: round
  });
  if (error) throw error;
  revalidatePath('/');
  revalidatePath('/admin');
  return { success: true };
}

export async function createTeam(name: string, code: string, flagUrl: string) {
  await verifyAdmin();
  const { error } = await supabaseAdmin.from('teams').insert({
    name, code, flag_url: flagUrl
  });
  if (error) throw error;
  return { success: true };
}

export async function getPasswordRequests() {
  await verifyAdmin();
  const { data } = await supabaseAdmin.from('password_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false });
  return data || [];
}

export async function resetUserPassword(requestId: string, username: string, newPassword: string) {
  await verifyAdmin();
  // Tìm ID người dùng thông qua bảng profiles
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .ilike('display_name', username.trim())
    .maybeSingle();

  let targetUserId = profile?.id;

  // Nếu không tìm thấy trong profiles, thử tìm qua Auth users bằng email
  if (!targetUserId) {
    const email = `${username.toLowerCase().trim()}@wc2026.local`;
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const user = users.find(u => u.email === email);
    if (user) {
      targetUserId = user.id;
    }
  }

  if (!targetUserId) {
    // Không tìm thấy bằng bất cứ giá nào
    await supabaseAdmin.from('password_requests').update({ status: 'resolved' }).eq('id', requestId);
    throw new Error(`Không tìm thấy người dùng [${username}] trong hệ thống.`);
  }
  
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, { password: newPassword });
  if (updateError) throw updateError;
  
  const { error: reqError } = await supabaseAdmin.from('password_requests').update({ status: 'resolved' }).eq('id', requestId);
  if (reqError) throw reqError;
  
  revalidatePath('/admin');
  return { success: true };
}

export async function rejectPasswordRequest(requestId: string) {
  await verifyAdmin();
  const { error: reqError } = await supabaseAdmin.from('password_requests').delete().eq('id', requestId);
  if (reqError) throw reqError;
  
  revalidatePath('/admin');
  return { success: true };
}

export async function getAllUsers() {
  await verifyAdmin();
  const { data } = await supabaseAdmin.from('profiles').select('id, display_name, total_points, created_at').order('display_name');
  return (data || []).filter(u => u.display_name !== 'guest');
}

export async function deleteUserAccount(userId: string) {
  await verifyAdmin();
  // Xóa tài khoản khỏi hệ thống Auth của Supabase.
  // Các dữ liệu liên quan ở bảng profiles và predictions sẽ tự động bị xóa do ON DELETE CASCADE.
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw error;
  
  revalidatePath('/admin');
  return { success: true };
}

export async function deleteMatchAdmin(matchId: string) {
  await verifyAdmin();
  const { error } = await supabaseAdmin.from('matches').update({ round: 'DELETED' }).eq('id', matchId);
  if (error) throw error;
  revalidatePath('/');
  revalidatePath('/admin');
  return { success: true };
}
