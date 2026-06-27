import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const payload = await req.json();
    const { match_id, user_id } = payload;

    if (user.id !== user_id) {
      return NextResponse.json({ error: 'Forbidden: Cannot save for another user' }, { status: 403 });
    }

    // Server-side validation of kickoff time
    const { data: match } = await supabaseAdmin
      .from('matches')
      .select('kickoff_time, status, round, home_team_id, away_team_id')
      .eq('id', match_id)
      .single();

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Predictions are locked 45 minutes before kickoff
    const lockTime = new Date(new Date(match.kickoff_time).getTime() - 45 * 60 * 1000);
    if (match.status !== 'pending' || new Date() >= lockTime) {
      return NextResponse.json({ error: 'Match predictions are locked 45 minutes before kickoff.' }, { status: 400 });
    }

    // SANITIZE PAYLOAD to prevent injection of 'points_earned' or other sensitive fields
    const safePayload = {
      user_id: payload.user_id,
      match_id: payload.match_id,
      prediction_result: payload.prediction_result ?? null,
      home_score: payload.home_score !== undefined && payload.home_score !== '' ? Number(payload.home_score) : null,
      away_score: payload.away_score !== undefined && payload.away_score !== '' ? Number(payload.away_score) : null,
      advancing_team_id: payload.advancing_team_id ?? null,
      updated_at: new Date().toISOString()
    };

    // SERVER-SIDE LOGIC VALIDATION
    const knockoutRounds = ['Vòng 32 đội', 'Vòng 16 đội', 'Tứ kết', 'Bán kết', 'Tranh hạng ba', 'Chung kết'];
    const isKnockout = knockoutRounds.includes(match.round || '');

    if (isKnockout) {
      if (!safePayload.advancing_team_id) {
        return NextResponse.json({ error: 'Vui lòng chọn đội đi tiếp (Bắt buộc)!' }, { status: 400 });
      }
      if (safePayload.home_score === null || safePayload.away_score === null) {
        return NextResponse.json({ error: 'Vui lòng nhập đầy đủ tỷ số 120 phút!' }, { status: 400 });
      }
      const h = safePayload.home_score;
      const a = safePayload.away_score;
      if (safePayload.advancing_team_id === match.home_team_id && h < a) {
        return NextResponse.json({ error: 'Tỷ số không hợp lệ so với kết quả Đội nhà đi tiếp!' }, { status: 400 });
      }
      if (safePayload.advancing_team_id === match.away_team_id && a < h) {
        return NextResponse.json({ error: 'Tỷ số không hợp lệ so với kết quả Đội khách đi tiếp!' }, { status: 400 });
      }
    } else {
      if (!safePayload.prediction_result) {
        return NextResponse.json({ error: 'Vui lòng chọn kết quả Thắng/Hòa/Thua!' }, { status: 400 });
      }
      if (safePayload.home_score !== null && safePayload.away_score !== null) {
        const h = safePayload.home_score;
        const a = safePayload.away_score;
        if (safePayload.prediction_result === 'home_win' && h <= a) return NextResponse.json({ error: 'Tỷ số không khớp kết quả Đội nhà Thắng!' }, { status: 400 });
        if (safePayload.prediction_result === 'away_win' && a <= h) return NextResponse.json({ error: 'Tỷ số không khớp kết quả Đội khách Thắng!' }, { status: 400 });
        if (safePayload.prediction_result === 'draw' && h !== a) return NextResponse.json({ error: 'Tỷ số không khớp kết quả Hòa!' }, { status: 400 });
      }
    }

    const { error: upsertError } = await supabaseAdmin
      .from('predictions')
      .upsert(safePayload, { onConflict: 'user_id, match_id' });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
