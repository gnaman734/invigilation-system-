import { create } from 'zustand';
import { supabase, supabaseConfigError } from '../lib/supabase';
import { sanitizeEmail } from '../lib/utils/sanitize';

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

const getUserClaims = (user) => {
  const userMetadata = user?.user_metadata ?? user?.raw_user_meta_data ?? {};
  const appMetadata = user?.app_metadata ?? {};

  const rawRole = userMetadata.role ?? appMetadata.role ?? appMetadata.user_role ?? null;
  const normalizedRole = typeof rawRole === 'string' ? rawRole.toLowerCase() : null;

  return {
    role: normalizedRole,
    instructorId:
      userMetadata.instructor_id ??
      userMetadata.instructorId ??
      appMetadata.instructor_id ??
      appMetadata.instructorId ??
      null,
  };
};

const formatSupabaseAuthError = (error) => {
  const message = typeof error?.message === 'string' ? error.message : '';
  const code = error?.code ?? error?.error_code ?? null;

  if (/invalid login credentials/i.test(message)) {
    return 'Incorrect email or password.';
  }

  if (/email not confirmed/i.test(message) || code === 'email_not_confirmed') {
    return 'Email not confirmed. Check your inbox/spam for the verification email, or (for development) disable email confirmations in Supabase Auth settings.';
  }

  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'Unable to reach Supabase. Check your internet/VPN/firewall and confirm `VITE_SUPABASE_URL` is correct.';
  }

  return message || 'Unable to login. Please try again.';
};

const ACCESS_MESSAGES = {
  pending: 'Your account is pending admin approval. Please wait.',
  rejected: 'Your access request was rejected. Contact admin.',
};

const clearAuthState = () => ({
  user: null,
  role: null,
  instructorId: null,
  status: null,
  loading: false,
});

async function fetchInstructorAccess(user, fallbackInstructorId = null) {
  if (!user?.id) {
    return { error: 'Unable to validate account access.' };
  }

  let profile = null;

  const byAuthId = await supabase
    .from('instructors')
    .select('id, status, auth_id, email')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (!byAuthId.error && byAuthId.data) {
    profile = byAuthId.data;
  }

  if (!profile && user.email) {
    const byEmail = await supabase
      .from('instructors')
      .select('id, status, auth_id, email')
      .eq('email', user.email)
      .maybeSingle();

    if (!byEmail.error && byEmail.data) {
      profile = byEmail.data;
    }
  }

  if (!profile) {
    return {
      error: 'Instructor profile not found. Please contact admin.',
    };
  }

  const status = typeof profile.status === 'string' ? profile.status.toLowerCase() : 'pending';
  const instructorId = profile.id ?? fallbackInstructorId ?? null;

  if (status === 'pending' || status === 'rejected') {
    return {
      error: ACCESS_MESSAGES[status],
      status,
      instructorId,
    };
  }

  return { error: null, status: 'approved', instructorId };
}

let authSubscription = null;
let sessionRefreshTimer = null;

const emitAuthExpiredNotice = () => {
  window.dispatchEvent(new CustomEvent('app:auth-expired'));
};

const clearSessionRefreshTimer = () => {
  if (sessionRefreshTimer) {
    window.clearTimeout(sessionRefreshTimer);
    sessionRefreshTimer = null;
  }
};

const scheduleSessionRefresh = (session) => {
  clearSessionRefreshTimer();

  const expiresAt = Number(session?.expires_at ?? 0) * 1000;
  if (!expiresAt) {
    return;
  }

  const refreshInMs = Math.max(15_000, expiresAt - Date.now() - 60_000);
  sessionRefreshTimer = window.setTimeout(async () => {
    if (!supabase) {
      return;
    }

    const { data, error } = await supabase.auth.refreshSession();

    if (error || !data?.session) {
      emitAuthExpiredNotice();
      await supabase.auth.signOut();
      return;
    }

    scheduleSessionRefresh(data.session);
  }, refreshInMs);
};

export const useAuthStore = create((set, get) => ({
  user: null,
  role: null,
  instructorId: null,
  status: null,
  authError: '',
  loading: true,

  login: async (email, password) => {
    set({ loading: true, authError: '' });

    try {
      if (!supabase) {
        const message = supabaseConfigError ?? 'Supabase is not configured. Please add environment variables.';
        set({ ...clearAuthState(), authError: message });
        return { error: message };
      }

      const normalizedEmail = sanitizeEmail(normalizeEmail(email));

      if (!normalizedEmail || !password) {
        set({ loading: false });
        return { error: 'Please enter both email and password.' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

      if (error) {
        throw error;
      }

      const user = data.user ?? null;
      const { role, instructorId } = getUserClaims(user);

      if (!role) {
        await supabase.auth.signOut();
        const message = "Signed in successfully, but your account is missing a role. In Supabase → Authentication → Users, set `user_metadata.role` to 'admin' or 'instructor', then try again.";
        set({ ...clearAuthState(), authError: message });
        return { error: message };
      }

      if (role !== 'admin' && role !== 'instructor') {
        await supabase.auth.signOut();
        const message = 'Your account does not have a valid role assigned (admin or instructor). Please contact an administrator.';
        set({ ...clearAuthState(), authError: message });
        return { error: message };
      }

      if (role === 'instructor') {
        const access = await fetchInstructorAccess(user, instructorId);

        if (access.error) {
          await supabase.auth.signOut();
          set({ ...clearAuthState(), authError: access.error, status: access.status ?? null });
          return { error: access.error };
        }

        set({
          user,
          role,
          instructorId: access.instructorId,
          status: access.status,
          authError: '',
          loading: false,
        });

        return { error: null };
      }

      set({ user, role, instructorId, status: 'approved', authError: '', loading: false });
      return { error: null };
    } catch (error) {
      const message = formatSupabaseAuthError(error);
      set({ ...clearAuthState(), authError: message });
      return { error: message };
    }
  },

  logout: async () => {
    set({ loading: true });

    try {
      if (supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) {
          // Continue local logout even if remote sign-out fails.
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn('Supabase signOut failed; continuing with local logout:', error.message);
          }
        }
      } else if (import.meta.env.DEV && supabaseConfigError) {
        // eslint-disable-next-line no-console
        console.warn('Supabase is not configured; continuing with local logout:', supabaseConfigError);
      }

      clearSessionRefreshTimer();
      set({ ...clearAuthState(), authError: '' });
      return { error: null };
    } catch (error) {
      set({ loading: false });
      return { error: error?.message ?? 'Unable to logout. Please try again.' };
    }
  },

  initialize: async () => {
    if (authSubscription) {
      set({ loading: false });
      return;
    }

    set({ loading: true });

    try {
      if (!supabase) {
        throw new Error(supabaseConfigError ?? 'Supabase is not configured.');
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      const user = session?.user ?? null;
      const { role, instructorId } = getUserClaims(user);

      if (!session?.user) {
        set({ ...clearAuthState(), authError: '' });
      } else if (!role || (role !== 'admin' && role !== 'instructor')) {
        await supabase.auth.signOut();
        const message = 'Your account does not have a valid role assigned (admin or instructor). Please contact an administrator.';
        set({ ...clearAuthState(), authError: message });
        return;
      } else if (role === 'instructor') {
        const access = await fetchInstructorAccess(user, instructorId);

        if (access.error) {
          await supabase.auth.signOut();
          set({ ...clearAuthState(), authError: access.error, status: access.status ?? null });
          return;
        }

        set({
          user,
          role,
          instructorId: access.instructorId,
          status: access.status,
          authError: '',
          loading: false,
        });
      } else {
        set({ user, role, instructorId, status: 'approved', authError: '', loading: false });
      }

      if (session?.user) {
        scheduleSessionRefresh(session);
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
        const nextUser = nextSession?.user ?? null;
        const nextClaims = getUserClaims(nextUser);

        if (!nextSession) {
          set({ ...clearAuthState(), authError: '' });
          clearSessionRefreshTimer();
          return;
        }

        if (!nextClaims.role || (nextClaims.role !== 'admin' && nextClaims.role !== 'instructor')) {
          await supabase.auth.signOut();
          const message = 'Your account does not have a valid role assigned (admin or instructor). Please contact an administrator.';
          set({ ...clearAuthState(), authError: message });
          return;
        }

        if (nextClaims.role === 'instructor') {
          const access = await fetchInstructorAccess(nextUser, nextClaims.instructorId);

          if (access.error) {
            await supabase.auth.signOut();
            set({ ...clearAuthState(), authError: access.error, status: access.status ?? null });
            return;
          }

          set({
            user: nextUser,
            role: nextClaims.role,
            instructorId: access.instructorId,
            status: access.status,
            authError: '',
            loading: false,
          });
        } else {
          set({
            user: nextUser,
            role: nextClaims.role,
            instructorId: nextClaims.instructorId,
            status: 'approved',
            authError: '',
            loading: false,
          });
        }

        scheduleSessionRefresh(nextSession);
      });

      authSubscription = subscription;
    } catch (_error) {
      set({ ...clearAuthState(), authError: '' });
    }
  },

  destroy: () => {
    if (authSubscription) {
      authSubscription.unsubscribe();
      authSubscription = null;
    }

    clearSessionRefreshTimer();

    set({ ...clearAuthState(), authError: '' });
  },

  isAuthenticated: () => Boolean(get().user),
}));
