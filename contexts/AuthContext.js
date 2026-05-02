import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../config/supabase';
import { CLASS_SECTION_DEFAULT, normalizeClassSection } from '../utils/classSections';
import { buildStudentIdentity } from '../utils/studentIdentity';

const AuthContext = createContext(null);

const withTimeout = (promise, ms = 12000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);

const hasValue = (value) => String(value ?? '').trim().length > 0;

const studentProfileScore = (student, userId) => {
  if (!student) return -1;

  const weightedFields = [
    ['first_name', 2],
    ['last_name', 2],
    ['school_name', 3],
    ['grade', 3],
    ['birthday', 3],
    ['gender', 3],
    ['phone', 1],
    ['email', 1],
    ['student_id', 1],
    ['school_id', 1],
    ['class_section', 2],
    ['avatar_url', 1],
  ];

  return weightedFields.reduce((score, [field, weight]) => {
    const value = student[field];
    if (field === 'first_name' && String(value || '').trim().toLowerCase() === 'student') {
      return score;
    }
    return score + (hasValue(value) ? weight : 0);
  }, student.user_id === userId ? 2 : 0);
};

const buildMissingStudentUpdates = (target, source) => {
  const fields = [
    'student_id',
    'first_name',
    'last_name',
    'phone',
    'email',
    'birthday',
    'school_name',
    'school_id',
    'grade',
    'class_section',
    'gender',
    'avatar_url',
    'image_url',
    'profile_image_url',
  ];

  return fields.reduce((updates, field) => {
    if (!hasValue(target?.[field]) && hasValue(source?.[field])) {
      updates[field] = source[field];
    }
    return updates;
  }, {});
};

const normalizeBirthday = (birthday) =>
  birthday instanceof Date ? birthday.toISOString().slice(0, 10) : birthday;

const buildStudentMetadata = (studentInfo = {}) => ({
  role: 'student',
  student_id: studentInfo.studentId || studentInfo.student_id || null,
  studentId: studentInfo.studentId || studentInfo.student_id || null,
  first_name: studentInfo.firstName || studentInfo.first_name || '',
  firstName: studentInfo.firstName || studentInfo.first_name || '',
  last_name: studentInfo.lastName || studentInfo.last_name || '',
  lastName: studentInfo.lastName || studentInfo.last_name || '',
  full_name: `${studentInfo.firstName || studentInfo.first_name || ''} ${
    studentInfo.lastName || studentInfo.last_name || ''
  }`
    .replace(/\s+/g, ' ')
    .trim(),
  phone: studentInfo.phone || '',
  birthday: normalizeBirthday(studentInfo.birthday) || '',
  school_name: studentInfo.schoolName || studentInfo.school_name || '',
  schoolName: studentInfo.schoolName || studentInfo.school_name || '',
  school_id: studentInfo.schoolId || studentInfo.school_id || null,
  schoolId: studentInfo.schoolId || studentInfo.school_id || null,
  grade: studentInfo.grade || '',
  class_section: normalizeClassSection(studentInfo.classSection || studentInfo.class_section),
  classSection: normalizeClassSection(studentInfo.classSection || studentInfo.class_section),
});

const buildStudentPayloadFromSource = ({ userId, email, source = {} }) => {
  const payload = {
    user_id: userId,
    student_id: source.student_id || source.studentId || userId,
    first_name: source.first_name || source.firstName || '',
    last_name: source.last_name || source.lastName || '',
    phone: source.phone || '',
    email: email || source.email || null,
    birthday: normalizeBirthday(source.birthday) || '',
    school_name: source.school_name || source.schoolName || '',
    school_id: source.school_id || source.schoolId || null,
    grade: source.grade ? Number(source.grade) : null,
    class_section: normalizeClassSection(source.class_section || source.classSection),
  };

  return payload;
};

const canCreateStudentFromPayload = (payload) =>
  Boolean(
    hasValue(payload.user_id) &&
      hasValue(payload.student_id) &&
      hasValue(payload.first_name) &&
      hasValue(payload.last_name) &&
      hasValue(payload.phone) &&
      hasValue(payload.email) &&
      hasValue(payload.birthday) &&
      hasValue(payload.school_name) &&
      hasValue(payload.grade) &&
      hasValue(payload.class_section)
  );

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);

  // Only means: "auth is being restored / login state changing"
  const [loading, setLoading] = useState(true);

  const [studentData, setStudentData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [studentDataLoading, setStudentDataLoading] = useState(false);

  // Prevent overlapping refresh calls
  const refreshInFlightRef = useRef(false);
  const lastRefreshForUserRef = useRef(null);

  const fetchUserProfile = async (userId) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  };

  const fetchStudentData = async (authUserOrId) => {
    const authUser =
      typeof authUserOrId === 'string' ? { id: authUserOrId } : authUserOrId || {};
    const userId = authUser.id;
    const email = String(authUser.email || '').trim();
    const metadata = authUser.user_metadata || {};
    const metadataStudentId = metadata.student_id || metadata.studentId || null;

    const fetchMatches = async (column, value) => {
      if (!hasValue(value)) return [];

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq(column, value)
        .limit(10);

      if (error) throw error;
      return data || [];
    };

    const byUserId = await fetchMatches('user_id', userId);
    const byEmail = await fetchMatches('email', email);
    const byStudentId = await fetchMatches('student_id', metadataStudentId);

    const candidatesById = new Map();
    [...byUserId, ...byEmail, ...byStudentId].forEach((student) => {
      if (student?.id) candidatesById.set(student.id, student);
    });

    const candidates = [...candidatesById.values()];
    if (candidates.length) {
      const bestStudent = candidates.sort(
        (a, b) => studentProfileScore(b, userId) - studentProfileScore(a, userId)
      )[0];
      const linkedStudent = byUserId.find((student) => student.user_id === userId) || null;

      if (bestStudent?.id && bestStudent.user_id !== userId && !bestStudent.user_id) {
        const { data: linkedStudent, error: linkError } = await supabase
          .from('students')
          .update({ user_id: userId })
          .eq('id', bestStudent.id)
          .select('*')
          .maybeSingle();

        if (linkError) throw linkError;
        return linkedStudent ?? bestStudent;
      }

      if (linkedStudent && bestStudent?.id !== linkedStudent.id) {
        const missingUpdates = buildMissingStudentUpdates(linkedStudent, bestStudent);

        if (Object.keys(missingUpdates).length) {
          const { data: mergedStudent, error: mergeError } = await supabase
            .from('students')
            .update(missingUpdates)
            .eq('id', linkedStudent.id)
            .select('*')
            .maybeSingle();

          if (mergeError) throw mergeError;
          return mergedStudent ?? { ...linkedStudent, ...missingUpdates };
        }
      }

      return bestStudent;
    }

    const metadataPayload = buildStudentPayloadFromSource({
      userId,
      email,
      source: metadata,
    });

    if (canCreateStudentFromPayload(metadataPayload)) {
      const { data: createdStudent, error: createError } = await supabase
        .from('students')
        .insert([metadataPayload])
        .select('*')
        .maybeSingle();

      if (createError) throw createError;
      return createdStudent ?? null;
    }

    return null;
  };

  const refreshUserData = async (authUserOrId) => {
    const authUser =
      typeof authUserOrId === 'string' ? { id: authUserOrId } : authUserOrId || {};
    const userId = authUser.id;
    if (!userId) return;

    // avoid duplicates for same user
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    lastRefreshForUserRef.current = userId;
    setStudentDataLoading(true);

    try {
      // ✅ Fetch profile (allow a bit longer)
      let prof = null;
      try {
        prof = await withTimeout(fetchUserProfile(userId), 15000);
      } catch (e) {
        console.error('fetchUserProfile failed/timeout:', e?.message || e);
        prof = null;
      }

      const metadataRole = String(authUser.app_metadata?.role || authUser.user_metadata?.role || '').toLowerCase();
      const metadataProfile = metadataRole
        ? {
            user_id: userId,
            role: metadataRole,
            full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
          }
        : null;
      const resolvedProfile = metadataRole ? { ...(prof || {}), ...(metadataProfile || {}), role: metadataRole } : prof;

      // ✅ If profile missing => use auth metadata role, then default student
      const role = String(resolvedProfile?.role ?? 'student').toLowerCase();

      // Update profile state (even if null)
      setProfile(resolvedProfile);

      // ✅ If student role, fetch student row
      const isAdministrativeRole = ['admin', 'principal', 'school_admin'].includes(role);

      if (!isAdministrativeRole) {
        let stud = null;
        try {
          stud = await withTimeout(fetchStudentData(authUser), 12000);
        } catch (e) {
          console.error('fetchStudentData failed/timeout:', e?.message || e);
          stud = null;
        }
        setStudentData((current) => stud ?? current);
      } else {
        // admin/principal -> studentData not required
        setStudentData(null);
      }
    } finally {
      setStudentDataLoading(false);
      refreshInFlightRef.current = false;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const applySession = async (newSession) => {
      if (!isMounted) return;

      setSession(newSession);
      const nextUser = newSession?.user ?? null;
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setStudentData(null);
        setStudentDataLoading(false);
        setLoading(false);
        return;
      }

      // ✅ Do not block UI forever on refresh
      refreshUserData(nextUser).catch((e) =>
        console.error('refreshUserData failed:', e?.message || e)
      );

      setLoading(false);
    };

    (async () => {
      try {
        // ✅ Don’t wrap getSession in your own timeout (supabase already handles it)
        const res = await supabase.auth.getSession();
        const session0 = res?.data?.session ?? null;
        await applySession(session0);
      } catch (e) {
        console.error('getSession fail:', e?.message || e);
        if (isMounted) setLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      setLoading(true);
      await applySession(newSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email, password, studentInfo) => {
    try {
      const studentMetadata = buildStudentMetadata(studentInfo);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: studentMetadata,
        },
      });
      if (authError) throw authError;

      const newUserId = authData.user?.id;

      if (newUserId) {
        const birthday = normalizeBirthday(studentInfo.birthday);

        const { data: studentRow, error: studentError } = await supabase.from('students').insert([
          {
            user_id: newUserId,
            student_id: studentInfo.studentId,
            first_name: studentInfo.firstName,
            last_name: studentInfo.lastName,
            phone: studentInfo.phone,
            email,
            birthday,
            school_name: studentInfo.schoolName,
            school_id: studentInfo.schoolId || null,
            grade: studentInfo.grade,
            class_section: normalizeClassSection(studentInfo.classSection || CLASS_SECTION_DEFAULT),
          },
        ]).select('*').maybeSingle();
        if (studentError) throw studentError;

        await supabase.from('user_profiles').upsert(
          {
            user_id: newUserId,
            role: 'student',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        setStudentData(studentRow ?? null);

        // refresh (don’t block)
        await supabase.auth.signOut();
        setProfile(null);
        setStudentData(null);
        setStudentDataLoading(false);
        setUser(null);
        setSession(null);
      }

      return { data: authData, error: null };
    } catch (error) {
      console.error('Sign up error:', error?.message || error);
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const userId = data?.user?.id;
      if (userId) {
        refreshUserData(data.user).catch((e) =>
          console.error('signIn refreshUserData fail:', e?.message || e)
        );
      }

      return { data, error: null };
    } catch (error) {
      console.error('Sign in error:', error?.message || error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);

      const { error } = await withTimeout(supabase.auth.signOut(), 12000);
      if (error) throw error;

      setProfile(null);
      setStudentData(null);
      setStudentDataLoading(false);
      setUser(null);
      setSession(null);

      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error?.message || error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const updateStudentData = async (updates) => {
    try {
      if (!user) throw new Error('No user logged in');

      const baseStudent = studentData || (await fetchStudentData(user));
      const payload = {
        ...updates,
        user_id: user.id,
        email: updates.email || baseStudent?.email || user.email || null,
        student_id:
          updates.student_id ||
          baseStudent?.student_id ||
          user.user_metadata?.student_id ||
          user.user_metadata?.studentId ||
          user.id,
      };

      const query = baseStudent?.id
        ? supabase.from('students').update(payload).eq('id', baseStudent.id)
        : supabase.from('students').insert([payload]);

      const { data, error } = await withTimeout(query.select('*').maybeSingle(), 12000);

      if (error) throw error;

      setStudentData(data ?? null);
      return { data: data ?? null, error: null };
    } catch (error) {
      console.error('Update student data error:', error?.message || error);
      return { data: null, error };
    }
  };

  const deleteAccount = async () => {
    try {
      if (!user) throw new Error('No user logged in');

      const targetStudent = studentData || (await fetchStudentData(user));

      if (targetStudent?.id) {
        const { error: studentError } = await withTimeout(
          supabase.from('students').delete().eq('id', targetStudent.id),
          12000
        );
        if (studentError) throw studentError;
      }

      try {
        await supabase.from('user_profiles').delete().eq('user_id', user.id);
      } catch (_error) {
        // Some deployments restrict profile deletion. Student data removal is the critical path.
      }

      await signOut();
      return { error: null };
    } catch (error) {
      console.error('Delete account error:', error?.message || error);
      return { error };
    }
  };

  const studentIdentity = useMemo(
    () => buildStudentIdentity({ user, studentData, profile, fallback: 'Student' }),
    [
      profile?.display_name,
      profile?.full_name,
      studentData?.first_name,
      studentData?.last_name,
      user?.email,
      user?.user_metadata?.full_name,
      user?.user_metadata?.name,
    ]
  );

  const studentId = studentData?.id || null;

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      profile,
      studentData,
      studentDataLoading,
      studentId,
      studentIdentity,
      signUp,
      signIn,
      signOut,
      deleteAccount,
      updateStudentData,
      refreshUserData,
    }),
    [user, session, loading, profile, studentData, studentDataLoading, studentId, studentIdentity]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
