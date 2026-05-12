-- Demo data for Laqiya Secondary School.
-- Creates students, auth users, full assessment results, personality profiles,
-- game sessions, and game career signals for principal/dashboard testing.
--
-- Demo login password for all seeded students: Test123456!

create extension if not exists pgcrypto;

do $$
declare
  laqiya_school_id uuid;
  physics_id uuid;
  math_id uuid;
  biology_id uuid;
  chemistry_id uuid;
  arabic_id uuid;
  hebrew_id uuid;
  cs_id uuid;
  literature_id uuid;
  student_row record;
  subj record;
  assessment_session_id uuid;
  personality_session_id uuid;
  seeded_game_session_id uuid;
  degree_row record;
begin
  insert into public.schools (name_ar, name_he, city_ar, city_he, region, school_type, is_active)
  values (
    'Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ù„Ù‚ÙŠØ© Ø§Ù„Ø«Ø§Ù†ÙˆÙŠØ©',
    '×‘×™×ª ×”×¡×¤×¨ ×”×ª×™×›×•×Ÿ ×œ×§×™×”',
    'Ø§Ù„Ù„Ù‚ÙŠØ©',
    '×œ×§×™×”',
    'Ø§Ù„Ù†Ù‚Ø¨',
    'high_school',
    true
  )
  on conflict (name_ar) do update set
    name_he = excluded.name_he,
    city_ar = excluded.city_ar,
    city_he = excluded.city_he,
    region = excluded.region,
    school_type = excluded.school_type,
    is_active = true,
    updated_at = now();

  select id into laqiya_school_id
  from public.schools
  where name_ar = 'Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ù„Ù‚ÙŠØ© Ø§Ù„Ø«Ø§Ù†ÙˆÙŠØ©'
  limit 1;

  insert into public.subjects (id, code, name_ar, name_he, name_en, point_level, category, is_active)
  values
    ('20000000-0000-0000-0000-000000000001', 'physics', 'ÙÙŠØ²ÙŠØ§Ø¡', '×¤×™×–×™×§×”', 'Physics', 5, 'stem', false),
    ('20000000-0000-0000-0000-000000000002', 'math', 'Ø±ÙŠØ§Ø¶ÙŠØ§Øª', '×ž×ª×ž×˜×™×§×”', 'Math', 5, 'stem', false),
    ('20000000-0000-0000-0000-000000000003', 'biology', 'Ø£Ø­ÙŠØ§Ø¡', '×‘×™×•×œ×•×’×™×”', 'Biology', 5, 'stem', false),
    ('20000000-0000-0000-0000-000000000004', 'chemistry', 'ÙƒÙŠÙ…ÙŠØ§Ø¡', '×›×™×ž×™×”', 'Chemistry', 5, 'stem', false),
    ('20000000-0000-0000-0000-000000000005', 'arabic', 'Ù„ØºØ© Ø¹Ø±Ø¨ÙŠØ©', '×¢×¨×‘×™×ª', 'Arabic', 5, 'humanities', false),
    ('20000000-0000-0000-0000-000000000006', 'hebrew', 'Ù„ØºØ© Ø¹Ø¨Ø±ÙŠØ©', '×¢×‘×¨×™×ª', 'Hebrew', 5, 'humanities', false),
    ('20000000-0000-0000-0000-000000000007', 'computer_science', 'Ø¹Ù„ÙˆÙ… Ø§Ù„Ø­Ø§Ø³ÙˆØ¨', '×ž×“×¢×™ ×”×ž×—×©×‘', 'Computer Science', 5, 'stem', false),
    ('20000000-0000-0000-0000-000000000008', 'literature', 'Ø£Ø¯Ø¨', '×¡×¤×¨×•×ª', 'Literature', 5, 'humanities', false)
  on conflict (code) do update set
    name_ar = excluded.name_ar,
    name_he = excluded.name_he,
    name_en = excluded.name_en;

  select id into physics_id from public.subjects where code = 'physics';
  select id into math_id from public.subjects where code = 'math';
  select id into biology_id from public.subjects where code = 'biology';
  select id into chemistry_id from public.subjects where code = 'chemistry';
  select id into arabic_id from public.subjects where code = 'arabic';
  select id into hebrew_id from public.subjects where code = 'hebrew';
  select id into cs_id from public.subjects where code = 'computer_science';
  select id into literature_id from public.subjects where code = 'literature';

  insert into public.games (id, title, domain, language, status)
  values
    ('physics_bridge_game', 'Bridge Engineer', 'engineering', 'ar', 'active'),
    ('physics_lab', 'Physics Lab', 'science', 'ar', 'active'),
    ('doctor_soroka', 'Doctor at Soroka', 'medical', 'he', 'active'),
    ('arabic_poet_puzzle', 'Word Treasures', 'language', 'ar', 'active')
  on conflict (id) do update set status = 'active';

  -- Degree catalog rows used by recommendations and game career signals.
  insert into public.degrees (id, code, name_ar, name_he, name_en, category, is_active)
  values
    ('30000000-0000-0000-0000-000000000004', 'medicine', 'Ø·Ø¨', '×¨×¤×•××”', 'Medicine', 'bachelor', true),
    ('30000000-0000-0000-0000-000000000006', 'medical_laboratory_science', 'Ù…Ø®ØªØ¨Ø±Ø§Øª Ø·Ø¨ÙŠØ©', '×ž×“×¢×™ ×”×ž×¢×‘×“×” ×”×¨×¤×•××™×ª', 'Medical Laboratory Science', 'bachelor', true),
    ('30000000-0000-0000-0000-000000000007', 'arabic_language', 'Ù„ØºØ© Ø¹Ø±Ø¨ÙŠØ©', '×¢×¨×‘×™×ª', 'Arabic Language', 'bachelor', true),
    ('30000000-0000-0000-0000-000000000008', 'translation', 'ØªØ±Ø¬Ù…Ø©', '×ª×¨×’×•×', 'Translation', 'bachelor', true)
  on conflict (code) do update set
    name_ar = excluded.name_ar,
    name_he = excluded.name_he,
    name_en = excluded.name_en,
    is_active = true;

  -- Subject weights per degree.
  delete from public.degree_subject_weights
  where degree_id in (select id from public.degrees where code in (
    'medicine','medical_laboratory_science','arabic_language','translation'
  ));

  for degree_row in select id, code from public.degrees loop
    if degree_row.code in ('electrical_engineering','mechanical_engineering','civil_engineering','architecture','physics','EE_BSC','ME_BSC','CE_BSC','ARCH_BARCH','PHYS_BSC') then
      insert into public.degree_subject_weights (degree_id, subject_id, weight)
      values (degree_row.id, physics_id, 0.45), (degree_row.id, math_id, 0.40), (degree_row.id, cs_id, 0.15)
      on conflict do nothing;
    elsif degree_row.code in ('computer_science','data_science','CS_BSC','DATA_BSC','SE_BSC','AI_BSC','CYBER_BSC') then
      insert into public.degree_subject_weights (degree_id, subject_id, weight)
      values (degree_row.id, cs_id, 0.45), (degree_row.id, math_id, 0.40), (degree_row.id, physics_id, 0.15)
      on conflict do nothing;
    elsif degree_row.code in ('medicine','nursing','medical_laboratory_science','biotechnology','NURS_BN','BIOTECH_BSC','BIO_BSC','CHEM_BSC','NUTR_BSC','PT_BPT','OT_BOT') then
      insert into public.degree_subject_weights (degree_id, subject_id, weight)
      values (degree_row.id, biology_id, 0.45), (degree_row.id, chemistry_id, 0.35), (degree_row.id, hebrew_id, 0.20)
      on conflict do nothing;
    elsif degree_row.code in ('arabic_language','translation','education','media','law','EDU_BED','COM_BA','LAW_LLB','PSY_BA','SOC_BA') then
      insert into public.degree_subject_weights (degree_id, subject_id, weight)
      values (degree_row.id, arabic_id, 0.45), (degree_row.id, hebrew_id, 0.25), (degree_row.id, literature_id, 0.30)
      on conflict do nothing;
    end if;
  end loop;

  create temporary table if not exists tmp_laqiya_students (
    student_uuid uuid,
    user_uuid uuid,
    student_code text,
    first_name text,
    last_name text,
    email text,
    phone text,
    grade int,
    class_section text,
    focus text,
    physics int,
    math int,
    biology int,
    chemistry int,
    arabic int,
    hebrew int,
    cs int,
    literature int
  ) on commit drop;

  truncate table tmp_laqiya_students;

  insert into tmp_laqiya_students values
    ('40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','326000001','ÙŠØ§Ø³Ø±','Ø§Ù„ØµØ§Ù†Ø¹','yaser.alsane.demo@i3dad.test','0527001001',12,'alef','engineering',88,84,51,55,62,66,79,58),
    ('40000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002','326000002','Ø³Ø§Ø±Ø©','Ø§Ù„Ø£Ø³Ø¯','sara.alasad.demo@i3dad.test','0527001002',11,'bet','medical',56,61,91,86,69,78,52,64),
    ('40000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000003','326000003','Ù…Ø­Ù…Ø¯','Ø£Ø¨Ùˆ Ø¨Ø¯Ø±','mohammad.abubader.demo@i3dad.test','0527001003',10,'gimel','language',49,53,57,50,92,84,55,88),
    ('40000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000004','326000004','Ø±ÙŠÙ…','Ø§Ù„ØµØ§Ù†Ø¹','reem.alsane.demo@i3dad.test','0527001004',12,'dalet','data',76,89,60,64,72,70,91,63),
    ('40000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000005','326000005','Ø£Ø­Ù…Ø¯','Ø§Ù„Ø£Ø³Ø¯','ahmad.alasad.demo@i3dad.test','0527001005',9,'alef','civil',82,78,48,52,61,59,64,55),
    ('40000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000006','326000006','Ù†ÙˆØ±','Ø£Ø¨Ùˆ Ø¨Ø¯Ø±','noor.abubader.demo@i3dad.test','0527001006',11,'bet','balanced',68,71,74,70,76,79,66,73);

  for student_row in select * from tmp_laqiya_students loop
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      student_row.user_uuid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      student_row.email,
      crypt('Test123456!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"],"role":"student"}'::jsonb,
      jsonb_build_object('role','student','full_name',student_row.first_name || ' ' || student_row.last_name),
      now(),
      now()
    )
    on conflict (id) do update set
      email = excluded.email,
      encrypted_password = excluded.encrypted_password,
      email_confirmed_at = now(),
      raw_app_meta_data = excluded.raw_app_meta_data,
      raw_user_meta_data = excluded.raw_user_meta_data,
      updated_at = now();

    insert into auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      student_row.user_uuid,
      student_row.user_uuid,
      student_row.user_uuid::text,
      jsonb_build_object('sub', student_row.user_uuid::text, 'email', student_row.email, 'email_verified', true),
      'email',
      now(),
      now(),
      now()
    )
    on conflict (provider, provider_id) do update set
      identity_data = excluded.identity_data,
      updated_at = now();

    -- The project has a prevent_multi_role trigger. If a previous partial seed
    -- created user_profiles before students, remove the profile for this demo
    -- user, insert/update the student role row, then recreate user_profiles.
    delete from public.user_profiles
    where user_id = student_row.user_uuid;

    if exists (select 1 from public.students where id = student_row.student_uuid) then
      update public.students
      set
        user_id = student_row.user_uuid,
        student_id = student_row.student_code,
        identity_number = student_row.student_code,
        first_name = student_row.first_name,
        last_name = student_row.last_name,
        full_name = student_row.first_name || ' ' || student_row.last_name,
        phone = student_row.phone,
        email = student_row.email,
        birthday = date '2008-03-15' + ((student_row.grade - 9) * interval '1 year'),
        school_name = 'Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ù„Ù‚ÙŠØ© Ø§Ù„Ø«Ø§Ù†ÙˆÙŠØ©',
        school_id = laqiya_school_id,
        grade = student_row.grade,
        class_section = student_row.class_section,
        preferred_language = 'ar',
        is_active = true,
        last_sign_in_at = now() - ((12 - student_row.grade + 1) * interval '2 days'),
        updated_at = now()
      where id = student_row.student_uuid;
    else
      insert into public.students (
        id,
        user_id,
        student_id,
        identity_number,
        first_name,
        last_name,
        full_name,
        phone,
        email,
        birthday,
        school_name,
        school_id,
        grade,
        class_section,
        preferred_language,
        is_active,
        last_sign_in_at,
        created_at,
        updated_at
      )
      values (
        student_row.student_uuid,
        student_row.user_uuid,
        student_row.student_code,
        student_row.student_code,
        student_row.first_name,
        student_row.last_name,
        student_row.first_name || ' ' || student_row.last_name,
        student_row.phone,
        student_row.email,
        date '2008-03-15' + ((student_row.grade - 9) * interval '1 year'),
        'Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ù„Ù‚ÙŠØ© Ø§Ù„Ø«Ø§Ù†ÙˆÙŠØ©',
        laqiya_school_id,
        student_row.grade,
        student_row.class_section,
        'ar',
        true,
        now() - ((12 - student_row.grade + 1) * interval '2 days'),
        now() - interval '45 days',
        now()
      );
    end if;

    insert into public.user_profiles (user_id, role, school_id, full_name, display_name, phone, preferred_language, is_active)
    values (
      student_row.user_uuid,
      'student'::app_role,
      laqiya_school_id,
      student_row.first_name || ' ' || student_row.last_name,
      student_row.first_name || ' ' || student_row.last_name,
      student_row.phone,
      'ar',
      true
    )
    on conflict (user_id) do update set
      role = 'student'::app_role,
      school_id = excluded.school_id,
      full_name = excluded.full_name,
      display_name = excluded.display_name,
      phone = excluded.phone,
      preferred_language = 'ar',
      is_active = true,
      updated_at = now();

    assessment_session_id := ('60000000-0000-0000-0000-' || lpad(right(replace(student_row.student_uuid::text,'-',''), 12), 12, '0'))::uuid;

    insert into public.test_sessions (
      id,
      student_id,
      school_id,
      session_type,
      status,
      language,
      target_questions,
      questions_answered,
      final_score,
      correct_answers,
      wrong_answers,
      skipped_questions,
      engagement_score,
      started_at,
      completed_at,
      total_time_seconds,
      active_time_seconds,
      idle_time_seconds,
      focus_lost_count,
      metadata
    )
    values (
      assessment_session_id,
      student_row.student_uuid,
      laqiya_school_id,
      'full_assessment',
      'completed',
      'ar',
      80,
      72,
      round(((student_row.physics + student_row.math + student_row.biology + student_row.chemistry + student_row.arabic + student_row.hebrew + student_row.cs + student_row.literature) / 8.0)::numeric, 2),
      55,
      14,
      3,
      case student_row.focus when 'balanced' then 76 when 'language' then 81 when 'medical' then 84 else 79 end,
      now() - interval '20 days',
      now() - interval '20 days' + interval '75 minutes',
      4500,
      3920,
      580,
      2,
      jsonb_build_object('examType','total_exam','seed','laqiya_demo')
    )
    on conflict (id) do update set
      final_score = excluded.final_score,
      engagement_score = excluded.engagement_score,
      completed_at = excluded.completed_at,
      metadata = excluded.metadata,
      updated_at = now();

    delete from public.student_abilities
    where student_id = student_row.student_uuid
      and metadata->>'seed' = 'laqiya_demo';

    delete from public.student_interests
    where student_id = student_row.student_uuid
      and metadata->>'seed' = 'laqiya_demo';

    delete from public.student_learning_potential
    where student_id = student_row.student_uuid;

    -- Ability / interest / learning potential snapshots per subject.
    for subj in
      select physics_id as subject_id, student_row.physics as score, 76 as interest
      union all select math_id, student_row.math, 74
      union all select biology_id, student_row.biology, case when student_row.focus = 'medical' then 90 else 58 end
      union all select chemistry_id, student_row.chemistry, case when student_row.focus = 'medical' then 84 else 56 end
      union all select arabic_id, student_row.arabic, case when student_row.focus = 'language' then 92 else 65 end
      union all select hebrew_id, student_row.hebrew, case when student_row.focus in ('medical','language') then 82 else 62 end
      union all select cs_id, student_row.cs, case when student_row.focus = 'data' then 91 else 67 end
      union all select literature_id, student_row.literature, case when student_row.focus = 'language' then 88 else 60 end
    loop
      insert into public.student_abilities (
        student_id,
        subject_id,
        ability_score,
        theta_estimate,
        standard_error,
        confidence_level,
        total_questions_answered,
        correct_answers,
        accuracy_rate,
        last_assessed_at,
        last_session_id,
        metadata
      )
      values (
        student_row.student_uuid,
        subj.subject_id,
        subj.score,
        round((((subj.score - 50) / 50.0) * 3.0)::numeric, 3),
        0.32,
        86,
        9,
        greatest(1, round((subj.score / 100.0) * 9)),
        subj.score,
        now() - interval '20 days',
        assessment_session_id,
        jsonb_build_object('examType','total_exam','seed','laqiya_demo')
      );

      insert into public.student_interests (
        student_id,
        subject_id,
        interest_score,
        time_spent_seconds,
        questions_attempted,
        voluntary_attempts,
        avg_time_per_question,
        completion_rate,
        discovered_at,
        discovery_session_id,
        metadata
      )
      values (
        student_row.student_uuid,
        subj.subject_id,
        subj.interest,
        720 + subj.interest * 7,
        9,
        case when subj.interest > 80 then 2 else 0 end,
        55 + (100 - subj.interest) / 3.0,
        subj.score,
        now() - interval '20 days',
        assessment_session_id,
        jsonb_build_object('examType','total_exam','seed','laqiya_demo','sessionEngagement',jsonb_build_object('engagementScore',80))
      );

      insert into public.student_learning_potential (
        student_id,
        subject_id,
        potential_score,
        ability_component,
        interest_component,
        growth_component,
        ability_growth_rate,
        recent_improvement,
        recommendation_weight,
        confidence_level
      )
      values (
        student_row.student_uuid,
        subj.subject_id,
        round((subj.score * 0.45 + subj.interest * 0.45 + 78 * 0.10)::numeric, 2),
        subj.score,
        subj.interest,
        78,
        8.5,
        true,
        1.0,
        84
      );
    end loop;

    personality_session_id := ('70000000-0000-0000-0000-' || lpad(right(replace(student_row.student_uuid::text,'-',''), 12), 12, '0'))::uuid;

    insert into public.personality_test_sessions (
      id,
      student_id,
      language,
      status,
      total_questions,
      questions_answered,
      started_at,
      completed_at,
      total_time_seconds,
      metadata
    )
    values (
      personality_session_id,
      student_row.student_uuid,
      'ar',
      'completed',
      50,
      50,
      now() - interval '18 days',
      now() - interval '18 days' + interval '24 minutes',
      1440,
      jsonb_build_object('seed','laqiya_demo')
    )
    on conflict (id) do update set
      status = excluded.status,
      questions_answered = excluded.questions_answered,
      completed_at = excluded.completed_at,
      total_time_seconds = excluded.total_time_seconds,
      metadata = excluded.metadata,
      updated_at = now();

    insert into public.student_personality_profiles (
      student_id,
      session_id,
      openness,
      conscientiousness,
      extraversion,
      agreeableness,
      neuroticism,
      confidence_level,
      answered_count,
      summary_ar,
      summary_he,
      summary_en,
      metadata
    )
    values (
      student_row.student_uuid,
      personality_session_id,
      case student_row.focus when 'language' then 86 when 'data' then 74 else 70 end,
      case student_row.focus when 'engineering' then 84 when 'medical' then 82 else 76 end,
      58,
      case student_row.focus when 'medical' then 86 else 72 end,
      34,
      87,
      50,
      'Ù…Ù„Ù Ø´Ø®ØµÙŠØ© ØªØ¬Ø±ÙŠØ¨ÙŠ Ù„Ø§Ø®ØªØ¨Ø§Ø± Ø§Ù„ØªÙˆØµÙŠØ§Øª.',
      '×¤×¨×•×¤×™×œ ××™×©×™×•×ª ×œ×“×•×’×ž×” ×œ×‘×“×™×§×ª ×”×ž×œ×¦×•×ª.',
      'Demo personality profile for recommendation testing.',
      jsonb_build_object('seed','laqiya_demo')
    )
    on conflict on constraint student_personality_profiles_session_id_key do update set
      openness = excluded.openness,
      conscientiousness = excluded.conscientiousness,
      extraversion = excluded.extraversion,
      agreeableness = excluded.agreeableness,
      neuroticism = excluded.neuroticism,
      confidence_level = excluded.confidence_level,
      updated_at = now();

    -- Game sessions: choose strong game per student and one secondary game.
    foreach seeded_game_session_id in array array[
      ('80000000-0000-0000-0000-' || lpad(right(replace(student_row.student_uuid::text,'-',''), 12), 12, '0'))::uuid,
      ('80000000-0000-0001-0000-' || lpad(right(replace(student_row.student_uuid::text,'-',''), 12), 12, '0'))::uuid
    ] loop
      insert into public.game_sessions (
        id,
        student_id,
        game_id,
        level_id,
        status,
        language,
        started_at,
        ended_at,
        hebrew_score,
        medical_reasoning_score,
        engagement_score,
        interest_signal,
        trust_score,
        current_scene_id,
        created_at
      )
      values (
        seeded_game_session_id,
        student_row.student_uuid,
        case
          when seeded_game_session_id::text like '80000000-0000-0000-%' then
            case student_row.focus
              when 'medical' then 'doctor_soroka'
              when 'language' then 'arabic_poet_puzzle'
              when 'civil' then 'physics_bridge_game'
              when 'data' then 'physics_lab'
              else 'physics_bridge_game'
            end
          else
            case student_row.focus
              when 'medical' then 'physics_lab'
              when 'language' then 'doctor_soroka'
              else 'physics_lab'
            end
        end,
        null,
        'completed',
        'ar',
        now() - interval '12 days',
        now() - interval '12 days' + interval '18 minutes',
        case when student_row.focus in ('medical','language') then 82 else 65 end,
        case when student_row.focus = 'medical' then 91 else 55 end,
        case student_row.focus when 'balanced' then 74 else 86 end,
        case student_row.focus when 'balanced' then 70 else 88 end,
        case student_row.focus when 'medical' then 89 when 'civil' then 86 when 'engineering' then 84 else 78 end,
        'summary',
        now() - interval '12 days'
      )
      on conflict (id) do update set
        game_id = excluded.game_id,
        status = excluded.status,
        hebrew_score = excluded.hebrew_score,
        medical_reasoning_score = excluded.medical_reasoning_score,
        engagement_score = excluded.engagement_score,
        interest_signal = excluded.interest_signal,
        trust_score = excluded.trust_score,
        ended_at = excluded.ended_at;

      delete from public.game_action_logs
      where public.game_action_logs.game_session_id = seeded_game_session_id;

      insert into public.game_action_logs (
        game_session_id,
        scene_id,
        choice_id,
        action_type,
        time_to_choose_ms,
        is_optimal,
        created_at
      )
      values
        (seeded_game_session_id, 'scene-1', 'choice-a', 'choice', 6200, true, now() - interval '12 days'),
        (seeded_game_session_id, 'scene-2', 'choice-b', 'choice', 8700, true, now() - interval '12 days'),
        (seeded_game_session_id, 'scene-3', 'choice-c', 'choice', 14200, true, now() - interval '12 days'),
        (seeded_game_session_id, 'scene-4', 'choice-a', 'choice', 5300, true, now() - interval '12 days'),
        (seeded_game_session_id, 'scene-5', 'choice-d', 'choice', 11000, student_row.focus <> 'balanced', now() - interval '12 days')
      on conflict do nothing;
    end loop;
  end loop;
end $$;

-- The app service computes game career signals when sessions complete.
-- For SQL-only seeding, create simplified signal rows for dashboard/report testing.
insert into public.student_game_skills (
  student_id, game_session_id, game_key, topic_key, skill_tag,
  ability_signal, interest_signal, signal_strength, metadata
)
select
  gs.student_id,
  gs.id,
  replace(gs.game_id, '-', '_'),
  case
    when gs.game_id = 'doctor_soroka' then 'diagnosis'
    when gs.game_id = 'arabic_poet_puzzle' then 'context_understanding'
    when gs.game_id = 'physics_lab' then 'electricity_circuits'
    else 'bridge_stability'
  end,
  skill_tag,
  greatest(45, least(100, coalesce(gs.trust_score, 70))),
  greatest(45, least(100, coalesce(gs.interest_signal, 70))),
  greatest(45, least(100, round((coalesce(gs.trust_score, 70) + coalesce(gs.interest_signal, 70)) / 2.0))),
  jsonb_build_object(
    'seed','laqiya_demo',
    'game_key',replace(gs.game_id, '-', '_'),
    'topic_key',case
      when gs.game_id = 'doctor_soroka' then 'diagnosis'
      when gs.game_id = 'arabic_poet_puzzle' then 'context_understanding'
      when gs.game_id = 'physics_lab' then 'electricity_circuits'
      else 'bridge_stability'
    end
  )
from public.game_sessions gs
cross join lateral unnest(
  case
    when gs.game_id = 'doctor_soroka' then array['medical_reasoning','clinical_reading','decision_making']
    when gs.game_id = 'arabic_poet_puzzle' then array['reading_comprehension','semantic_reasoning','interpretation']
    when gs.game_id = 'physics_lab' then array['circuit_logic','scientific_prediction','problem_solving']
    else array['spatial_reasoning','force_distribution','engineering_planning']
  end
) as skill_tag
join public.students s on s.id = gs.student_id
where s.school_id = (
  select id from public.schools where name_ar = 'Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ù„Ù‚ÙŠØ© Ø§Ù„Ø«Ø§Ù†ÙˆÙŠØ©' limit 1
)
on conflict (student_id, game_session_id, topic_key, skill_tag) do update set
  ability_signal = excluded.ability_signal,
  interest_signal = excluded.interest_signal,
  signal_strength = excluded.signal_strength,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.student_career_signals (
  student_id, game_session_id, game_key, topic_key, degree_code, degree_id,
  ability_signal, interest_signal, signal_weight, career_signal, metadata
)
select
  gs.student_id,
  gs.id,
  replace(gs.game_id, '-', '_'),
  topic_key,
  degree_code,
  d.id,
  greatest(45, least(100, coalesce(gs.trust_score, 70))),
  greatest(45, least(100, coalesce(gs.interest_signal, 70))),
  1.0,
  greatest(70, least(200, coalesce(gs.trust_score, 70) + coalesce(gs.interest_signal, 70))),
  jsonb_build_object(
    'seed','laqiya_demo',
    'game_key',replace(gs.game_id, '-', '_'),
    'topic_key',topic_key,
    'related_degrees',degree_codes,
    'skill_tags',skill_tags,
    'ability_signal',greatest(45, least(100, coalesce(gs.trust_score, 70))),
    'interest_signal',greatest(45, least(100, coalesce(gs.interest_signal, 70))),
    'reason_ar',reason_ar,
    'reason_he',reason_he,
    'reason_en',reason_en
  )
from public.game_sessions gs
join public.students s on s.id = gs.student_id
cross join lateral (
  select
    case
      when gs.game_id = 'doctor_soroka' then 'diagnosis'
      when gs.game_id = 'arabic_poet_puzzle' then 'context_understanding'
      when gs.game_id = 'physics_lab' then 'electricity_circuits'
      else 'bridge_stability'
    end as topic_key,
    case
      when gs.game_id = 'doctor_soroka' then array['medicine','NURS_BN','medical_laboratory_science']
      when gs.game_id = 'arabic_poet_puzzle' then array['translation','COM_BA','LAW_LLB','EDU_BED']
      when gs.game_id = 'physics_lab' then array['EE_BSC','CS_BSC','DATA_BSC']
      else array['CE_BSC','ARCH_BARCH','ME_BSC']
    end as degree_codes,
    case
      when gs.game_id = 'doctor_soroka' then array['medical_reasoning','clinical_reading','decision_making']
      when gs.game_id = 'arabic_poet_puzzle' then array['reading_comprehension','semantic_reasoning','interpretation']
      when gs.game_id = 'physics_lab' then array['circuit_logic','scientific_prediction','problem_solving']
      else array['spatial_reasoning','force_distribution','engineering_planning']
    end as skill_tags,
    case
      when gs.game_id = 'doctor_soroka' then 'Ø£Ø¯Ø§Ø¤Ùƒ ÙÙŠ Ù„Ø¹Ø¨Ø© Ø§Ù„Ø·Ø¨ÙŠØ¨ Ø£Ø¸Ù‡Ø± Ù‚Ø¯Ø±Ø© Ø¹Ù„Ù‰ Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ù…Ø¹Ø·ÙŠØ§Øª Ø§Ù„Ø·Ø¨ÙŠØ©ØŒ Ù„Ø°Ù„Ùƒ Ø²Ø§Ø¯Øª Ø¥Ø´Ø§Ø±ØªÙƒ Ù†Ø­Ùˆ Ø§Ù„Ø·Ø¨ØŒ Ø§Ù„ØªÙ…Ø±ÙŠØ¶ØŒ ÙˆØ§Ù„Ù…Ø®ØªØ¨Ø±Ø§Øª Ø§Ù„Ø·Ø¨ÙŠØ©.'
      when gs.game_id = 'arabic_poet_puzzle' then 'Ø£Ø¯Ø§Ø¤Ùƒ ÙÙŠ ÙƒÙ†ÙˆØ² Ø§Ù„Ø£Ù„ÙØ§Ø¸ Ø£Ø¸Ù‡Ø± ÙÙ‡Ù…Ø§Ù‹ Ø¬ÙŠØ¯Ø§Ù‹ Ù„Ù„Ù…Ø¹Ø§Ù†ÙŠ ÙˆØ§Ù„Ø³ÙŠØ§Ù‚ØŒ Ù„Ø°Ù„Ùƒ Ø²Ø§Ø¯Øª Ø¥Ø´Ø§Ø±ØªÙƒ Ù†Ø­Ùˆ Ø§Ù„Ù„ØºØ©ØŒ Ø§Ù„ØªØ±Ø¬Ù…Ø©ØŒ Ø§Ù„Ø¥Ø¹Ù„Ø§Ù…ØŒ ÙˆØ§Ù„ØªØ±Ø¨ÙŠØ©.'
      when gs.game_id = 'physics_lab' then 'Ø£Ø¯Ø§Ø¤Ùƒ ÙÙŠ Ù…Ø®ØªØ¨Ø± Ø§Ù„ÙÙŠØ²ÙŠØ§Ø¡ Ø£Ø¸Ù‡Ø± ØªÙÙƒÙŠØ±Ø§Ù‹ Ø¹Ù„Ù…ÙŠØ§Ù‹ ÙˆØµØ¨Ø±Ø§Ù‹ ÙÙŠ Ø§Ù„ØªØ¬Ø±Ø¨Ø©ØŒ Ù„Ø°Ù„Ùƒ Ø²Ø§Ø¯Øª Ø¥Ø´Ø§Ø±ØªÙƒ Ù†Ø­Ùˆ Ø§Ù„Ù‡Ù†Ø¯Ø³Ø© ÙˆØ§Ù„ÙÙŠØ²ÙŠØ§Ø¡.'
      else 'Ø£Ø¯Ø§Ø¤Ùƒ ÙÙŠ Ù…Ù‡Ù†Ø¯Ø³ Ø§Ù„Ø¬Ø³ÙˆØ± Ø£Ø¸Ù‡Ø± ØªÙÙƒÙŠØ±Ø§Ù‹ Ù…ÙƒØ§Ù†ÙŠØ§Ù‹ ÙˆØªØ®Ø·ÙŠØ·Ø§Ù‹ Ù‡Ù†Ø¯Ø³ÙŠØ§Ù‹ØŒ Ù„Ø°Ù„Ùƒ Ø²Ø§Ø¯Øª Ø¥Ø´Ø§Ø±ØªÙƒ Ù†Ø­Ùˆ Ø§Ù„Ù‡Ù†Ø¯Ø³Ø© Ø§Ù„Ù…Ø¯Ù†ÙŠØ©ØŒ Ø§Ù„Ø¹Ù…Ø§Ø±Ø©ØŒ ÙˆØ§Ù„Ù‡Ù†Ø¯Ø³Ø© Ø§Ù„Ù…ÙŠÙƒØ§Ù†ÙŠÙƒÙŠØ©.'
    end as reason_ar,
    '××•×ª ×ž×©×—×§ ×œ×“×•×’×ž×” ×©×ž×—×–×§×ª ××ª ×”×ª××ž×ª ×”×ž×¡×œ×•×œ.' as reason_he,
    'Demo game signal supporting this career direction.' as reason_en
) topic
cross join lateral unnest(topic.degree_codes) as degree_code
left join public.degrees d on d.code = degree_code
where s.school_id = (
  select id from public.schools where name_ar = 'Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ù„Ù‚ÙŠØ© Ø§Ù„Ø«Ø§Ù†ÙˆÙŠØ©' limit 1
)
on conflict (student_id, game_session_id, topic_key, degree_code) do update set
  degree_id = excluded.degree_id,
  ability_signal = excluded.ability_signal,
  interest_signal = excluded.interest_signal,
  career_signal = excluded.career_signal,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.student_game_interests (
  student_id, game_session_id, game_key, topic_key, related_subject,
  ability_signal, interest_signal, signal_weight, metadata
)
select
  gs.student_id,
  gs.id,
  replace(gs.game_id, '-', '_'),
  case
    when gs.game_id = 'doctor_soroka' then 'diagnosis'
    when gs.game_id = 'arabic_poet_puzzle' then 'context_understanding'
    when gs.game_id = 'physics_lab' then 'electricity_circuits'
    else 'bridge_stability'
  end,
  related_subject,
  greatest(45, least(100, coalesce(gs.trust_score, 70))),
  greatest(45, least(100, coalesce(gs.interest_signal, 70))),
  1.0,
  jsonb_build_object('seed','laqiya_demo')
from public.game_sessions gs
join public.students s on s.id = gs.student_id
cross join lateral unnest(
  case
    when gs.game_id = 'doctor_soroka' then array['biology','chemistry','hebrew']
    when gs.game_id = 'arabic_poet_puzzle' then array['arabic','literature']
    when gs.game_id = 'physics_lab' then array['physics','math','computer_science']
    else array['physics','math']
  end
) as related_subject
where s.school_id = (
  select id from public.schools where name_ar = 'Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ù„Ù‚ÙŠØ© Ø§Ù„Ø«Ø§Ù†ÙˆÙŠØ©' limit 1
)
on conflict (student_id, game_session_id, topic_key, related_subject) do update set
  ability_signal = excluded.ability_signal,
  interest_signal = excluded.interest_signal,
  metadata = excluded.metadata,
  updated_at = now();

select
  'ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø¨ÙŠØ§Ù†Ø§Øª ØªØ¬Ø±ÙŠØ¨ÙŠØ© Ù„Ø·Ù„Ø§Ø¨ Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ù„Ù‚ÙŠØ© Ø§Ù„Ø«Ø§Ù†ÙˆÙŠØ©' as message,
  count(*) as students_count
from public.students
where school_id = (
  select id from public.schools where name_ar = 'Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ù„Ù‚ÙŠØ© Ø§Ù„Ø«Ø§Ù†ÙˆÙŠØ©' limit 1
);
