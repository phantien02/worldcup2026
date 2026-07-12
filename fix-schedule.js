require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.production', override: true });
const { createClient } = require('@supabase/supabase-js');

async function fixSchedule() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Get team IDs
  const { data: teams, error: teamsError } = await supabase.from('teams').select('id, name');
  if (teamsError) {
    console.error('Teams fetch error:', teamsError);
    return;
  }
  
  const portugal = teams.find(t => t.name === 'Bồ Đào Nha');
  const spain = teams.find(t => t.name === 'Tây Ban Nha');
  
  if (!portugal || !spain) {
    console.error('Could not find Portugal or Spain');
    return;
  }
  
  // Find the match between them
  const { data: matches, error: matchError } = await supabase.from('matches')
    .select('id, home_team_id, away_team_id')
    .or(`home_team_id.eq.${portugal.id},home_team_id.eq.${spain.id}`);
    
  if (matchError) {
    console.error('Match fetch error:', matchError);
    return;
  }
  
  const targetMatch = matches.find(m => 
    (m.home_team_id === portugal.id && m.away_team_id === spain.id) || 
    (m.home_team_id === spain.id && m.away_team_id === portugal.id)
  );
  
  if (!targetMatch) {
    console.error('Match not found between Portugal and Spain');
    return;
  }
  
  console.log('Found match:', targetMatch);
  
  // Update kickoff_time to 2026-07-07T02:00:00+07:00
  // Which is 2026-07-06T19:00:00.000Z in UTC
  const newKickoff = '2026-07-06T19:00:00.000Z';
  
  const { error: updateError } = await supabase.from('matches')
    .update({ kickoff_time: newKickoff })
    .eq('id', targetMatch.id);
    
  if (updateError) {
    console.error('Update error:', updateError);
  } else {
    console.log('Successfully updated kickoff_time for Match ID:', targetMatch.id, 'to', newKickoff);
  }
}

fixSchedule();
