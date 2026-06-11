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
      .select('kickoff_time, status')
      .eq('id', match_id)
      .single();

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (match.status !== 'pending' || new Date() >= new Date(match.kickoff_time)) {
      return NextResponse.json({ error: 'Match has already started. Predictions are locked.' }, { status: 400 });
    }

    // Save prediction securely using admin
    const { error: upsertError } = await supabaseAdmin
      .from('predictions')
      .upsert(payload, { onConflict: 'user_id, match_id' });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
