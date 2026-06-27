import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: Request) {
  const updates = [
    { id: 'dcb4ea25-edcd-4b22-b525-aa3c314cf221', homeName: 'Nam Phi', awayName: 'Canada' },
    { id: '09e95a63-e5a7-4516-a877-c55fcd30ec67', homeName: 'Brazil', awayName: 'Nhật Bản' },
    { id: 'ee85ff66-0d2b-4ccb-85f7-47a22295652b', homeName: 'Đức', awayName: 'Paraguay' },
    { id: '32455a36-a8b1-45ea-93a7-41d584ebbaab', homeName: 'Hà Lan', awayName: 'Marocco' },
    { id: '6518f2ef-4e19-4551-81fb-2c760ded9dc5', homeName: 'Bờ Biển Ngà', awayName: 'Na Uy' },
    { id: '757782dd-2975-4815-a6ee-3846c8762e16', homeName: 'Pháp', awayName: 'Thụy Điển' },
    { id: '24623cb4-55eb-40d3-bf8f-60d4ea4d97bd', homeName: 'Mexico', awayName: null },
    { id: '0f29e77a-6db5-472e-a596-81cf416f40cb', homeName: 'Bỉ', awayName: null },
    { id: 'c1f5a56f-c57d-4393-b397-6ad8b4444e95', homeName: 'Mỹ', awayName: 'Bosnia' },
    { id: '9db3381a-1314-4528-98ce-ef2d057f999e', homeName: 'Tây Ban Nha', awayName: null },
    { id: '8ac18879-c14d-41d7-a52a-61d12229180b', homeName: 'Thụy Sĩ', awayName: null },
    { id: '9cd98f4a-e6d9-4323-9a8b-5bb144b700dd', homeName: 'Úc', awayName: 'Ai Cập' },
    { id: '72303942-7ac0-4dce-965c-ced65e2e1b49', homeName: 'Argentina', awayName: 'Cape Verde' }
  ];

  try {
    const { data: teams } = await supabaseAdmin.from('teams').select('id, name');
    const teamMap: Record<string, string> = {};
    teams?.forEach(t => teamMap[t.name] = t.id);

    const results = [];
    for (const update of updates) {
      const payload: any = {};
      if (update.homeName && teamMap[update.homeName]) payload.home_team_id = teamMap[update.homeName];
      if (update.awayName && teamMap[update.awayName]) payload.away_team_id = teamMap[update.awayName];

      if (Object.keys(payload).length > 0) {
        const { error } = await supabaseAdmin
          .from('matches')
          .update(payload)
          .eq('id', update.id);
        
        results.push({ match: update.id, success: !error });
      }
    }

    return NextResponse.json({ success: true, message: "Teams updated successfully!" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
