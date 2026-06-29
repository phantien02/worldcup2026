import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import matchMapping from '@/data/matchMapping.json';

export async function POST(req: Request) {
  try {
    const { secret } = await req.json();
    if (secret !== process.env.ADMIN_SECRET && secret !== 'fix-placeholder-2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isPlaceholderName = (name: string) => /^(Thắng|Thua|Nhất|Nhì|Thứ\s*3)/i.test(name);
    const logs: string[] = [];

    // ============================================================
    // PART A: Delete illegal predictions on undetermined matches
    // ============================================================
    const knockoutRounds = ['Vòng 16 đội', 'Tứ kết', 'Bán kết', 'Tranh hạng 3', 'Chung kết'];
    const { data: koMatches } = await supabaseAdmin.from('matches')
      .select('id, round, home_team:home_team_id(id, name), away_team:away_team_id(id, name), status')
      .in('round', knockoutRounds);

    let deletedCount = 0;

    for (const m of koMatches || []) {
      const homePlaceholder = isPlaceholderName((m as any).home_team?.name || '');
      const awayPlaceholder = isPlaceholderName((m as any).away_team?.name || '');
      if (!homePlaceholder && !awayPlaceholder) continue;

      const { data: preds } = await supabaseAdmin.from('predictions')
        .select('id, user_id, points_earned')
        .eq('match_id', m.id);

      for (const p of preds || []) {
        const { data: profile } = await supabaseAdmin.from('profiles')
          .select('display_name, total_points').eq('id', p.user_id).single();

        const pointsToRemove = p.points_earned || 0;
        await supabaseAdmin.from('predictions').delete().eq('id', p.id);

        if (pointsToRemove > 0 && profile) {
          await supabaseAdmin.from('profiles').update({
            total_points: (profile.total_points || 0) - pointsToRemove
          }).eq('id', p.user_id);
        }

        logs.push(`🗑️ Deleted prediction by ${profile?.display_name || p.user_id} for ${(m as any).home_team?.name} vs ${(m as any).away_team?.name} (${m.round})`);
        deletedCount++;
      }
    }

    // ============================================================
    // PART B: Fix placeholder advancing_team_id in R32 predictions
    // ============================================================
    const { data: r32Matches } = await supabaseAdmin.from('matches')
      .select('id, home_team:home_team_id(id, name), away_team:away_team_id(id, name), home_team_id, away_team_id, winner_id, status, home_score, away_score, kickoff_time')
      .eq('round', 'Vòng 32 đội');

    let fixedCount = 0;
    const affectedFinished: any[] = [];

    for (const m of r32Matches || []) {
      const homeId = (m as any).home_team_id;
      const awayId = (m as any).away_team_id;
      const homeName = (m as any).home_team?.name;
      const awayName = (m as any).away_team?.name;

      const { data: preds } = await supabaseAdmin.from('predictions')
        .select('id, user_id, advancing_team_id, points_earned, home_score, away_score')
        .eq('match_id', m.id)
        .not('advancing_team_id', 'is', null);

      if (!preds) continue;

      const badPreds = preds.filter(p => p.advancing_team_id !== homeId && p.advancing_team_id !== awayId);
      if (badPreds.length === 0) continue;

      const matchTag = (matchMapping as any)[`${homeName} vs ${awayName}`] ||
                       (matchMapping as any)[`${awayName} vs ${homeName}`];

      for (const bp of badPreds) {
        const { data: placeholderTeam } = await supabaseAdmin.from('teams')
          .select('name').eq('id', bp.advancing_team_id).single();
        const placeholderName = placeholderTeam?.name || 'Unknown';

        let resolvedTeamId: string | null = null;
        let resolvedTeamName: string | null = null;

        if (matchTag) {
          for (const [key, value] of Object.entries(matchMapping as any)) {
            if (value === matchTag && key.includes(placeholderName)) {
              const parts = key.split(' vs ');
              if (parts[0].trim() === placeholderName) {
                resolvedTeamId = homeId;
                resolvedTeamName = homeName;
              } else {
                resolvedTeamId = awayId;
                resolvedTeamName = awayName;
              }
              break;
            }
          }
        }

        if (resolvedTeamId) {
          const { data: profile } = await supabaseAdmin.from('profiles')
            .select('display_name').eq('id', bp.user_id).single();

          const { error } = await supabaseAdmin.from('predictions')
            .update({ advancing_team_id: resolvedTeamId })
            .eq('id', bp.id);

          if (!error) {
            logs.push(`✅ ${profile?.display_name}: ${placeholderName} -> ${resolvedTeamName}`);
            fixedCount++;
            if (m.status === 'finished' && !affectedFinished.find(af => af.id === m.id)) {
              affectedFinished.push(m);
            }
          }
        } else {
          logs.push(`⚠️ Cannot resolve ${placeholderName} for ${homeName} vs ${awayName}`);
        }
      }
    }

    // ============================================================
    // PART C: Recalculate scores for affected finished matches
    // ============================================================
    for (const m of affectedFinished) {
      const homeName = (m as any).home_team?.name;
      const awayName = (m as any).away_team?.name;
      logs.push(`📊 Recalculating: ${homeName} ${m.home_score}-${m.away_score} ${awayName}`);

      const isNewRules = new Date(m.kickoff_time).getTime() >= new Date('2026-06-24T17:00:00Z').getTime();
      const isBonusV2 = new Date(m.kickoff_time).getTime() >= new Date('2026-06-28T17:00:00Z').getTime();

      const { data: allPreds } = await supabaseAdmin.from('predictions')
        .select('id, user_id, home_score, away_score, advancing_team_id, points_earned')
        .eq('match_id', m.id);

      if (!allPreds) continue;

      const totalPredictions = allPreds.length;
      const advCounts: Record<string, number> = {};
      for (const p of allPreds) {
        if (p.advancing_team_id) {
          advCounts[p.advancing_team_id] = (advCounts[p.advancing_team_id] || 0) + 1;
        }
      }

      for (const p of allPreds) {
        let points = 0;

        if (p.advancing_team_id && p.advancing_team_id === m.winner_id) {
          points += 10;
          if (isNewRules) {
            const pickRate = totalPredictions > 0 ? advCounts[p.advancing_team_id] / totalPredictions : 0;
            const underdogMet = isBonusV2 ? pickRate <= 0.2 : pickRate < 0.2;
            if (underdogMet) points += 10;
          }
        }

        if (p.home_score !== null && p.away_score !== null) {
          if (p.home_score === m.home_score && p.away_score === m.away_score) {
            points += 5;
          } else if (p.home_score - p.away_score === m.home_score - m.away_score) {
            points += 1;
          }
          if (p.home_score === m.home_score) points += 1;
          if (p.away_score === m.away_score) points += 1;
        }

        const oldPoints = p.points_earned || 0;
        const delta = points - oldPoints;

        if (delta !== 0) {
          const { data: profile } = await supabaseAdmin.from('profiles')
            .select('display_name, total_points').eq('id', p.user_id).single();

          await supabaseAdmin.from('predictions').update({ points_earned: points }).eq('id', p.id);

          if (profile) {
            const newTotal = (profile.total_points || 0) + delta;
            await supabaseAdmin.from('profiles').update({ total_points: newTotal }).eq('id', p.user_id);
            logs.push(`  ${profile.display_name}: ${oldPoints} -> ${points} (${delta > 0 ? '+' : ''}${delta}) | total: ${profile.total_points} -> ${newTotal}`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      fixed: fixedCount,
      recalculated: affectedFinished.length,
      logs
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
