-- Cleanup duplicate demo degree rows that were added for the Laqiya demo seed.
--
-- The production catalog already has canonical degree rows such as CS_BSC,
-- CE_BSC, EE_BSC, etc. This script moves demo references to those canonical
-- rows, copies any missing demo subject weights, then removes the duplicate
-- demo degree rows.

begin;

create temporary table tmp_demo_degree_aliases (
  demo_code text primary key,
  canonical_code text not null
);

insert into tmp_demo_degree_aliases (demo_code, canonical_code)
values
  ('electrical_engineering', 'EE_BSC'),
  ('computer_science', 'CS_BSC'),
  ('civil_engineering', 'CE_BSC'),
  ('nursing', 'NURS_BN'),
  ('architecture', 'ARCH_BARCH'),
  ('mechanical_engineering', 'ME_BSC'),
  ('data_science', 'DATA_BSC'),
  ('education', 'EDU_BED'),
  ('physics', 'PHYS_BSC'),
  ('biotechnology', 'BIOTECH_BSC'),
  ('law', 'LAW_LLB'),
  ('media', 'COM_BA')
on conflict (demo_code) do update set canonical_code = excluded.canonical_code;

-- Preserve recommendation weights from the demo rows if the canonical row is
-- missing that subject weight.
insert into public.degree_subject_weights (degree_id, subject_id, weight)
select canonical.id, dsw.subject_id, dsw.weight
from tmp_demo_degree_aliases aliases
join public.degrees demo on demo.code = aliases.demo_code
join public.degrees canonical on canonical.code = aliases.canonical_code
join public.degree_subject_weights dsw on dsw.degree_id = demo.id
where not exists (
  select 1
  from public.degree_subject_weights existing
  where existing.degree_id = canonical.id
    and existing.subject_id = dsw.subject_id
)
on conflict do nothing;

-- Move game/career signals to the canonical degree row and canonical code.
delete from public.student_career_signals demo_signal
using tmp_demo_degree_aliases aliases, public.student_career_signals canonical_signal
where demo_signal.degree_code = aliases.demo_code
  and canonical_signal.degree_code = aliases.canonical_code
  and canonical_signal.student_id = demo_signal.student_id
  and canonical_signal.topic_key = demo_signal.topic_key
  and canonical_signal.game_session_id is not distinct from demo_signal.game_session_id;

update public.student_career_signals signals
set degree_id = canonical.id,
    degree_code = canonical.code,
    updated_at = now()
from tmp_demo_degree_aliases aliases
join public.degrees demo on demo.code = aliases.demo_code
join public.degrees canonical on canonical.code = aliases.canonical_code
where signals.degree_id = demo.id
   or signals.degree_code = aliases.demo_code;

-- Remove dependent weights from the demo rows before deleting the rows.
delete from public.degree_personality_weights weights
using tmp_demo_degree_aliases aliases, public.degrees demo, public.degrees canonical
where demo.code = aliases.demo_code
  and canonical.code = aliases.canonical_code
  and weights.degree_id = demo.id;

delete from public.degree_subject_weights weights
using tmp_demo_degree_aliases aliases, public.degrees demo, public.degrees canonical
where demo.code = aliases.demo_code
  and canonical.code = aliases.canonical_code
  and weights.degree_id = demo.id;

delete from public.degrees demo
using tmp_demo_degree_aliases aliases, public.degrees canonical
where demo.code = aliases.demo_code
  and canonical.code = aliases.canonical_code;

commit;

select
  'duplicate demo degrees cleaned' as status,
  array_agg(demo_code order by demo_code) as removed_demo_codes
from tmp_demo_degree_aliases;
