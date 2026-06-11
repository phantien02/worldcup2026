-- Fix incorrect kickoff time for Canada vs Bosnia
-- Was: 2026-06-12T07:00:00+00:00 (14:00 VN)
-- Should be: 2026-06-12T19:00:00+00:00 (02:00 AM VN)

UPDATE matches
SET kickoff_time = '2026-06-12T19:00:00+00:00'
WHERE home_team_id = (SELECT id FROM teams WHERE name = 'Canada')
  AND away_team_id = (SELECT id FROM teams WHERE name = 'Bosnia');
