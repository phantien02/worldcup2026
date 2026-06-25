import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey);

async function paradox() {
  const { data: matches } = await supabaseAdmin.from('matches').select('id, home_score, away_score, status, round').eq('status', 'finished');
  const validMatches = (matches || []).filter(m => m.round !== 'DELETED');
  const validMatchIds = validMatches.map(m => m.id);

  const { data: users } = await supabaseAdmin.from('profiles').select('id, display_name').eq('display_name', 'Dungpn');
  const user = users![0];

  const { data: predictions } = await supabaseAdmin.from('predictions').select('*').eq('user_id', user.id).in('match_id', validMatchIds);

  const matchMap: any = {};
  validMatches.forEach(m => matchMap[m.id] = m);

  let exactScoresSim = 0;
  let exactScoresDiff = 0;

  for (const pred of predictions || []) {
    const m = matchMap[pred.match_id];
    if (!m) continue;

    let simOk = false;
    if (pred.home_score !== null && pred.away_score !== null && m.home_score !== null && m.away_score !== null) {
      if (pred.home_score === m.home_score && pred.away_score === m.away_score) {
        exactScoresSim++;
        simOk = true;
      }
    }

    let diffOk = false;
    if (pred.home_score === m.home_score && pred.away_score === m.away_score) {
      exactScoresDiff++;
      diffOk = true;
    }

    if (simOk !== diffOk) {
      console.log(`Mismatch on match ${pred.match_id}: simOk=${simOk}, diffOk=${diffOk}, pred=(${pred.home_score},${pred.away_score}), m=(${m.home_score},${m.away_score})`);
    }
  }

  console.log(`exactScoresSim: ${exactScoresSim}`);
  console.log(`exactScoresDiff: ${exactScoresDiff}`);
}
paradox();
