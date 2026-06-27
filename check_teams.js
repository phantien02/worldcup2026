const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

const matchUpdates = [
  // 1. South Africa vs Canada (Jun 29 2:00 AM VNT / 2026-06-28T19:00:00+00:00)
  { id: 'dcb4ea25-edcd-4b22-b525-aa3c314cf221', homeName: 'Nam Phi', awayName: 'Canada' },
  // 2. Brazil vs Japan (Jun 30 12:00 AM VNT / 2026-06-29T17:00:00+00:00)
  { id: '09e95a63-e5a7-4516-a877-c55fcd30ec67', homeName: 'Brazil', awayName: 'Nhật Bản' },
  // 3. Germany vs Paraguay (Jun 30 3:30 AM VNT / 2026-06-29T20:30:00+00:00)
  { id: 'ee85ff66-0d2b-4ccb-85f7-47a22295652b', homeName: 'Đức', awayName: 'Paraguay' },
  // 4. Netherlands vs Morocco (Jun 30 8:00 AM VNT / 2026-06-30T01:00:00+00:00)
  { id: '32455a36-a8b1-45ea-93a7-41d584ebbaab', homeName: 'Hà Lan', awayName: 'Maroc' },
  // 5. Ivory Coast vs Norway (Jul 1 12:00 AM VNT / 2026-06-30T17:00:00+00:00)
  { id: '6518f2ef-4e19-4551-81fb-2c760ded9dc5', homeName: 'Bờ Biển Ngà', awayName: 'Na Uy' },
  // 6. France vs Sweden (Jul 1 4:00 AM VNT / 2026-06-30T21:00:00+00:00)
  { id: '757782dd-2975-4815-a6ee-3846c8762e16', homeName: 'Pháp', awayName: 'Thụy Điển' },
  // 7. Mexico vs 3C/3E/3F/3H/3I (Jul 1 8:00 AM VNT / 2026-07-01T01:00:00+00:00)
  { id: '24623cb4-55eb-40d3-bf8f-60d4ea4d97bd', homeName: 'Mexico', awayName: null },
  // 9. Belgium vs 3A/3E/3H/3I/3J (Jul 2 3:00 AM VNT / 2026-07-01T20:00:00+00:00)
  { id: '0f29e77a-6db5-472e-a596-81cf416f40cb', homeName: 'Bỉ', awayName: null },
  // 10. USA vs Bosnia and Herzegovina (Jul 2 7:00 AM VNT / 2026-07-02T00:00:00+00:00)
  { id: 'c1f5a56f-c57d-4393-b397-6ad8b4444e95', homeName: 'Mỹ', awayName: 'Bosnia và Herzegovina' },
  // 11. Spain vs 2J (Jul 3 2:00 AM VNT / 2026-07-02T19:00:00+00:00)
  { id: '9db3381a-1314-4528-98ce-ef2d057f999e', homeName: 'Tây Ban Nha', awayName: null },
  // 13. Switzerland vs 3E/3F/3G/3I/3J (Jul 3 10:00 AM VNT / 2026-07-03T03:00:00+00:00)
  { id: '8ac18879-c14d-41d7-a52a-61d12229180b', homeName: 'Thụy Sĩ', awayName: null },
  // 14. Australia vs Egypt (Jul 4 1:00 AM VNT / 2026-07-03T18:00:00+00:00)
  { id: '9cd98f4a-e6d9-4323-9a8b-5bb144b700dd', homeName: 'Úc', awayName: 'Ai Cập' },
  // 15. Argentina vs Cape Verde (Jul 4 5:00 AM VNT / 2026-07-03T22:00:00+00:00)
  { id: '72303942-7ac0-4dce-965c-ced65e2e1b49', homeName: 'Argentina', awayName: 'Cape Verde' }
];

async function run() {
  // First fetch all team IDs
  const { data: teams } = await supabase.from('teams').select('id, name');
  const teamMap = {};
  teams.forEach(t => teamMap[t.name] = t.id);

  console.log("Team Map Check:");
  let hasError = false;
  matchUpdates.forEach(update => {
    if (update.homeName && !teamMap[update.homeName]) { console.error("Missing team: ", update.homeName); hasError = true; }
    if (update.awayName && !teamMap[update.awayName]) { console.error("Missing team: ", update.awayName); hasError = true; }
  });

  if (hasError) {
    console.log("Fix missing team names before updating.");
    return;
  }

  // Update matches
  // NOTE: Anonymous key does NOT bypass RLS. 
  // Let me output the curl commands with admin key from bash instead!
  // Oh wait, I can just write a Next.js API route to do it locally, or use a POST fetch locally.
  console.log("Ready to update.");
}
run();
