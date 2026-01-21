import { useCallback, useState } from 'react';
import { supabase } from '../supabase';
import { sanitizeText, sanitizeTime, sanitizeUUID } from '../utils/sanitize';

function toFriendlyError(message, fallback) {
  if (!message) return fallback;
  if (/violates row-level security/i.test(message)) return 'You do not have permission to perform this action.';
  if (/network|failed to fetch|timeout/i.test(message)) return 'Network issue detected. Please try again.';
  return fallback;
}

export function useExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAllExams = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('exams')
        .select(`
          *,
          exam_rooms (
            id,
            room_id,
            max_instructors,
            rooms (id, room_number, floor_id, department, capacity, floors (id, floor_number, floor_label, building)),
            duties (id, instructor_id)
          )
        `)
        .order('exam_date', { ascending: false });

      if (fetchError) throw fetchError;

      const mapped = (data ?? []).map((exam) => {
        const roomCount = exam.exam_rooms?.length ?? 0;
        const instructorCount = (exam.exam_rooms ?? []).reduce((sum, room) => sum + (room.duties?.length ?? 0), 0);
        return {
          ...exam,
          room_count: roomCount,
          instructor_count: instructorCount,
        };
      });

      setExams(mapped);
      return { error: null, data: mapped };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to fetch exams right now.');
      setError(message);
      setExams([]);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const createExam = useCallback(async (data) => {
    setLoading(true);
    setError('');

    try {
      const payload = {
        subject: sanitizeText(data.subject),
        department: sanitizeText(data.department),
        exam_date: data.exam_date,
        start_time: sanitizeTime(data.start_time),
        end_time: sanitizeTime(data.end_time),
        shift_label: sanitizeText(data.shift_label || 'Custom'),
        shift_start: sanitizeTime(data.shift_start || data.start_time),
        shift_end: sanitizeTime(data.shift_end || data.end_time),
        day_of_week: sanitizeText(data.day_of_week),
        total_students: Number.isFinite(Number(data.total_students)) ? Number(data.total_students) : null,
        notes: sanitizeText(data.notes),
        status: data.status || 'upcoming',
      };

      if (!payload.subject || !payload.department || !payload.exam_date || !payload.start_time || !payload.end_time) {
        setLoading(false);
        return { error: 'Please provide all required exam details.' };
      }

      const { data: created, error: createError } = await supabase.from('exams').insert(payload).select('*').single();
      if (createError) throw createError;

      await fetchAllExams();
      return { error: null, data: created };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to create exam right now.');
      setError(message);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, [fetchAllExams]);

  const updateExam = useCallback(async (id, data) => {
    setLoading(true);
    setError('');

    try {
      if (!sanitizeUUID(id)) {
        setLoading(false);
        return { error: 'Invalid exam selected.' };
      }

      const payload = { ...data };
      if (Object.prototype.hasOwnProperty.call(payload, 'subject')) payload.subject = sanitizeText(payload.subject);
      if (Object.prototype.hasOwnProperty.call(payload, 'department')) payload.department = sanitizeText(payload.department);
      if (Object.prototype.hasOwnProperty.call(payload, 'notes')) payload.notes = sanitizeText(payload.notes);
      if (Object.prototype.hasOwnProperty.call(payload, 'start_time')) payload.start_time = sanitizeTime(payload.start_time);
      if (Object.prototype.hasOwnProperty.call(payload, 'end_time')) payload.end_time = sanitizeTime(payload.end_time);

      const { error: updateError } = await supabase.from('exams').update(payload).eq('id', id);
      if (updateError) throw updateError;

      await fetchAllExams();
      return { error: null };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to update exam right now.');
      setError(message);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, [fetchAllExams]);

  const deleteExam = useCallback(async (id) => {
    setLoading(true);
    setError('');

    try {
      if (!sanitizeUUID(id)) {
        setLoading(false);
        return { error: 'Invalid exam selected.' };
      }

      const { error: deleteError } = await supabase.from('exams').delete().eq('id', id);
      if (deleteError) throw deleteError;

      await fetchAllExams();
      return { error: null };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to delete exam right now.');
      setError(message);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, [fetchAllExams]);

  const assignRoomToExam = useCallback(async (examId, roomId, maxInstructors = 1) => {
    try {
      if (!sanitizeUUID(examId) || !sanitizeUUID(roomId)) {
        return { error: 'Invalid exam or room selected.' };
      }

      const payload = {
        exam_id: examId,
        room_id: roomId,
        max_instructors: Math.max(1, Number.parseInt(String(maxInstructors || 1), 10) || 1),
      };

      const { data, error: upsertError } = await supabase
        .from('exam_rooms')
        .upsert(payload, { onConflict: 'exam_id,room_id' })
        .select('*')
        .single();

      if (upsertError) throw upsertError;
      return { error: null, data };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to assign room right now.');
      setError(message);
      return { error: message };
    }
  }, []);

  return {
    exams,
    loading,
    error,
    fetchAllExams,
    createExam,
    updateExam,
    deleteExam,
    assignRoomToExam,
  };
}
