-- Seed the game catalog rows required by game_sessions.level_id foreign keys.
-- Run this in Supabase SQL Editor after deploying the app changes.

insert into public.games (id, title, domain, language, status)
values
  ('arabic_poet_puzzle', 'كنوز الألفاظ', 'arabic_language', 'ar', 'active')
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
  (
    'arabic_poet_puzzle_level_1',
    'arabic_poet_puzzle',
    'كنوز الألفاظ - ألفاظ شعرية قديمة',
    'beginner',
    7,
    true
  ),
  (
    'arabic_emotion_poetry_level_1',
    'arabic_poet_puzzle',
    'كنوز الألفاظ - خريطة العاطفة في الشعر العربي',
    'intermediate',
    8,
    true
  ),
  (
    'arabic_majnun_layla_level_1',
    'arabic_poet_puzzle',
    'كنوز الألفاظ - خريطة العشق والفراق',
    'advanced',
    10,
    true
  )
on conflict (id) do update set
  game_id = excluded.game_id,
  title = excluded.title,
  difficulty = excluded.difficulty,
  estimated_minutes = excluded.estimated_minutes,
  is_active = excluded.is_active;
