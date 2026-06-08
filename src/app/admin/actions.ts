"use server";
import { supabaseAdmin } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

async function verifyAdmin() {
  const c = cookies() as any;
  const cookieStore = c.then ? await c : c;
  const token = cookieStore.get('admin_token')?.value;
  if (!token) throw new Error("Unauthorized: Cần quyền Admin để thực hiện hành động này!");
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
  // Update match status
  const updateData: any = {
    home_score: homeScore,
    away_score: awayScore,
    status: 'finished'
  };

  if (isKnockout) {
    updateData.winner_id = winnerId;
    updateData.win_method = winMethod;
    if (winMethod !== '90_mins') {
      updateData.score_90_home = score90Home;
      updateData.score_90_away = score90Away;
    }
    if (winMethod === 'penalties') {
      updateData.penalty_home = penaltyHome;
      updateData.penalty_away = penaltyAway;
    }
  }

  const { error: matchError } = await supabaseAdmin.from('matches').update(updateData).eq('id', matchId);

  if (matchError) throw matchError;

  // Fetch all predictions for this match
  const { data: predictions } = await supabaseAdmin
    .from('predictions')
    .select('id, user_id, prediction_result, home_score, away_score, advancing_team_id, predicted_win_method')
    .eq('match_id', matchId);

  if (!predictions) return { success: true };

  const userPointsUpdates: Record<string, number> = {};
  const actualResult = homeScore > awayScore ? 'home_win' : homeScore === awayScore ? 'draw' : 'away_win';

  for (const p of predictions) {
    let points = 0;

    if (isKnockout && p.advancing_team_id) {
      // Logic mới cho vòng Knockout
      if (p.advancing_team_id === winnerId) {
        points += 10; // Đoán đúng đội đi tiếp
        if (p.predicted_win_method === winMethod) {
          points += 5; // Đoán đúng hình thức phân định
        }
      }
    } else {
      // Logic cũ cho vòng Bảng
      if (p.prediction_result === actualResult) {
        points += 5; // Base points for correct result
        if (p.home_score !== null && p.away_score !== null) {
          if (p.home_score === homeScore && p.away_score === awayScore) {
            points += 3; // Bonus: Đúng tỷ số hoàn toàn
          } else if (p.home_score - p.away_score === homeScore - awayScore) {
            points += 1; // Bonus: Đúng hiệu số bàn thắng
          }
        }
      }
    }

    if (points > 0) {
      // Update prediction record
      await supabaseAdmin.from('predictions').update({ points_earned: points }).eq('id', p.id);
      userPointsUpdates[p.user_id] = (userPointsUpdates[p.user_id] || 0) + points;
    }
  }

  // Update total points for each user
  for (const [userId, points] of Object.entries(userPointsUpdates)) {
    // We need to fetch current total_points first
    const { data: profile } = await supabaseAdmin.from('profiles').select('total_points').eq('id', userId).single();
    if (profile) {
      await supabaseAdmin.from('profiles').update({
        total_points: (profile.total_points || 0) + points
      }).eq('id', userId);
    }
  }

  revalidatePath('/');
  revalidatePath(`/match/${matchId}`);
  
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

export async function getAllUsers() {
  await verifyAdmin();
  const { data } = await supabaseAdmin.from('profiles').select('id, display_name, total_points, created_at').order('display_name');
  return data || [];
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
