import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext(null);

const withTimeout = (promise, ms = 12000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);

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

  const fetchStudentData = async (userId) => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  };

  const refreshUserData = async (userId) => {
    if (!userId) return;

    // avoid duplicates for same user
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    lastRefreshForUserRef.current = userId;

    try {
      // ✅ Fetch profile (allow a bit longer)
      let prof = null;
      try {
        prof = await withTimeout(fetchUserProfile(userId), 15000);
      } catch (e) {
        console.error('fetchUserProfile failed/timeout:', e?.message || e);
        prof = null;
      }

      // ✅ If profile missing => default student
      const role = prof?.role ?? 'student';

      // Update profile state (even if null)
      setProfile(prof);

      // ✅ If student role, fetch student row
      if (role === 'student') {
        let stud = null;
        try {
          stud = await withTimeout(fetchStudentData(userId), 12000);
        } catch (e) {
          console.error('fetchStudentData failed/timeout:', e?.message || e);
          stud = null;
        }
        setStudentData(stud);
      } else {
        // admin/principal -> studentData not required
        setStudentData(null);
      }
    } finally {
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
        setLoading(false);
        return;
      }

      // ✅ Do not block UI forever on refresh
      refreshUserData(nextUser.id).catch((e) =>
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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (authError) throw authError;

      const newUserId = authData.user?.id;

      if (newUserId) {
        const birthday =
          studentInfo.birthday instanceof Date
            ? studentInfo.birthday.toISOString().slice(0, 10)
            : studentInfo.birthday;

        const { error: studentError } = await supabase.from('students').insert([
          {
            user_id: newUserId,
            student_id: studentInfo.studentId,
            first_name: studentInfo.firstName,
            last_name: studentInfo.lastName,
            phone: studentInfo.phone,
            email,
            birthday,
            school_name: studentInfo.schoolName,
            grade: studentInfo.grade,
          },
        ]);
        if (studentError) throw studentError;

        // refresh (don’t block)
        refreshUserData(newUserId).catch(() => {});
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
        refreshUserData(userId).catch((e) =>
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

      const { data, error } = await withTimeout(
        supabase.from('students').update(updates).eq('user_id', user.id).select('*').maybeSingle(),
        12000
      );

      if (error) throw error;

      setStudentData(data ?? null);
      return { data: data ?? null, error: null };
    } catch (error) {
      console.error('Update student data error:', error?.message || error);
      return { data: null, error };
    }
  };

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      profile,
      studentData,
      signUp,
      signIn,
      signOut,
      updateStudentData,
      refreshUserData,
    }),
    [user, session, loading, profile, studentData]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
