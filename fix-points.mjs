import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// read .env.local
const envPath = path.resolve('.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    // Xóa dấu nháy đơn hoặc nháy kép ở đầu cuối nếu có
    envVars[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
});

const url = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const key = envVars['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(url, key);

async function fixPoints() {
  console.log("Fetching profiles...");
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, display_name');
  if (pErr) {
    console.error("Error fetching profiles:", pErr);
    return;
  }
  
  console.log(`Found ${profiles.length} profiles.`);

  for (const user of profiles) {
    const { data: predictions, error: prErr } = await supabase
      .from('predictions')
      .select('points_earned')
      .eq('user_id', user.id);
      
    if (prErr) {
      console.error(`Error fetching predictions for ${user.display_name}:`, prErr);
      continue;
    }
    
    let total = 0;
    predictions.forEach(p => {
      total += (p.points_earned || 0);
    });
    
    const { error: upErr } = await supabase.from('profiles').update({ total_points: total }).eq('id', user.id);
    if (upErr) {
      console.error(`Error updating ${user.display_name}:`, upErr);
    } else {
      console.log(`Updated ${user.display_name}: total points = ${total}`);
    }
  }
  console.log("Done fixing points!");
}

fixPoints();
