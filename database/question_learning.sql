-- Question bank learning: priority scores derived from usage outcomes.
-- Safe to run multiple times on existing Supabase projects.

alter table public.questions
  add column if not exists selection_priority numeric(6, 2) not null default 50;

alter table public.questions
  add column if not exists avg_time_seconds numeric(8, 2);

comment on column public.questions.selection_priority is
  '0-100 learning score: higher priority questions are preferred when difficulty ties exist.';

comment on column public.questions.avg_time_seconds is
  'Running average response time in seconds across student answers.';

create index if not exists idx_questions_subject_priority
  on public.questions (subject_id, selection_priority desc)
  where is_active = true;

-- Back-fill priorities from existing usage counters when present.
update public.questions q
set selection_priority = round(
  least(
    100,
    greatest(
      0,
      50
      + case
          when q.times_used > 0 then
            40 * (1 - abs((q.times_correct::numeric / q.times_used::numeric) - 0.55) / 0.55)
          else 0
        end
      + 10 * least(1, q.discrimination / 1.8)
    )
  )::numeric,
  2
)
where q.selection_priority = 50
  and coalesce(q.times_used, 0) > 0;
