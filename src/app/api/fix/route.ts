import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: Request) {
  // 1. Revert matches that are in the future but marked as finished
  const { data: matches } = await supabaseAdmin.from('matches').select('id, kickoff_time, status').eq('status', 'finished');
  
  let revertedMatches = 0;
  if (matches) {
     const now = new Date();
     for (const m of matches) {
       // If kickoff time is in the future
       if (new Date(m.kickoff_time) > now) {
         await supabaseAdmin.from('matches').update({ status: 'pending', home_score: 0, away_score: 0 }).eq('id', m.id);
         // Reset predictions
         await supabaseAdmin.from('predictions').update({ points_earned: null }).eq('match_id', m.id);
         revertedMatches++;
       }
     }
  }

  // 2. Recalculate points
  const { data: profiles } = await supabaseAdmin.from('profiles').select('id, display_name');
  let fixedUsers = 0;
  
  if (profiles) {
    for (const user of profiles) {
      const { data: predictions } = await supabaseAdmin
        .from('predictions')
        .select('points_earned')
        .eq('user_id', user.id);
        
      let total = 0;
      if (predictions) {
        total = predictions.reduce((sum, p) => sum + (p.points_earned || 0), 0);
      }
      
      await supabaseAdmin.from('profiles').update({ total_points: total }).eq('id', user.id);
      fixedUsers++;
    }
  }

  return NextResponse.json({ success: true, fixedUsers, revertedMatches });
}
