import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useAuthStore } from '../../store/authStore';
import { useRealtime } from './useRealtime';
import { useDebouncedValue } from './useDebouncedValue';
import { enqueueOfflineOperation } from '../offlineQueue';
import { useCacheStore } from '../../store/cacheStore';
import { sanitizeEmail, sanitizeText, sanitizeUUID } from '../utils/sanitize';

function toFriendlyError(message, fallback) {
  if (!message) {
    return fallback;
  }

  if (/violates row-level security/i.test(message)) {
    return 'You do not have permission to perform this action.';
  }

  if (/duplicate key|already exists/i.test(message)) {
    return 'An instructor with this email already exists.';
  }

  if (/network|failed to fetch|timeout/i.test(message)) {
    return 'Network issue detected. Please try again.';
  }

  return fallback;
}

export function useInstructors() {
  const instructorId = useAuthStore((state) => state.instructorId);
  const role = useAuthStore((state) => state.role);
  const setCachedInstructors = useCacheStore((state) => state.setInstructors);
  const getFreshInstructors = useCacheStore((state) => state.getFreshInstructors);
  const [instructor, setInstructor] = useState(null);
  const [stats, setStats] = useState({
    total_duties: 0,
    late_arrivals: 0,
    on_time_arrivals: 0,
  });
  const [punctualityPercentage, setPunctualityPercentage] = useState(0);
  const [instructors, setInstructors] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [realtimeTick, setRealtimeTick] = useState(0);
  const debouncedRealtimeTick = useDebouncedValue(realtimeTick, 200);

  const fetchInstructorProfile = useCallback(async () => {
    if (!instructorId) {
      setInstructor(null);
      setStats({ total_duties: 0, late_arrivals: 0, on_time_arrivals: 0 });
      setPunctualityPercentage(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('instructors')
        .select('name, email, department, total_duties, late_arrivals, on_time_arrivals')
        .eq('id', instructorId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      const total = data.total_duties ?? 0;
      const onTime = data.on_time_arrivals ?? 0;
      const percentage = total > 0 ? Math.round((onTime / total) * 100) : 0;

      setInstructor({
        name: data.name,
        email: data.email,
        department: data.department,
      });
      setStats({
        total_duties: total,
        late_arrivals: data.late_arrivals ?? 0,
        on_time_arrivals: onTime,
      });
      setPunctualityPercentage(percentage);
    } catch (caughtError) {
      setError(toFriendlyError(caughtError?.message, 'Unable to fetch instructor profile.'));
      setInstructor(null);
      setStats({ total_duties: 0, late_arrivals: 0, on_time_arrivals: 0 });
      setPunctualityPercentage(0);
    } finally {
      setLoading(false);
    }
  }, [instructorId]);

  const fetchAllInstructors = useCallback(async (options = {}) => {
    const { force = false } = options;

    if (!force) {
      const cached = getFreshInstructors();
      if (cached) {
        setInstructors((cached ?? []).filter((item) => !item?.status || item.status === 'approved'));
        setLoading(false);
        return { error: null, data: (cached ?? []).filter((item) => !item?.status || item.status === 'approved') };
      }
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('instructors')
        .select('id, name, email, department, total_duties, late_arrivals, on_time_arrivals, status, is_active, auth_id, created_at')
        .eq('status', 'approved')
        .order('name', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      const mapped = (data ?? []).map((item) => {
        const total = Number(item.total_duties ?? 0);
        const onTime = Number(item.on_time_arrivals ?? 0);

        return {
          instructor_id: item.id,
          name: item.name,
          email: item.email,
          department: item.department,
          total_duties: total,
          late_arrivals: Number(item.late_arrivals ?? 0),
          on_time_arrivals: onTime,
          punctuality_percentage: total > 0 ? Math.round((onTime / total) * 10000) / 100 : 0,
          status: item.status,
          is_active: item.is_active ?? true,
          auth_id: item.auth_id ?? null,
          created_at: item.created_at,
        };
      });

      setInstructors(mapped);
      setCachedInstructors(mapped);
      return { error: null, data: mapped };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to fetch instructors right now.');
      setError(message);
      setInstructors([]);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, [getFreshInstructors, setCachedInstructors]);

  const fetchPendingRequests = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('pending_requests')
        .select('*')
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setPendingRequests(data ?? []);
      return { error: null, data: data ?? [] };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to fetch pending requests right now.');
      setError(message);
      setPendingRequests([]);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const createInstructor = useCallback(
    async (data) => {
      setLoading(true);
      setError('');

      try {
        const payload = {
          name: sanitizeText(data.name),
          email: sanitizeEmail(data.email),
          department: sanitizeText(data.department),
          status: 'approved',
        };

        if (!payload.name || !payload.email || !payload.department) {
          setLoading(false);
          return { error: 'Please enter a valid name, email, and department.' };
        }

        const performCreate = async () => {
          const { data: created, error: createError } = await supabase
            .from('instructors')
            .insert(payload)
            .select()
            .single();

          if (createError) {
            throw createError;
          }

          let inviteWarning = null;
          const redirectTo = `${window.location.origin}/login`;

          const { error: inviteError } = await supabase.auth.signInWithOtp({
            email: payload.email,
            options: {
              shouldCreateUser: true,
              emailRedirectTo: redirectTo,
              data: {
                role: 'instructor',
                instructor_id: created.id,
                name: payload.name,
              },
            },
          });

          if (inviteError) {
            inviteWarning = 'Instructor added, but invite email could not be sent. Create/send credentials from Supabase Auth.';
          }

          await fetchAllInstructors({ force: true });
          return { created, inviteWarning };
        };

        if (!window.navigator.onLine) {
          enqueueOfflineOperation(performCreate, 'Create instructor');
          setLoading(false);
          return { error: null, queued: true };
        }

        const { created, inviteWarning } = await performCreate();
        return { error: null, data: created, warning: inviteWarning };
      } catch (caughtError) {
        const message = toFriendlyError(caughtError?.message, 'Unable to create instructor right now.');
        setError(message);
        setLoading(false);
        return { error: message };
      }
    },
    [fetchAllInstructors]
  );

  const approveInstructor = useCallback(
    async (instructorIdToApprove, authId) => {
      setLoading(true);
      setError('');

      if (!sanitizeUUID(instructorIdToApprove)) {
        setLoading(false);
        return { error: 'Invalid instructor request selected.' };
      }

      try {
        let warning = null;

        const { error: updateError } = await supabase
          .from('instructors')
          .update({
            status: 'approved',
            auth_id: sanitizeUUID(authId) ? authId : null,
          })
          .eq('id', instructorIdToApprove);

        if (updateError) {
          throw updateError;
        }

        if (sanitizeUUID(authId)) {
          const { error: metadataError } = await supabase.rpc('admin_update_auth_user_metadata', {
            target_auth_id: authId,
            metadata_patch: {
              role: 'instructor',
              instructor_id: instructorIdToApprove,
              status: 'approved',
            },
          });

          if (metadataError) {
            warning = 'Approved, but auth metadata update failed. Run 002_security_rls_setup.sql and verify admin helper functions.';
          }
        } else {
          warning = 'Approved, but auth user link is missing for this request.';
        }

        setPendingRequests((previous) => previous.filter((request) => request.id !== instructorIdToApprove));
        await fetchAllInstructors({ force: true });
        return { error: null, warning };
      } catch (caughtError) {
        const message = toFriendlyError(caughtError?.message, 'Unable to approve instructor right now.');
        setError(message);
        return { error: message };
      } finally {
        setLoading(false);
      }
    },
    [fetchAllInstructors]
  );

  const rejectInstructor = useCallback(async (instructorIdToReject, authId) => {
    setLoading(true);
    setError('');

    if (!sanitizeUUID(instructorIdToReject)) {
      setLoading(false);
      return { error: 'Invalid instructor request selected.' };
    }

    try {
      const { error: updateError } = await supabase
        .from('instructors')
        .update({ status: 'rejected', auth_id: null })
        .eq('id', instructorIdToReject);

      if (updateError) {
        throw updateError;
      }

      if (sanitizeUUID(authId)) {
        const { error: deleteAuthError } = await supabase.rpc('admin_delete_auth_user', {
          target_auth_id: authId,
        });

        if (deleteAuthError) {
          // Do not block rejection if auth helper function is unavailable.
          // Instructor access remains rejected at application level.
        }
      }

      setPendingRequests((previous) => previous.filter((request) => request.id !== instructorIdToReject));
      return { error: null };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to reject instructor right now.');
      setError(message);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateInstructor = useCallback(
    async (id, data) => {
      setLoading(true);
      setError('');

      try {
        const payload = {
          name: sanitizeText(data.name),
          email: sanitizeEmail(data.email),
          department: sanitizeText(data.department),
        };

        if (!sanitizeUUID(id)) {
          setLoading(false);
          return { error: 'Invalid instructor selected.' };
        }

        const performUpdate = async () => {
          const { data: updated, error: updateError } = await supabase
            .from('instructors')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

          if (updateError) {
            throw updateError;
          }

          await fetchAllInstructors({ force: true });
          return updated;
        };

        if (!window.navigator.onLine) {
          enqueueOfflineOperation(performUpdate, 'Update instructor');
          setLoading(false);
          return { error: null, queued: true };
        }

        const updated = await performUpdate();
        return { error: null, data: updated };
      } catch (caughtError) {
        const message = toFriendlyError(caughtError?.message, 'Unable to update instructor right now.');
        setError(message);
        setLoading(false);
        return { error: message };
      }
    },
    [fetchAllInstructors]
  );

  const deleteInstructor = useCallback(
    async (id) => {
      setLoading(true);
      setError('');

      if (!sanitizeUUID(id)) {
        setLoading(false);
        return { error: 'Invalid instructor selected.' };
      }

      try {
        const performDelete = async () => {
          const { error: deleteError } = await supabase.from('instructors').delete().eq('id', id);

          if (deleteError) {
            throw deleteError;
          }

          await fetchAllInstructors({ force: true });
        };

        if (!window.navigator.onLine) {
          enqueueOfflineOperation(performDelete, 'Delete instructor');
          setLoading(false);
          return { error: null, queued: true };
        }

        await performDelete();
        return { error: null };
      } catch (caughtError) {
        const message = toFriendlyError(caughtError?.message, 'Unable to delete instructor right now.');
        setError(message);
        setLoading(false);
        return { error: message };
      }
    },
    [fetchAllInstructors]
  );

  const deactivateInstructor = useCallback(
    async (id) => {
      setLoading(true);
      setError('');

      if (!sanitizeUUID(id)) {
        setLoading(false);
        return { error: 'Invalid instructor selected.' };
      }

      try {
        const { error: updateError } = await supabase
          .from('instructors')
          .update({ is_active: false })
          .eq('id', id);

        if (updateError) {
          throw updateError;
        }

        await fetchAllInstructors({ force: true });
        return { error: null };
      } catch (caughtError) {
        const message = toFriendlyError(caughtError?.message, 'Unable to deactivate instructor right now.');
        setError(message);
        return { error: message };
      } finally {
        setLoading(false);
      }
    },
    [fetchAllInstructors]
  );

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      await fetchInstructorProfile();

      if (!active) {
        return;
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [fetchInstructorProfile]);

  useEffect(() => {
    if (role !== 'admin') {
      return;
    }

    fetchAllInstructors();
    fetchPendingRequests();
  }, [fetchAllInstructors, fetchPendingRequests, role, debouncedRealtimeTick]);

  const handleInstructorChange = useCallback(() => {
    setRealtimeTick((previous) => previous + 1);
  }, []);

  const handleDutyOrAnalyticsChange = useCallback(() => {
    setRealtimeTick((previous) => previous + 1);
  }, []);

  useRealtime({
    onInstructorChange: handleInstructorChange,
    onDutyChange: handleDutyOrAnalyticsChange,
    onAnalyticsChange: handleDutyOrAnalyticsChange,
  });

  return {
    instructor,
    stats,
    punctualityPercentage,
    instructors,
    pendingRequests,
    loading,
    error,
    fetchAllInstructors,
    fetchPendingRequests,
    createInstructor,
    approveInstructor,
    rejectInstructor,
    updateInstructor,
    deleteInstructor,
    deactivateInstructor,
  };
}
