import { useCallback, useState } from 'react';
import { supabase } from '../supabase';
import { enqueueOfflineOperation } from '../offlineQueue';
import { useCacheStore } from '../../store/cacheStore';
import { sanitizeText, sanitizeUUID, sanitizeTime } from '../utils/sanitize';

function toFriendlyError(message, fallback) {
  if (!message) {
    return fallback;
  }

  if (/violates row-level security/i.test(message)) {
    return 'You do not have permission to perform this action.';
  }

  if (/network|failed to fetch|timeout/i.test(message)) {
    return 'Network issue detected. Please try again.';
  }

  return fallback;
}

export function useExamsRooms() {
  const setCachedExams = useCacheStore((state) => state.setExams);
  const setCachedRooms = useCacheStore((state) => state.setRooms);
  const getFreshExams = useCacheStore((state) => state.getFreshExams);
  const getFreshRooms = useCacheStore((state) => state.getFreshRooms);
  const [exams, setExams] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAllExams = useCallback(async (options = {}) => {
    const { force = false } = options;

    if (!force) {
      const cached = getFreshExams();
      if (cached) {
        setExams(cached);
        setLoading(false);
        return { error: null, data: cached };
      }
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('exams')
        .select('*')
        .order('exam_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setExams(data ?? []);
      setCachedExams(data ?? []);
      return { error: null, data: data ?? [] };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to fetch exams right now.');
      setError(message);
      setExams([]);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, [getFreshExams, setCachedExams]);

  const fetchAllRooms = useCallback(async (options = {}) => {
    const { force = false } = options;

    if (!force) {
      const cached = getFreshRooms();
      if (cached) {
        setRooms(cached);
        setLoading(false);
        return { error: null, data: cached };
      }
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .order('building', { ascending: true })
        .order('room_number', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setRooms(data ?? []);
      setCachedRooms(data ?? []);
      return { error: null, data: data ?? [] };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to fetch rooms right now.');
      setError(message);
      setRooms([]);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, [getFreshRooms, setCachedRooms]);

  const createExam = useCallback(
    async (data) => {
      setLoading(true);
      setError('');

      try {
        const payload = {
          subject: sanitizeText(data.subject),
          exam_date: data.exam_date,
          start_time: sanitizeTime(data.start_time),
          end_time: sanitizeTime(data.end_time),
        };

        if (!payload.subject || !payload.exam_date || !payload.start_time || !payload.end_time) {
          setLoading(false);
          return { error: 'Please enter valid exam details.' };
        }

        const performCreate = async () => {
          const { data: created, error: createError } = await supabase
            .from('exams')
            .insert(payload)
            .select()
            .single();

          if (createError) {
            throw createError;
          }

          await fetchAllExams({ force: true });
          return created;
        };

        if (!window.navigator.onLine) {
          enqueueOfflineOperation(performCreate, 'Create exam');
          setLoading(false);
          return { error: null, queued: true };
        }

        const created = await performCreate();
        return { error: null, data: created };
      } catch (caughtError) {
        const message = toFriendlyError(caughtError?.message, 'Unable to create exam right now.');
        setError(message);
        setLoading(false);
        return { error: message };
      }
    },
    [fetchAllExams]
  );

  const createRoom = useCallback(
    async (data) => {
      setLoading(true);
      setError('');

      try {
        const payload = {
          room_number: sanitizeText(data.room_number),
          building: sanitizeText(data.building),
          capacity: data.capacity ? Number(data.capacity) : null,
        };

        if (!payload.room_number) {
          setLoading(false);
          return { error: 'Please enter a valid room number.' };
        }

        const performCreate = async () => {
          const { data: created, error: createError } = await supabase
            .from('rooms')
            .insert(payload)
            .select()
            .single();

          if (createError) {
            throw createError;
          }

          await fetchAllRooms({ force: true });
          return created;
        };

        if (!window.navigator.onLine) {
          enqueueOfflineOperation(performCreate, 'Create room');
          setLoading(false);
          return { error: null, queued: true };
        }

        const created = await performCreate();
        return { error: null, data: created };
      } catch (caughtError) {
        const message = toFriendlyError(caughtError?.message, 'Unable to create room right now.');
        setError(message);
        setLoading(false);
        return { error: message };
      }
    },
    [fetchAllRooms]
  );

  const deleteExam = useCallback(
    async (id) => {
      setLoading(true);
      setError('');

      if (!sanitizeUUID(id)) {
        setLoading(false);
        return { error: 'Invalid exam selected.' };
      }

      try {
        const performDelete = async () => {
          const { error: deleteError } = await supabase.from('exams').delete().eq('id', id);

          if (deleteError) {
            throw deleteError;
          }

          await fetchAllExams({ force: true });
        };

        if (!window.navigator.onLine) {
          enqueueOfflineOperation(performDelete, 'Delete exam');
          setLoading(false);
          return { error: null, queued: true };
        }

        await performDelete();
        return { error: null };
      } catch (caughtError) {
        const message = toFriendlyError(caughtError?.message, 'Unable to delete exam right now.');
        setError(message);
        setLoading(false);
        return { error: message };
      }
    },
    [fetchAllExams]
  );

  const deleteRoom = useCallback(
    async (id) => {
      setLoading(true);
      setError('');

      if (!sanitizeUUID(id)) {
        setLoading(false);
        return { error: 'Invalid room selected.' };
      }

      try {
        const performDelete = async () => {
          const { error: deleteError } = await supabase.from('rooms').delete().eq('id', id);

          if (deleteError) {
            throw deleteError;
          }

          await fetchAllRooms({ force: true });
        };

        if (!window.navigator.onLine) {
          enqueueOfflineOperation(performDelete, 'Delete room');
          setLoading(false);
          return { error: null, queued: true };
        }

        await performDelete();
        return { error: null };
      } catch (caughtError) {
        const message = toFriendlyError(caughtError?.message, 'Unable to delete room right now.');
        setError(message);
        setLoading(false);
        return { error: message };
      }
    },
    [fetchAllRooms]
  );

  return {
    exams,
    rooms,
    loading,
    error,
    fetchAllExams,
    fetchAllRooms,
    createExam,
    createRoom,
    deleteExam,
    deleteRoom,
  };
}
