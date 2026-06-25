import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Note: We need a service role key to bypass RLS, or anon key if RLS allows insert
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'Missing Supabase credentials' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch JSON data directly from VTC News API instead of scraping HTML
    const response = await fetch('https://sv.vtcnews.vn/api/world-cup/scorers?take=50', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json'
      },
      next: { revalidate: 0 }
    });
    
    const json = await response.json();
    
    if (!json.success || !json.data || json.data.length === 0) {
      return NextResponse.json({ success: true, message: 'No top scorers found or tournament not started yet' });
    }

    const nameMapping: Record<string, string> = {
      'Australia': 'Úc',
      'Séc': 'CH Séc',
      'DR Congo': 'CHDC Congo',
      'Maroc': 'Marocco',
    };

    const topScorers = json.data.map((item: any) => {
      const standardizedTeam = nameMapping[item.team_name] || item.team_name;
      return {
        player_name: item.name,
        team: standardizedTeam,
        goals: item.goals,
        assists: item.assists || 0
      };
    });

    // Since we want to replace the whole table, we can delete all existing records and insert new ones.
    const { error: deleteError } = await supabase
      .from('top_scorers')
      .delete()
      .neq('id', 0); // Delete all

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ success: false, error: 'Failed to clear old top scorers' }, { status: 500 });
    }

    const { error: insertError } = await supabase
      .from('top_scorers')
      .insert(topScorers);

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ success: false, error: 'Failed to insert new top scorers' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: topScorers });
  } catch (error: any) {
    console.error('Sync top scorers error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
