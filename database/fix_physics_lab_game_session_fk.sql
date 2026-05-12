-- Fix and verify the catalog rows required by game_sessions.level_id.
-- Run this in the same Supabase project used by the app.

insert into public.games (id, title, domain, language, status)
values
  ('physics_lab', 'Physics Lab', 'physics', 'en', 'active'),
  ('physics-lab', 'Physics Lab', 'physics', 'en', 'active')
on conflict (id) do update set
  title = excluded.title,
  domain = excluded.domain,
  language = excluded.language,
  status = excluded.status;

insert into public.game_levels (
  id,
  game_id,
  title,
  difficulty,
  estimated_minutes,
  is_active
)
values
  ('physics_lab_level_1', 'physics_lab', 'Level 1 - Speed', 'beginner', 6, true),
  ('physics_lab_level_2', 'physics_lab', 'Level 2 - Distance', 'intermediate', 8, true),
  ('physics_lab_level_3', 'physics_lab', 'Level 3 - Acceleration', 'advanced', 10, true),
  ('physics-lab-level-1', 'physics-lab', 'Level 1 - Speed', 'beginner', 6, true),
  ('physics-lab-level-2', 'physics-lab', 'Level 2 - Distance', 'intermediate', 8, true),
  ('physics-lab-level-3', 'physics-lab', 'Level 3 - Acceleration', 'advanced', 10, true)
on conflict (id) do update set
  game_id = excluded.game_id,
  title = excluded.title,
  difficulty = excluded.difficulty,
  estimated_minutes = excluded.estimated_minutes,
  is_active = excluded.is_active;

select
  tc.constraint_name,
  kcu.table_schema,
  kcu.table_name,
  kcu.column_name,
  ccu.table_schema as foreign_table_schema,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.constraint_name = 'game_sessions_level_id_fkey';

select id, title, domain, language, status
from public.games
where id in ('physics_lab', 'physics-lab')
order by id;

select id, game_id, title, difficulty, is_active
from public.game_levels
where id in (
  'physics_lab_level_1',
  'physics_lab_level_2',
  'physics_lab_level_3',
  'physics-lab-level-1',
  'physics-lab-level-2',
  'physics-lab-level-3'
)
order by id;
