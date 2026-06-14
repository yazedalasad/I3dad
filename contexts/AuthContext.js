import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { requireSupabase } from '../config/supabase';
import { CLASS_SECTION_DEFAULT, normalizeClassSection } from '../utils/classSections';
import { buildStudentIdentity } from '../utils/studentIdentity';
import { isValidIsraeliId, normalizeIsraeliId } from '../src/utils/israeliId';
import {
  authResult,
  normalizeAuthEmail,
  withAuthTimeout,
  AUTH_INIT_TIMEOUT_MS,
  AUTH_REQUEST_TIMEOUT_MS,
} from '../utils/authHelpers';
import { validateEmail, validatePassword, validateLoginPassword } from '../utils/validation';
import { buildStudentIdExistsError, isDuplicateStudentIdError } from '../utils/authErrors';
import { isStudentIdTaken } from '../services/studentIdentityService';

const AuthContext = createContext(null);

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

const normalizeValidStudentId = (value) => {
  const normalized = normalizeIsraeliId(value);
  return isValidIsraeliId(normalized) ? normalized : null;
};

const buildStudentMetadata = (studentInfo = {}) => ({
  role: 'student',
  student_id: normalizeValidStudentId(studentInfo.studentId || studentInfo.student_id || ''),
  studentId: normalizeValidStudentId(studentInfo.studentId || studentInfo.student_id || ''),
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
  const studentId = normalizeValidStudentId(source.student_id || source.studentId || '');
  const payload = {
    user_id: userId,
    student_id: studentId,
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
  const [initializingAuth, setInitializingAuth] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [studentDataLoading, setStudentDataLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const refreshInFlightRef = useRef(null);
  const authOperationRef = useRef(null);
  const authInFlightRef = useRef(false);

  const loading = initializingAuth;
  const authLoading = initializingAuth || authBusy;

  const tryBeginAuth = (operation) => {
    if (authInFlightRef.current) {
      return false;
    }
    authInFlightRef.current = true;
    authOperationRef.current = operation;
    setAuthBusy(true);
    return true;
  };

  const endAuth = () => {
    authInFlightRef.current = false;
    authOperationRef.current = null;
    setAuthBusy(false);
  };

  const rollbackSignupSession = async (client) => {
    try {
      await client.auth.signOut();
    } catch (error) {
      console.error('signup rollback signOut failed:', error?.message || error);
    }
  };

  const fetchUserProfile = async (userId) => {
    const { data, error } = await requireSupabase()
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

    const fetchMatches = async (column, value) => {
      if (!hasValue(value)) return [];

      const { data, error } = await requireSupabase()
        .from('students')
        .select('*')
        .eq(column, value)
        .limit(10);

      if (error) throw error;
      return data || [];
    };

    const metadataStudentId = metadata.student_id || metadata.studentId || null;
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
        const { data: linkedStudent, error: linkError } = await requireSupabase()
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
          const { data: mergedStudent, error: mergeError } = await requireSupabase()
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
      const { data: createdStudent, error: createError } = await requireSupabase()
        .from('students')
        .insert([metadataPayload])
        .select('*')
        .maybeSingle();

      if (createError) throw createError;
      return createdStudent ?? null;
    }

    return null;
  };

  const refreshUserData = async (authUserOrId, { force = false } = {}) => {
    const authUser =
      typeof authUserOrId === 'string' ? { id: authUserOrId } : authUserOrId || {};
    const userId = authUser.id;
    if (!userId) return { profile: null, studentData: null };

    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const refreshPromise = (async () => {
      setStudentDataLoading(true);
      setProfileError(null);

      try {
        let prof = null;
        try {
          prof = await withAuthTimeout(fetchUserProfile(userId), AUTH_REQUEST_TIMEOUT_MS);
        } catch (error) {
          console.error('fetchUserProfile failed/timeout:', error?.message || error);
          prof = null;
        }

        const metadataRole = String(authUser.app_metadata?.role || '').toLowerCase();
        const metadataProfile = metadataRole
          ? {
              user_id: userId,
              role: metadataRole,
              full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
            }
          : null;
        const resolvedProfile = metadataRole
          ? { ...(prof || {}), ...(metadataProfile || {}), role: metadataRole }
          : prof;

        const role = String(resolvedProfile?.role ?? 'student').toLowerCase();
        setProfile(resolvedProfile);

        const isAdministrativeRole = ['admin', 'principal', 'school_admin'].includes(role);
        let stud = null;

        if (!isAdministrativeRole) {
          try {
            stud = await withAuthTimeout(fetchStudentData(authUser), AUTH_REQUEST_TIMEOUT_MS);
          } catch (error) {
            console.error('fetchStudentData failed/timeout:', error?.message || error);
            stud = null;
          }
          setStudentData((current) => stud ?? current);
        } else {
          setStudentData(null);
        }

        console.log('profile loaded:', Boolean(resolvedProfile || stud));
        return { profile: resolvedProfile, studentData: stud };
      } catch (error) {
        const message = error?.message || 'Failed to load profile';
        setProfileError(message);
        throw error;
      } finally {
        setStudentDataLoading(false);
      }
    })();

    refreshInFlightRef.current = refreshPromise;

    try {
      return await refreshPromise;
    } finally {
      if (refreshInFlightRef.current === refreshPromise) {
        refreshInFlightRef.current = null;
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    console.log('Auth init start');

    const clearAuthState = () => {
      setProfile(null);
      setStudentData(null);
      setStudentDataLoading(false);
      setProfileError(null);
    };

    const applySession = async (newSession, { waitForProfile = false, event = 'manual' } = {}) => {
      if (!isMounted) return;

      console.log('auth event:', event, Boolean(newSession));

      setSession(newSession);
      const nextUser = newSession?.user ?? null;
      setUser(nextUser);

      if (!nextUser) {
        clearAuthState();
        return;
      }

      if (waitForProfile) {
        try {
          await refreshUserData(nextUser, { force: true });
        } catch (error) {
          console.error('refreshUserData failed:', error?.message || error);
        }
        if (!isMounted) return;
      } else {
        refreshUserData(nextUser).catch((error) =>
          console.error('refreshUserData failed:', error?.message || error)
        );
      }
    };

    (async () => {
      try {
        const { data, error } = await withAuthTimeout(
          requireSupabase().auth.getSession(),
          AUTH_INIT_TIMEOUT_MS
        );
        if (error) {
          console.error('auth error:', error?.message);
        }

        const session0 = data?.session ?? null;
        console.log('getSession result:', Boolean(session0));
        await applySession(session0, { waitForProfile: Boolean(session0), event: 'INITIAL_SESSION' });
      } catch (error) {
        console.error('getSession fail:', error?.message || error);
      } finally {
        if (isMounted) {
          setInitializingAuth(false);
        }
      }
    })();

    const {
      data: { subscription },
    } = requireSupabase().auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      console.log('auth event:', event, Boolean(newSession));

      if (event === 'INITIAL_SESSION') {
        return;
      }

      if (authOperationRef.current) {
        return;
      }

      if (event === 'SIGNED_OUT' || !newSession) {
        await applySession(null, { event });
        return;
      }

      const waitForProfile = event === 'SIGNED_IN' || event === 'USER_UPDATED';
      await applySession(newSession, { waitForProfile, event });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email, password, studentInfo) => {
    if (!tryBeginAuth('signUp')) {
      return authResult({ success: false, error: new Error('Auth operation already in progress') });
    }

    try {
      const normalizedEmail = normalizeAuthEmail(email);
      const emailValidation = validateEmail(normalizedEmail);
      if (!emailValidation.isValid) {
        const validationError = new Error(emailValidation.error || 'Invalid email');
        console.error('auth error:', validationError.message);
        return authResult({ success: false, error: validationError });
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        const validationError = new Error(passwordValidation.error || 'Invalid password');
        console.error('auth error:', validationError.message);
        return authResult({ success: false, error: validationError });
      }

      const normalizedStudentId = normalizeValidStudentId(
        studentInfo?.studentId || studentInfo?.student_id
      );
      if (!normalizedStudentId) {
        const validationError = new Error('INVALID_STUDENT_ID');
        console.error('auth error:', validationError.message);
        return authResult({ success: false, error: validationError });
      }

      const client = requireSupabase();
      const studentIdTaken = await isStudentIdTaken(normalizedStudentId);
      if (studentIdTaken === true) {
        const duplicateError = buildStudentIdExistsError();
        console.error('auth error:', duplicateError.message);
        return authResult({ success: false, error: duplicateError });
      }
      if (studentIdTaken === null) {
        const availabilityError = new Error('STUDENT_ID_CHECK_UNAVAILABLE');
        availabilityError.code = 'SERVICE_UNAVAILABLE';
        console.error('auth error:', availabilityError.message);
        return authResult({ success: false, error: availabilityError });
      }

      const studentMetadata = buildStudentMetadata(studentInfo);

      const { data: authData, error: authError } = await withAuthTimeout(
        client.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: studentMetadata,
          },
        }),
        AUTH_REQUEST_TIMEOUT_MS
      );

      if (authError) {
        console.error('auth error:', authError?.message);
        return authResult({ success: false, error: authError });
      }

      const needsEmailConfirmation = !authData.session;
      const newUserId = authData.user?.id;
      const activeSession = authData.session;

      if (newUserId && activeSession) {
        const birthday = normalizeBirthday(studentInfo.birthday);

        const { error: studentError } = await client.from('students').insert([
          {
            user_id: newUserId,
            student_id: normalizedStudentId,
            first_name: studentInfo.firstName,
            last_name: studentInfo.lastName,
            phone: studentInfo.phone,
            email: normalizedEmail,
            birthday,
            school_name: studentInfo.schoolName,
            school_id: studentInfo.schoolId || null,
            grade: studentInfo.grade,
            class_section: normalizeClassSection(
              studentInfo.classSection || CLASS_SECTION_DEFAULT
            ),
          },
        ]);

        if (studentError) {
          console.error('auth error:', studentError?.message);
          await rollbackSignupSession(client);
          if (isDuplicateStudentIdError(studentError)) {
            return authResult({ success: false, error: buildStudentIdExistsError() });
          }
          return authResult({ success: false, error: studentError });
        }

        const { error: profileError } = await client.from('user_profiles').upsert(
          {
            user_id: newUserId,
            role: 'student',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        if (profileError) {
          console.error('auth error:', profileError?.message);
          await rollbackSignupSession(client);
          return authResult({ success: false, error: profileError });
        }
      }

      if (needsEmailConfirmation) {
        return authResult({
          success: true,
          data: {
            needsEmailConfirmation: true,
            user: authData.user,
          },
        });
      }

      if (authData.session) {
        setSession(authData.session);
        setUser(authData.user);
        await refreshUserData(authData.user, { force: true });
      }

      console.log('login success:', Boolean(authData?.session));

      return authResult({
        success: true,
        data: {
          needsEmailConfirmation: false,
          session: authData.session,
          user: authData.user,
        },
      });
    } catch (error) {
      console.error('auth error:', error?.message || error);
      return authResult({ success: false, error });
    } finally {
      endAuth();
    }
  };

  const signIn = async (email, password) => {
    if (!tryBeginAuth('signIn')) {
      return authResult({ success: false, error: new Error('Auth operation already in progress') });
    }

    try {
      const normalizedEmail = normalizeAuthEmail(email);
      const emailValidation = validateEmail(normalizedEmail);
      if (!emailValidation.isValid) {
        const validationError = new Error(emailValidation.error || 'Invalid email');
        console.error('auth error:', validationError.message);
        return authResult({ success: false, error: validationError });
      }

      const passwordValidation = validateLoginPassword(password);
      if (!passwordValidation.isValid) {
        const validationError = new Error(passwordValidation.error || 'Invalid password');
        console.error('auth error:', validationError.message);
        return authResult({ success: false, error: validationError });
      }

      const client = requireSupabase();
      const { data, error } = await withAuthTimeout(
        client.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        }),
        AUTH_REQUEST_TIMEOUT_MS
      );

      if (error) {
        console.error('auth error:', error?.message);
        return authResult({ success: false, error });
      }

      console.log('login success:', Boolean(data?.session));

      let activeSession = data?.session ?? null;
      let activeUser = data?.user ?? activeSession?.user ?? null;

      if (!activeSession) {
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        if (sessionError) {
          console.error('auth error:', sessionError?.message);
          return authResult({ success: false, error: sessionError });
        }
        activeSession = sessionData?.session ?? null;
        activeUser = activeSession?.user ?? activeUser;
      }

      if (!activeSession || !activeUser) {
        const sessionError = new Error('No session returned after login. Please try again.');
        console.error('auth error:', sessionError.message);
        return authResult({ success: false, error: sessionError });
      }

      setSession(activeSession);
      setUser(activeUser);

      const loaded = await refreshUserData(activeUser, { force: true });

      return authResult({
        success: true,
        data: {
          session: activeSession,
          user: activeUser,
          profile: loaded?.profile ?? null,
          studentData: loaded?.studentData ?? null,
        },
      });
    } catch (error) {
      console.error('auth error:', error?.message || error);
      return authResult({ success: false, error });
    } finally {
      endAuth();
    }
  };

  const signOut = async () => {
    if (!tryBeginAuth('signOut')) {
      return authResult({ success: false, error: new Error('Auth operation already in progress') });
    }

    try {
      const { error } = await withAuthTimeout(requireSupabase().auth.signOut(), AUTH_REQUEST_TIMEOUT_MS);
      if (error) {
        console.error('auth error:', error?.message);
        return authResult({ success: false, error });
      }

      setProfile(null);
      setStudentData(null);
      setStudentDataLoading(false);
      setProfileError(null);
      setUser(null);
      setSession(null);

      return authResult({ success: true });
    } catch (error) {
      console.error('auth error:', error?.message || error);
      return authResult({ success: false, error });
    } finally {
      endAuth();
    }
  };

  const updateStudentData = async (updates) => {
    try {
      if (!user) throw new Error('No user logged in');

      const baseStudent = studentData || (await fetchStudentData(user));
      const {
        student_id: rawStudentId,
        studentId: rawStudentIdCamel,
        ...restUpdates
      } = updates || {};
      const requestedStudentId = rawStudentId ?? rawStudentIdCamel;
      if (hasValue(requestedStudentId) && !normalizeValidStudentId(requestedStudentId)) {
        throw new Error('INVALID_STUDENT_ID');
      }

      const resolvedStudentId =
        normalizeValidStudentId(requestedStudentId) ||
        normalizeValidStudentId(baseStudent?.student_id) ||
        normalizeValidStudentId(user.user_metadata?.student_id || user.user_metadata?.studentId);

      const payload = {
        ...restUpdates,
        user_id: user.id,
        email: restUpdates.email || baseStudent?.email || user.email || null,
        ...(resolvedStudentId ? { student_id: resolvedStudentId } : {}),
      };

      const query = baseStudent?.id
        ? requireSupabase().from('students').update(payload).eq('id', baseStudent.id)
        : requireSupabase().from('students').insert([payload]);

      const { data, error } = await withAuthTimeout(
        query.select('*').maybeSingle(),
        AUTH_REQUEST_TIMEOUT_MS
      );

      if (error) throw error;

      setStudentData(data ?? null);
      return authResult({ success: true, data: data ?? null });
    } catch (error) {
      console.error('Update student data error:', error?.message || error);
      return authResult({ success: false, error });
    }
  };

  const deleteAccount = async () => {
    try {
      if (!user) throw new Error('No user logged in');

      const targetStudent = studentData || (await fetchStudentData(user));

      if (targetStudent?.id) {
        const { error: studentError } = await withAuthTimeout(
          requireSupabase().from('students').delete().eq('id', targetStudent.id),
          AUTH_REQUEST_TIMEOUT_MS
        );
        if (studentError) throw studentError;
      }

      try {
        await requireSupabase().from('user_profiles').delete().eq('user_id', user.id);
      } catch (_error) {
        // Some deployments restrict profile deletion. Student data removal is the critical path.
      }

      return await signOut();
    } catch (error) {
      console.error('Delete account error:', error?.message || error);
      return authResult({ success: false, error });
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
      initializingAuth,
      authLoading,
      authBusy,
      profile,
      profileError,
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
    [
      user,
      session,
      loading,
      initializingAuth,
      authLoading,
      authBusy,
      profile,
      profileError,
      studentData,
      studentDataLoading,
      studentId,
      studentIdentity,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
