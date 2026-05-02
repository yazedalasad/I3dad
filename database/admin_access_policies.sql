-- Admin access policies for the I3dad admin panel.
-- Run this in the Supabase SQL editor after schema.sql/admin_compliance_schema.sql.

-- Keep the admin account role aligned in the public profile table.
INSERT INTO public.user_profiles (user_id, role, created_at, updated_at)
SELECT id, 'admin', NOW(), NOW()
FROM auth.users
WHERE lower(email) = lower('yazedassad@gmail.com')
ON CONFLICT (user_id)
DO UPDATE SET role = 'admin', updated_at = NOW();

-- Helper expression used by policies:
-- Auth metadata is trusted here because it is set by Supabase admin/server code.

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_abilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_self_or_admin" ON public.user_profiles;
CREATE POLICY "profiles_read_self_or_admin"
ON public.user_profiles
FOR SELECT
USING (
  user_id = auth.uid()
  OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.user_profiles;
CREATE POLICY "profiles_update_self_or_admin"
ON public.user_profiles
FOR UPDATE
USING (
  user_id = auth.uid()
  OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  user_id = auth.uid()
  OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

DROP POLICY IF EXISTS "students_read_self_or_admin" ON public.students;
CREATE POLICY "students_read_self_or_admin"
ON public.students
FOR SELECT
USING (
  user_id = auth.uid()
  OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

DROP POLICY IF EXISTS "students_insert_self_or_admin" ON public.students;
CREATE POLICY "students_insert_self_or_admin"
ON public.students
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

DROP POLICY IF EXISTS "students_update_self_or_admin" ON public.students;
CREATE POLICY "students_update_self_or_admin"
ON public.students
FOR UPDATE
USING (
  user_id = auth.uid()
  OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  user_id = auth.uid()
  OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

DROP POLICY IF EXISTS "test_sessions_read_self_or_admin" ON public.test_sessions;
CREATE POLICY "test_sessions_read_self_or_admin"
ON public.test_sessions
FOR SELECT
USING (
  COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = test_sessions.student_id
      AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "student_responses_read_self_or_admin" ON public.student_responses;
CREATE POLICY "student_responses_read_self_or_admin"
ON public.student_responses
FOR SELECT
USING (
  COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_responses.student_id
      AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "student_abilities_read_self_or_admin" ON public.student_abilities;
CREATE POLICY "student_abilities_read_self_or_admin"
ON public.student_abilities
FOR SELECT
USING (
  COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_abilities.student_id
      AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "student_interests_read_self_or_admin" ON public.student_interests;
CREATE POLICY "student_interests_read_self_or_admin"
ON public.student_interests
FOR SELECT
USING (
  COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_interests.student_id
      AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "student_recommendations_read_self_or_admin" ON public.student_recommendations;
CREATE POLICY "student_recommendations_read_self_or_admin"
ON public.student_recommendations
FOR SELECT
USING (
  COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_recommendations.student_id
      AND s.user_id = auth.uid()
  )
);
