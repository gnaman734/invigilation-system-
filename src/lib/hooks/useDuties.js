import { useCallback, useEffect, useState } from 'react';
import { format, isBefore, parseISO, startOfToday } from 'date-fns';
import { supabase } from '../supabase';
import { useAuthStore } from '../../store/authStore';
import { getStatus } from '../utils/punctuality';
import { useToast } from '../../components/shared/Toast';
import { useRealtime } from './useRealtime';
import { enqueueOfflineOperation } from '../offlineQueue';
import { sanitizeTime, sanitizeUUID } from '../utils/sanitize';

function parseDutyDate(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function groupByDate(duties) {
  const groups = duties.reduce((accumulator, duty) => {
    const dateKey = typeof duty.exam_date === 'string' && duty.exam_date ? duty.exam_date : 'unknown-date';
    const parsedDate = parseDutyDate(duty.exam_date);

    if (!accumulator[dateKey]) {
      accumulator[dateKey] = {
        dateKey,
        dateLabel: parsedDate ? format(parsedDate, 'EEEE, dd MMMM yyyy') : 'Date not available',
        duties: [],
      };
    }

    accumulator[dateKey].duties.push(duty);
    return accumulator;
  }, {});

  return Object.values(groups).sort((a, b) => {
    if (a.dateKey === 'unknown-date') {
      return 1;
    }

    if (b.dateKey === 'unknown-date') {
      return -1;
    }

    return a.dateKey.localeCompare(b.dateKey);
  });
}

function flattenGroups(groups) {
  return (groups ?? []).flatMap((group) => group.duties ?? []);
}

function toFriendlyError(message, fallback) {
  if (!message) {
    return fallback;
  }

  if (/violates row-level security/i.test(message)) {
    return 'You do not have permission to perform this action.';
  }

  if (/duplicate key|already exists/i.test(message)) {
    return 'This duty already exists.';
  }

  if (/network|failed to fetch|timeout/i.test(message)) {
    return 'Network issue detected. Please try again.';
  }

  return fallback;
}

export function useDuties() {
  const { addToast } = useToast();
  const role = useAuthStore((state) => state.role);
  const instructorId = useAuthStore((state) => state.instructorId);
  const isAdmin = role === 'admin';
  const [upcomingDuties, setUpcomingDuties] = useState([]);
  const [pastDuties, setPastDuties] = useState([]);
  const [allDuties, setAllDuties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingDutyIds, setProcessingDutyIds] = useState([]);

  const updateInstructorGroupedDuties = useCallback((updater) => {
    setUpcomingDuties((previousUpcoming) => {
      const updatedUpcoming = updater(flattenGroups(previousUpcoming));
      const today = startOfToday();

      const nextUpcoming = [];
      const nextPast = [];

      updatedUpcoming.forEach((duty) => {
        const dutyDate = parseDutyDate(duty.exam_date);
        if (!dutyDate) {
          nextUpcoming.push(duty);
          return;
        }

        if (isBefore(dutyDate, today)) {
          nextPast.push(duty);
        } else {
          nextUpcoming.push(duty);
        }
      });

      setPastDuties(groupByDate(nextPast));
      return groupByDate(nextUpcoming);
    });
  }, []);

  const fetchDutyDetailById = useCallback(async (dutyId) => {
    const { data, error: fetchError } = await supabase
      .from('duties_detailed')
      .select('*')
      .eq('duty_id', dutyId)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    return data;
  }, []);

  const fetchInstructorDuties = useCallback(async () => {
    if (!instructorId) {
      setUpcomingDuties([]);
      setPastDuties([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('duties_detailed')
        .select('*')
        .eq('instructor_id', instructorId)
        .order('exam_date', { ascending: true })
        .order('reporting_time', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      const today = startOfToday();
      const upcoming = [];
      const past = [];

      for (const duty of data ?? []) {
        const dutyDate = parseDutyDate(duty.exam_date);
        if (!dutyDate) {
          upcoming.push(duty);
          continue;
        }

        if (isBefore(dutyDate, today)) {
          past.push(duty);
        } else {
          upcoming.push(duty);
        }
      }

      setUpcomingDuties(groupByDate(upcoming));
      setPastDuties(groupByDate(past));
    } catch (caughtError) {
      setError(toFriendlyError(caughtError?.message, 'Unable to fetch duties right now.'));
      setUpcomingDuties([]);
      setPastDuties([]);
    } finally {
      setLoading(false);
    }
  }, [instructorId]);

  const fetchAllDuties = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('duties_detailed')
        .select('*')
        .order('exam_date', { ascending: true })
        .order('reporting_time', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setAllDuties(data ?? []);
      return { error: null, data: data ?? [] };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to fetch duties right now.');
      setError(message);
      setAllDuties([]);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAllDuties();
      return;
    }

    fetchInstructorDuties();
  }, [isAdmin, fetchAllDuties, fetchInstructorDuties]);

  const handleDutyRealtimeChange = useCallback(
    async (payload) => {
      const eventType = payload?.eventType;
      const newRow = payload?.new;
      const oldRow = payload?.old;
      const dutyId = newRow?.id ?? oldRow?.id;

      if (!dutyId) {
        return;
      }

      if (eventType === 'DELETE') {
        setAllDuties((previous) => previous.filter((duty) => duty.duty_id !== dutyId));
        updateInstructorGroupedDuties((duties) => duties.filter((duty) => duty.duty_id !== dutyId));
        addToast({ type: 'info', message: 'Duty removed' });
        return;
      }

      const detailedDuty = await fetchDutyDetailById(dutyId);
      if (!detailedDuty) {
        return;
      }

      if (isAdmin) {
        setAllDuties((previous) => {
          const existingIndex = previous.findIndex((duty) => duty.duty_id === dutyId);

          if (existingIndex === -1) {
            return [detailedDuty, ...previous];
          }

          const next = [...previous];
          next[existingIndex] = { ...next[existingIndex], ...detailedDuty };
          return next;
        });
      }

      if (!isAdmin && detailedDuty.instructor_id === instructorId) {
        if (eventType === 'INSERT') {
          updateInstructorGroupedDuties((duties) => {
            const exists = duties.some((duty) => duty.duty_id === dutyId);
            if (exists) {
              return duties;
            }
            return [detailedDuty, ...duties];
          });
          addToast({ type: 'info', message: 'New duty assigned' });
          return;
        }

        if (eventType === 'UPDATE') {
          updateInstructorGroupedDuties((duties) =>
            duties.map((duty) => {
              if (duty.duty_id !== dutyId) {
                return duty;
              }

              if (duty.status !== detailedDuty.status) {
                if (detailedDuty.status === 'on-time') {
                  addToast({ type: 'success', message: '✅ Marked as on-time' });
                }

                if (detailedDuty.status === 'late') {
                  addToast({ type: 'warning', message: '⚠️ Marked as late' });
                }
              }

              return { ...duty, ...detailedDuty };
            })
          );
        }
      }

      if (eventType === 'UPDATE' && isAdmin) {
        setAllDuties((previous) =>
          previous.map((duty) => {
            if (duty.duty_id !== dutyId) {
              return duty;
            }

            if (duty.status !== detailedDuty.status) {
              if (detailedDuty.status === 'on-time') {
                addToast({ type: 'success', message: '✅ Marked as on-time' });
              }

              if (detailedDuty.status === 'late') {
                addToast({ type: 'warning', message: '⚠️ Marked as late' });
              }
            }

            return { ...duty, ...detailedDuty };
          })
        );
      }
    },
    [addToast, fetchDutyDetailById, instructorId, isAdmin, updateInstructorGroupedDuties]
  );

  useRealtime({ onDutyChange: handleDutyRealtimeChange });

  const markArrival = useCallback(
    async (dutyId, arrivalTime) => {
      if (!instructorId) {
        return { error: 'Instructor profile not found.' };
      }

      setProcessingDutyIds((previous) => [...new Set([...previous, dutyId])]);

      const previousUpcoming = upcomingDuties;
      const previousPast = pastDuties;

      try {
        const { data: dutyData, error: dutyError } = await supabase
          .from('duties')
          .select('id, reporting_time')
          .eq('id', dutyId)
          .eq('instructor_id', instructorId)
          .single();

        if (dutyError) {
          throw dutyError;
        }

        const nextStatus = getStatus(dutyData.reporting_time, arrivalTime);

        updateInstructorGroupedDuties((duties) =>
          duties.map((duty) =>
            duty.duty_id === dutyId
              ? {
                  ...duty,
                  arrival_time: arrivalTime,
                  status: nextStatus,
                }
              : duty
          )
        );

        const performUpdate = async () => {
          const { error: updateError } = await supabase
            .from('duties')
            .update({
              arrival_time: arrivalTime,
              status: nextStatus,
            })
            .eq('id', dutyId)
            .eq('instructor_id', instructorId);

          if (updateError) {
            throw updateError;
          }
        };

        if (!window.navigator.onLine) {
          enqueueOfflineOperation(performUpdate, 'Mark arrival');
          addToast({ type: 'info', message: 'Offline: arrival queued for sync.' });
          setProcessingDutyIds((previous) => previous.filter((id) => id !== dutyId));
          return { error: null, status: nextStatus, queued: true };
        }

        await performUpdate();
        return { error: null, status: nextStatus };
      } catch (caughtError) {
        setUpcomingDuties(previousUpcoming);
        setPastDuties(previousPast);

        const message = toFriendlyError(caughtError?.message, 'Unable to mark arrival. Please try again.');
        setError(message);
        addToast({ type: 'error', message: 'Unable to mark arrival right now.' });
        return { error: message };
      } finally {
        setProcessingDutyIds((previous) => previous.filter((id) => id !== dutyId));
      }
    },
    [addToast, instructorId, pastDuties, upcomingDuties, updateInstructorGroupedDuties]
  );

  const createDuty = useCallback(
    async (data) => {
      setLoading(true);
      setError('');

      try {
        const payload = {
          exam_id: sanitizeUUID(data.exam_id),
          room_id: sanitizeUUID(data.room_id),
          instructor_id: sanitizeUUID(data.instructor_id),
          reporting_time: sanitizeTime(String(data.reporting_time ?? '').slice(0, 5)) || String(data.reporting_time ?? ''),
          status: data.status ?? 'pending',
          arrival_time: data.arrival_time ?? null,
        };

        if (!payload.exam_id || !payload.room_id || !payload.instructor_id || !payload.reporting_time) {
          setLoading(false);
          return { error: 'Please provide valid duty details.' };
        }

        const performCreate = async () => {
          const { data: created, error: createError } = await supabase
            .from('duties')
            .insert(payload)
            .select()
            .single();

          if (createError) {
            throw createError;
          }

          await fetchAllDuties();
          return created;
        };

        if (!window.navigator.onLine) {
          enqueueOfflineOperation(performCreate, 'Create duty');
          setLoading(false);
          return { error: null, queued: true };
        }

        const created = await performCreate();
        return { error: null, data: created };
      } catch (caughtError) {
        const message = toFriendlyError(caughtError?.message, 'Unable to create duty right now.');
        setError(message);
        setLoading(false);
        return { error: message };
      }
    },
    [fetchAllDuties]
  );

  const updateDuty = useCallback(
    async (id, data) => {
      setLoading(true);
      setError('');

      try {
        const sanitizedData = {
          ...data,
          exam_id: data.exam_id ? sanitizeUUID(data.exam_id) : data.exam_id,
          room_id: data.room_id ? sanitizeUUID(data.room_id) : data.room_id,
          instructor_id: data.instructor_id ? sanitizeUUID(data.instructor_id) : data.instructor_id,
          reporting_time: data.reporting_time ? sanitizeTime(String(data.reporting_time).slice(0, 5)) || data.reporting_time : data.reporting_time,
        };

        const performUpdate = async () => {
          const { data: updated, error: updateError } = await supabase
            .from('duties')
            .update(sanitizedData)
            .eq('id', id)
            .select()
            .single();

          if (updateError) {
            throw updateError;
          }

          await fetchAllDuties();
          return updated;
        };

        if (!window.navigator.onLine) {
          enqueueOfflineOperation(performUpdate, 'Update duty');
          setLoading(false);
          return { error: null, queued: true };
        }

        const updated = await performUpdate();
        return { error: null, data: updated };
      } catch (caughtError) {
        const message = toFriendlyError(caughtError?.message, 'Unable to update duty right now.');
        setError(message);
        setLoading(false);
        return { error: message };
      }
    },
    [fetchAllDuties]
  );

  const deleteDuty = useCallback(
    async (id) => {
      setLoading(true);
      setError('');

      try {
        const performDelete = async () => {
          const { error: deleteError } = await supabase.from('duties').delete().eq('id', id);

          if (deleteError) {
            throw deleteError;
          }

          await fetchAllDuties();
        };

        if (!window.navigator.onLine) {
          enqueueOfflineOperation(performDelete, 'Delete duty');
          setLoading(false);
          return { error: null, queued: true };
        }

        await performDelete();
        return { error: null };
      } catch (caughtError) {
        const message = toFriendlyError(caughtError?.message, 'Unable to delete duty right now.');
        setError(message);
        setLoading(false);
        return { error: message };
      }
    },
    [fetchAllDuties]
  );

  return {
    isAdmin,
    allDuties,
    upcomingDuties,
    pastDuties,
    loading,
    error,
    fetchAllDuties,
    createDuty,
    updateDuty,
    deleteDuty,
    markArrival,
    processingDutyIds,
  };
}
