import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: Request) {
  // Vòng 32 - Cập nhật đội + giờ đấu (giờ UTC)
  // Ảnh gốc hiển thị giờ EDT (UTC-4)
  const updates = [
    {
      id: 'dcb4ea25-edcd-4b22-b525-aa3c314cf221',
      homeName: 'Nam Phi', awayName: 'Canada',
      kickoff: '2026-06-29T06:00:00Z',  // Jun 29, 2:00 AM EDT
      round: 'Vòng 32 Đội'
    },
    {
      id: '09e95a63-e5a7-4516-a877-c55fcd30ec67',
      homeName: 'Brazil', awayName: 'Nhật Bản',
      kickoff: '2026-06-30T04:00:00Z',  // Jun 30, 12:00 AM EDT
      round: 'Vòng 32 Đội'
    },
    {
      id: 'ee85ff66-0d2b-4ccb-85f7-47a22295652b',
      homeName: 'Đức', awayName: 'Paraguay',
      kickoff: '2026-06-30T07:30:00Z',  // Jun 30, 3:30 AM EDT
      round: 'Vòng 32 Đội'
    },
    {
      id: '32455a36-a8b1-45ea-93a7-41d584ebbaab',
      homeName: 'Hà Lan', awayName: 'Marocco',
      kickoff: '2026-06-30T12:00:00Z',  // Jun 30, 8:00 AM EDT
      round: 'Vòng 32 Đội'
    },
    {
      id: '6518f2ef-4e19-4551-81fb-2c760ded9dc5',
      homeName: 'Bờ Biển Ngà', awayName: 'Na Uy',
      kickoff: '2026-07-01T04:00:00Z',  // Jul 1, 12:00 AM EDT
      round: 'Vòng 32 Đội'
    },
    {
      id: '757782dd-2975-4815-a6ee-3846c8762e16',
      homeName: 'Pháp', awayName: 'Thụy Điển',
      kickoff: '2026-07-01T08:00:00Z',  // Jul 1, 4:00 AM EDT
      round: 'Vòng 32 Đội'
    },
    {
      id: '24623cb4-55eb-40d3-bf8f-60d4ea4d97bd',
      homeName: 'Mexico', awayName: 'Ecuador',
      kickoff: '2026-07-01T12:00:00Z',  // Jul 1, 8:00 AM EDT
      round: 'Vòng 32 Đội'
    },
    {
      id: 'fd-england-congo', // sẽ lookup bằng tên nếu không có ID cố định
      homeName: 'Anh', awayName: 'CH Congo',
      kickoff: '2026-07-02T03:00:00Z',  // Jul 1, 11:00 PM EDT
      round: 'Vòng 32 Đội',
      lookupByName: true
    },
    {
      id: '0f29e77a-6db5-472e-a596-81cf416f40cb',
      homeName: 'Bỉ', awayName: 'Senegal',
      kickoff: '2026-07-02T07:00:00Z',  // Jul 2, 3:00 AM EDT
      round: 'Vòng 32 Đội'
    },
    {
      id: 'c1f5a56f-c57d-4393-b397-6ad8b4444e95',
      homeName: 'Mỹ', awayName: 'Bosnia',
      kickoff: '2026-07-02T11:00:00Z',  // Jul 2, 7:00 AM EDT
      round: 'Vòng 32 Đội'
    },
    {
      id: '9db3381a-1314-4528-98ce-ef2d057f999e',
      homeName: 'Tây Ban Nha', awayName: 'Áo',
      kickoff: '2026-07-03T06:00:00Z',  // Jul 3, 2:00 AM EDT
      round: 'Vòng 32 Đội'
    },
    {
      id: 'fd-portugal-croatia',
      homeName: 'Bồ Đào Nha', awayName: 'Croatia',
      kickoff: '2026-07-03T10:00:00Z',  // Jul 3, 6:00 AM EDT
      round: 'Vòng 32 Đội',
      lookupByName: true
    },
    {
      id: '8ac18879-c14d-41d7-a52a-61d12229180b',
      homeName: 'Thụy Sĩ', awayName: 'Algeria',
      kickoff: '2026-07-03T14:00:00Z',  // Jul 3, 10:00 AM EDT
      round: 'Vòng 32 Đội'
    },
    {
      id: '9cd98f4a-e6d9-4323-9a8b-5bb144b700dd',
      homeName: 'Úc', awayName: 'Ai Cập',
      kickoff: '2026-07-04T05:00:00Z',  // Jul 4, 1:00 AM EDT
      round: 'Vòng 32 Đội'
    },
    {
      id: '72303942-7ac0-4dce-965c-ced65e2e1b49',
      homeName: 'Argentina', awayName: 'Cape Verde',
      kickoff: '2026-07-04T09:00:00Z',  // Jul 4, 5:00 AM EDT
      round: 'Vòng 32 Đội'
    },
    {
      id: 'fd-colombia-ghana',
      homeName: 'Colombia', awayName: 'Ghana',
      kickoff: '2026-07-04T12:30:00Z',  // Jul 4, 8:30 AM EDT
      round: 'Vòng 32 Đội',
      lookupByName: true
    },
  ];

  try {
    const { data: teams, error: teamsError } = await supabaseAdmin.from('teams').select('id, name');
    if (teamsError) throw teamsError;

    const teamMap: Record<string, string> = {};
    teams?.forEach(t => teamMap[t.name] = t.id);

    // Fetch existing matches to find ones by team name
    const { data: existingMatches } = await supabaseAdmin
      .from('matches')
      .select('id, home_team_id, away_team_id, round')
      .eq('round', 'Vòng 32 Đội');

    const results = [];

    for (const update of updates) {
      const homeId = teamMap[update.homeName];
      const awayId = update.awayName ? teamMap[update.awayName] : null;

      let matchId = update.id;

      // For matches without a fixed ID, find by team name match
      if (update.lookupByName) {
        const found = existingMatches?.find(m =>
          (homeId && m.home_team_id === homeId) ||
          (awayId && m.away_team_id === awayId)
        );
        if (found) {
          matchId = found.id;
        } else {
          // Need to create this match
          if (homeId && awayId) {
            const { data: inserted, error: insertErr } = await supabaseAdmin
              .from('matches')
              .insert({
                home_team_id: homeId,
                away_team_id: awayId,
                kickoff_time: update.kickoff,
                status: 'pending',
                round: update.round
              })
              .select('id')
              .single();

            if (!insertErr && inserted) {
              results.push({ match: `${update.homeName} vs ${update.awayName}`, action: 'inserted', id: inserted.id });
            } else {
              results.push({ match: `${update.homeName} vs ${update.awayName}`, action: 'insert_error', error: insertErr?.message });
            }
            continue;
          } else {
            results.push({ match: `${update.homeName} vs ${update.awayName}`, action: 'skipped_missing_team', homeFound: !!homeId, awayFound: !!awayId });
            continue;
          }
        }
      }

      // Build payload
      const payload: any = {
        kickoff_time: update.kickoff,
        round: update.round
      };
      if (homeId) payload.home_team_id = homeId;
      if (awayId) payload.away_team_id = awayId;

      const { error } = await supabaseAdmin
        .from('matches')
        .update(payload)
        .eq('id', matchId);

      results.push({
        match: `${update.homeName} vs ${update.awayName}`,
        id: matchId,
        action: error ? 'error' : 'updated',
        error: error?.message
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
