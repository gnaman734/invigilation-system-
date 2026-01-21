import { useCallback, useState } from 'react';
import { supabase } from '../supabase';
import { sanitizeText, sanitizeTime, sanitizeUUID } from '../utils/sanitize';

function toFriendlyError(message, fallback) {
  if (!message) return fallback;
  if (/violates row-level security/i.test(message)) return 'You do not have permission to perform this action.';
  if (/network|failed to fetch|timeout/i.test(message)) return 'Network issue detected. Please try again.';
  return fallback;
}

export function useExamManagement() {
  const [exams, setExams] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
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
            rooms (*, floors (*)),
            exam_room_instructors (
              id,
              instructor_id,
              is_required,
              instructors (id, name, email, department, total_duties)
            )
          )
        `)
        .order('exam_date', { ascending: false });

      if (fetchError) throw fetchError;
      setExams(data ?? []);
      return { error: null, data: data ?? [] };
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
        status: data.status || 'upcoming',
      };

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
      if (!sanitizeUUID(id)) return { error: 'Invalid exam selected.' };
      const { error: updateError } = await supabase.from('exams').update(data).eq('id', id);
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
      if (!sanitizeUUID(id)) return { error: 'Invalid exam selected.' };
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

  const fetchAllFloors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase.from('floors').select('*').order('floor_number', { ascending: true });
      if (fetchError) throw fetchError;
      setFloors(data ?? []);
      return { error: null, data: data ?? [] };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to fetch floors right now.');
      setError(message);
      setFloors([]);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const createFloor = useCallback(async (data) => {
    setLoading(true);
    setError('');
    try {
      const parsedFloor = Number.parseInt(String(data.floor_number ?? '').trim(), 10);
      if (!Number.isFinite(parsedFloor)) {
        setLoading(false);
        return { error: 'Floor number must be a valid number.' };
      }

      const payload = {
        floor_number: parsedFloor,
        floor_label: sanitizeText(data.floor_label),
        building: sanitizeText(data.building),
      };
      const { data: created, error: createError } = await supabase.from('floors').insert(payload).select('*').single();
      if (createError) throw createError;
      await fetchAllFloors();
      return { error: null, data: created };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to create floor right now.');
      setError(message);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, [fetchAllFloors]);

  const updateFloor = useCallback(async (id, data) => {
    setLoading(true);
    setError('');
    try {
      if (!sanitizeUUID(id)) return { error: 'Invalid floor selected.' };
      const payload = { ...data };
      if (Object.prototype.hasOwnProperty.call(payload, 'floor_number')) {
        const parsedFloor = Number.parseInt(String(payload.floor_number ?? '').trim(), 10);
        if (!Number.isFinite(parsedFloor)) {
          setLoading(false);
          return { error: 'Floor number must be a valid number.' };
        }
        payload.floor_number = parsedFloor;
      }
      const { error: updateError } = await supabase.from('floors').update(payload).eq('id', id);
      if (updateError) throw updateError;
      await fetchAllFloors();
      return { error: null };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to update floor right now.');
      setError(message);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, [fetchAllFloors]);

  const deleteFloor = useCallback(async (id) => {
    setLoading(true);
    setError('');
    try {
      if (!sanitizeUUID(id)) return { error: 'Invalid floor selected.' };
      const { error: deleteError } = await supabase.from('floors').delete().eq('id', id);
      if (deleteError) throw deleteError;
      await fetchAllFloors();
      return { error: null };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to delete floor right now.');
      setError(message);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, [fetchAllFloors]);

  const fetchRoomsByFloor = useCallback(async (floorId) => {
    setLoading(true);
    setError('');
    try {
      let query = supabase.from('rooms').select('*, floors (*)').order('room_number', { ascending: true });
      if (floorId && floorId !== 'all') {
        query = query.eq('floor_id', floorId);
      }
      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setRooms(data ?? []);
      return { error: null, data: data ?? [] };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to fetch rooms right now.');
      setError(message);
      setRooms([]);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const createRoom = useCallback(async (data) => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        room_number: sanitizeText(data.room_number),
        floor_id: sanitizeUUID(data.floor_id) ? data.floor_id : null,
        department: sanitizeText(data.department),
        capacity: Number(data.capacity || 30),
        is_active: data.is_active ?? true,
        building: sanitizeText(data.building),
      };
      const { data: created, error: createError } = await supabase.from('rooms').insert(payload).select('*').single();
      if (createError) throw createError;
      await fetchRoomsByFloor(payload.floor_id || 'all');
      return { error: null, data: created };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to create room right now.');
      setError(message);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, [fetchRoomsByFloor]);

  const updateRoom = useCallback(async (id, data) => {
    setLoading(true);
    setError('');
    try {
      if (!sanitizeUUID(id)) return { error: 'Invalid room selected.' };
      const { error: updateError } = await supabase.from('rooms').update(data).eq('id', id);
      if (updateError) throw updateError;
      await fetchRoomsByFloor(data.floor_id || 'all');
      return { error: null };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to update room right now.');
      setError(message);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, [fetchRoomsByFloor]);

  const deleteRoom = useCallback(async (id) => {
    setLoading(true);
    setError('');
    try {
      if (!sanitizeUUID(id)) return { error: 'Invalid room selected.' };
      const { error: deleteError } = await supabase.from('rooms').delete().eq('id', id);
      if (deleteError) throw deleteError;
      await fetchRoomsByFloor('all');
      return { error: null };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to delete room right now.');
      setError(message);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, [fetchRoomsByFloor]);

  const assignRoomsToExam = useCallback(async (examId, roomIds = []) => {
    try {
      const payload = roomIds.filter((id) => sanitizeUUID(id)).map((roomId) => ({ exam_id: examId, room_id: roomId }));
      if (!payload.length) return { error: null, data: [] };
      const { data, error: upsertError } = await supabase.from('exam_rooms').upsert(payload, { onConflict: 'exam_id,room_id' }).select('*');
      if (upsertError) throw upsertError;
      return { error: null, data: data ?? [] };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to assign rooms right now.');
      setError(message);
      return { error: message };
    }
  }, []);

  const removeRoomFromExam = useCallback(async (examId, roomId) => {
    try {
      const { error: deleteError } = await supabase.from('exam_rooms').delete().eq('exam_id', examId).eq('room_id', roomId);
      if (deleteError) throw deleteError;
      return { error: null };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to remove room from exam right now.');
      setError(message);
      return { error: message };
    }
  }, []);

  const assignInstructorsToExamRoom = useCallback(async (examRoomId, instructorIds = []) => {
    try {
      const payload = instructorIds.filter((id) => sanitizeUUID(id)).map((instructorId) => ({
        exam_room_id: examRoomId,
        instructor_id: instructorId,
        is_required: true,
      }));
      if (!payload.length) return { error: null, data: [] };
      const { data, error: upsertError } = await supabase
        .from('exam_room_instructors')
        .upsert(payload, { onConflict: 'exam_room_id,instructor_id' })
        .select('*');
      if (upsertError) throw upsertError;
      return { error: null, data: data ?? [] };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to assign instructors right now.');
      setError(message);
      return { error: message };
    }
  }, []);

  const removeInstructorFromExamRoom = useCallback(async (examRoomId, instructorId) => {
    try {
      const { error: deleteError } = await supabase
        .from('exam_room_instructors')
        .delete()
        .eq('exam_room_id', examRoomId)
        .eq('instructor_id', instructorId);
      if (deleteError) throw deleteError;
      return { error: null };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to remove instructor right now.');
      setError(message);
      return { error: message };
    }
  }, []);

  const fetchExamRoomInstructors = useCallback(async (examRoomId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('exam_room_instructors')
        .select('*, instructors (id, name, email, department, total_duties)')
        .eq('exam_room_id', examRoomId);
      if (fetchError) throw fetchError;
      return { error: null, data: data ?? [] };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to fetch exam room instructors right now.');
      setError(message);
      return { error: message };
    }
  }, []);

  const autoAssignAllInstructors = useCallback(async (examId) => {
    try {
      const { data: approvedInstructors, error: instructorError } = await supabase
        .from('instructors')
        .select('id')
        .eq('status', 'approved');
      if (instructorError) throw instructorError;

      const { data: examRoomsData, error: examRoomsError } = await supabase
        .from('exam_rooms')
        .select('id')
        .eq('exam_id', examId);
      if (examRoomsError) throw examRoomsError;

      const payload = (examRoomsData ?? []).flatMap((examRoom) =>
        (approvedInstructors ?? []).map((instructor) => ({
          exam_room_id: examRoom.id,
          instructor_id: instructor.id,
          is_required: true,
        }))
      );

      if (!payload.length) return { error: null, data: [] };

      const { data, error: upsertError } = await supabase
        .from('exam_room_instructors')
        .upsert(payload, { onConflict: 'exam_room_id,instructor_id' })
        .select('*');

      if (upsertError) throw upsertError;
      return { error: null, data: data ?? [] };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to auto assign instructors right now.');
      setError(message);
      return { error: message };
    }
  }, []);

  return {
    exams,
    floors,
    rooms,
    loading,
    error,
    fetchAllExams,
    createExam,
    updateExam,
    deleteExam,
    fetchAllFloors,
    createFloor,
    updateFloor,
    deleteFloor,
    fetchRoomsByFloor,
    createRoom,
    updateRoom,
    deleteRoom,
    assignRoomsToExam,
    removeRoomFromExam,
    assignInstructorsToExamRoom,
    removeInstructorFromExamRoom,
    fetchExamRoomInstructors,
    autoAssignAllInstructors,
  };
}
