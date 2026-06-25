import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  // Use anon key for local dev if service role key is missing
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function cleanDuplicates() {
  console.log('Fetching predictions...');
  const { data, error } = await supabaseAdmin.from('predictions').select('*');
  
  if (error) {
    console.error('Error fetching predictions:', error);
    return;
  }
  
  if (!data) return;

  const grouped: Record<string, any[]> = {};
  
  data.forEach(p => {
    const key = `${p.user_id}_${p.match_id}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });
  
  const toDelete = [];
  
  for (const [key, preds] of Object.entries(grouped)) {
    if (preds.length > 1) {
      // Sort by created_at descending so we keep the newest one
      preds.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // The first one is the newest, the rest are duplicates
      const dupes = preds.slice(1);
      toDelete.push(...dupes.map(d => d.id));
    }
  }
  
  console.log(`Found ${toDelete.length} duplicate predictions to delete.`);
  
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabaseAdmin.from('predictions').delete().in('id', toDelete);
    if (deleteError) {
      console.error('Error deleting duplicates:', deleteError);
    } else {
      console.log('Successfully deleted duplicates.');
    }
  }
}

cleanDuplicates();
