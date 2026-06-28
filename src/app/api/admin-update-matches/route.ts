import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: Request) {
  // Chỉ cập nhật cặp đấu (home/away team), GIỮ NGUYÊN giờ thi đấu đã có trong DB
  const updates = [
    { id: 'dcb4ea25-edcd-4b22-b525-aa3c314cf221', homeName: 'Nam Phi',     awayName: 'Canada'     },
    { id: '09e95a63-e5a7-4516-a877-c55fcd30ec67', homeName: 'Brazil',      awayName: 'Nhật Bản'   },
    { id: 'ee85ff66-0d2b-4ccb-85f7-47a22295652b', homeName: 'Đức',         awayName: 'Paraguay'   },
    { id: '32455a36-a8b1-45ea-93a7-41d584ebbaab', homeName: 'Hà Lan',      awayName: 'Marocco'    },
    { id: '6518f2ef-4e19-4551-81fb-2c760ded9dc5', homeName: 'Bờ Biển Ngà', awayName: 'Na Uy'      },
    { id: '757782dd-2975-4815-a6ee-3846c8762e16', homeName: 'Pháp',        awayName: 'Thụy Điển'  },
    { id: '24623cb4-55eb-40d3-bf8f-60d4ea4d97bd', homeName: 'Mexico',      awayName: 'Ecuador'    },
    { id: '0f29e77a-6db5-472e-a596-81cf416f40cb', homeName: 'Bỉ',          awayName: 'Senegal'    },
    { id: 'c1f5a56f-c57d-4393-b397-6ad8b4444e95', homeName: 'Mỹ',          awayName: 'Bosnia'     },
    { id: '9db3381a-1314-4528-98ce-ef2d057f999e', homeName: 'Tây Ban Nha', awayName: 'Áo'         },
    { id: '8ac18879-c14d-41d7-a52a-61d12229180b', homeName: 'Thụy Sĩ',     awayName: 'Algeria'    },
    { id: '9cd98f4a-e6d9-4323-9a8b-5bb144b700dd', homeName: 'Úc',          awayName: 'Ai Cập'     },
    { id: '72303942-7ac0-4dce-965c-ced65e2e1b49', homeName: 'Argentina',   awayName: 'Cape Verde' },
    // Các trận cần lookup theo tên đội (chưa có ID cố định)
    { homeName: 'Anh',        awayName: 'CH Congo',  lookupByName: true },
    { homeName: 'Bồ Đào Nha', awayName: 'Croatia',   lookupByName: true },
    { homeName: 'Colombia',   awayName: 'Ghana',     lookupByName: true },
  ];

  try {
    const { data: teams, error: teamsError } = await supabaseAdmin.from('teams').select('id, name');
    if (teamsError) throw teamsError;

    const teamMap: Record<string, string> = {};
    teams?.forEach(t => teamMap[t.name] = t.id);

    // Fetch tất cả match vòng 32 để lookup theo team
    const { data: existingMatches } = await supabaseAdmin
      .from('matches')
      .select('id, home_team_id, away_team_id')
      .eq('round', 'Vòng 32 Đội');

    const results = [];

    for (const update of updates) {
      const homeId = teamMap[update.homeName];
      const awayId = update.awayName ? teamMap[update.awayName] : null;

      if (!homeId) {
        results.push({ match: `${update.homeName} vs ${update.awayName}`, action: 'skip_no_home_team' });
        continue;
      }

      let matchId = (update as any).id;

      // Lookup by existing team assignment for matches without fixed ID
      if ((update as any).lookupByName) {
        const found = existingMatches?.find(m =>
          m.home_team_id === homeId || (awayId && m.away_team_id === awayId)
        );
        if (found) {
          matchId = found.id;
        } else {
          results.push({ match: `${update.homeName} vs ${update.awayName}`, action: 'not_found_in_db' });
          continue;
        }
      }

      // Chỉ update team IDs, không đổi giờ
      const payload: any = {};
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
