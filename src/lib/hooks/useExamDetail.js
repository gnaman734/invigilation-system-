import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { sanitizeUUID } from '../utils/sanitize';

function toFriendlyError(message, fallback) {
  if (!message) return fallback;
  if (/violates row-level security/i.test(message)) return 'You do not have permission to perform this action.';
  if (/network|failed to fetch|timeout/i.test(message)) return 'Network issue detected. Please try again.';
  return fallback;
}

function buildStats(duties = [], rooms = []) {
  const totalDuties = duties.length;
  const pendingCount = duties.filter((item) => item.status === 'pending').length;
  const onTimeCount = duties.filter((item) => item.status === 'on-time').length;
  const lateCount = duties.filter((item) => item.status === 'late').length;
  const completedCount = onTimeCount + lateCount;
  const completionRate = totalDuties > 0 ? Math.round((completedCount / totalDuties) * 100) : 0;

  return {
    total_rooms: rooms.length,
    total_instructors: rooms.reduce((sum, room) => sum + (room.instructors?.length ?? 0), 0),
    total_duties: totalDuties,
    pending_count: pendingCount,
    on_time_count: onTimeCount,
    late_count: lateCount,
    completion_rate: completionRate,
  };
}

function mapExamDetail(payload) {
  if (!payload) {
    return {
      exam: null,
      rooms: [],
      stats: buildStats([], []),
    };
  }

  const exam = {
    id: payload.id,
    subject: payload.subject,
    department: payload.department,
    exam_date: payload.exam_date,
    day_of_week: payload.day_of_week,
    shift_start: payload.shift_start || payload.start_time,
    shift_end: payload.shift_end || payload.end_time,
    slots: Array.isArray(payload.slots)
      ? payload.slots
      : payload.shift_start || payload.shift_end || payload.start_time || payload.end_time
        ? [{ start: payload.shift_start || payload.start_time, end: payload.shift_end || payload.end_time }]
        : [],
    status: payload.status,
    notes: payload.notes,
    expected_students: payload.expected_students ?? payload.total_students ?? null,
  };

  const duties = payload.duties ?? [];
  const dutyByKey = duties.reduce((acc, item) => {
    const keyByInstructorAndRoom = `${item.room_id}:${item.instructor_id}`;
    const keyByExamRoomInstructor = item.exam_room_instructor_id ? `eri:${item.exam_room_instructor_id}` : null;
    acc[keyByInstructorAndRoom] = item;
    if (keyByExamRoomInstructor) acc[keyByExamRoomInstructor] = item;
    return acc;
  }, {});

  const rooms = (payload.exam_rooms ?? []).map((examRoom) => {
    const room = examRoom.rooms ?? {};

    const instructors = (examRoom.exam_room_instructors ?? []).map((link) => {
      const duty = dutyByKey[`eri:${link.id}`] ?? dutyByKey[`${room.id}:${link.instructor_id}`] ?? null;
      return {
        exam_room_instructor_id: link.id,
        instructor_id: link.instructor_id,
        name: link.instructors?.name ?? 'Unknown',
        department: link.instructors?.department ?? '--',
        duty_id: duty?.id ?? null,
        duty_status: duty?.status ?? 'pending',
        arrival_time: duty?.arrival_time ?? null,
        reporting_time: duty?.reporting_time ?? null,
        is_required: link.is_required ?? true,
      };
    });

    return {
      room_id: room.id,
      room_number: room.room_number,
      floor_label: room.floors?.floor_label || room.building || '--',
      department: room.department || '--',
      capacity: room.capacity ?? null,
      exam_room_id: examRoom.id,
      instructors,
    };
  });

  return {
    exam,
    rooms,
    stats: buildStats(duties, rooms),
  };
}

export function useExamDetail(initialExamId = null) {
  const [examDetail, setExamDetail] = useState({ exam: null, rooms: [], stats: buildStats([], []) });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState(null);
  const examIdRef = useRef(initialExamId);

  const roomIds = useMemo(
    () => new Set((examDetail.rooms ?? []).map((room) => room.exam_room_id).filter(Boolean)),
    [examDetail.rooms]
  );

  const fetchExamDetail = useCallback(async (examIdInput) => {
    const examId = sanitizeUUID(examIdInput || examIdRef.current || '');
    if (!examId) {
      setError('Invalid exam selected.');
      return { error: 'Invalid exam selected.' };
    }

    examIdRef.current = examId;
    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('exams')
        .select(`
          id,
          subject,
          department,
          exam_date,
          day_of_week,
          start_time,
          end_time,
          shift_start,
          shift_end,
          status,
          notes,
          total_students,
          exam_rooms (
            id,
            room_id,
            rooms (
              id,
              room_number,
              building,
              department,
              capacity,
              floors (floor_label)
            ),
            exam_room_instructors (
              id,
              instructor_id,
              is_required,
              instructors (
                id,
                name,
                department
              )
            )
          ),
          duties (
            id,
            exam_room_instructor_id,
            instructor_id,
            room_id,
            reporting_time,
            arrival_time,
            status
          )
        `)
        .eq('id', examId)
        .single();

      if (fetchError) throw fetchError;

      const mapped = mapExamDetail(data);
      setExamDetail(mapped);
      return { error: null, data: mapped };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to fetch exam detail right now.');
      setError(message);
      setExamDetail({ exam: null, rooms: [], stats: buildStats([], []) });
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateExamStatus = useCallback(async (examIdInput, status) => {
    try {
      const examId = sanitizeUUID(examIdInput || examIdRef.current || '');
      if (!examId) return { error: 'Invalid exam selected.' };
      if (!['upcoming', 'ongoing', 'completed'].includes(status)) return { error: 'Invalid status value.' };

      const { error: updateError } = await supabase.from('exams').update({ status }).eq('id', examId);
      if (updateError) throw updateError;

      await fetchExamDetail(examId);
      return { error: null };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to update exam status right now.');
      setError(message);
      return { error: message };
    }
  }, [fetchExamDetail]);

  const cancelDuty = useCallback(async (dutyId) => {
    try {
      const sanitizedDutyId = sanitizeUUID(dutyId);
      if (!sanitizedDutyId) return { error: 'Invalid duty selected.' };

      const { error: updateError } = await supabase.from('duties').update({ status: 'cancelled' }).eq('id', sanitizedDutyId);
      if (updateError) throw updateError;

      await fetchExamDetail(examIdRef.current);
      return { error: null };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to cancel duty right now.');
      setError(message);
      return { error: message };
    }
  }, [fetchExamDetail]);

  const restoreDuty = useCallback(async (dutyId) => {
    try {
      const sanitizedDutyId = sanitizeUUID(dutyId);
      if (!sanitizedDutyId) return { error: 'Invalid duty selected.' };

      const { error: updateError } = await supabase.from('duties').update({ status: 'pending' }).eq('id', sanitizedDutyId);
      if (updateError) throw updateError;

      await fetchExamDetail(examIdRef.current);
      return { error: null };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to restore duty right now.');
      setError(message);
      return { error: message };
    }
  }, [fetchExamDetail]);

  const removeInstructorFromExam = useCallback(async (examRoomInstructorId, dutyId) => {
    try {
      const eriId = sanitizeUUID(examRoomInstructorId);
      const dutySanitized = sanitizeUUID(dutyId);
      if (!eriId) return { error: 'Invalid instructor assignment selected.' };

      const { error: deleteError } = await supabase.from('exam_room_instructors').delete().eq('id', eriId);
      if (deleteError) throw deleteError;

      if (dutySanitized) {
        const { error: dutyUpdateError } = await supabase.from('duties').update({ status: 'cancelled' }).eq('id', dutySanitized);
        if (dutyUpdateError) throw dutyUpdateError;
      }

      await fetchExamDetail(examIdRef.current);
      return { error: null };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to remove instructor right now.');
      setError(message);
      return { error: message };
    }
  }, [fetchExamDetail]);

  const addInstructorToRoom = useCallback(async (examRoomId, instructorId) => {
    try {
      const sanitizedExamRoomId = sanitizeUUID(examRoomId);
      const sanitizedInstructorId = sanitizeUUID(instructorId);
      if (!sanitizedExamRoomId || !sanitizedInstructorId) {
        return { error: 'Invalid room or instructor selected.' };
      }

      const { data: inserted, error: insertError } = await supabase
        .from('exam_room_instructors')
        .insert({ exam_room_id: sanitizedExamRoomId, instructor_id: sanitizedInstructorId, is_required: true })
        .select('id')
        .single();

      if (insertError) throw insertError;

      const { data: examRoomData, error: roomError } = await supabase
        .from('exam_rooms')
        .select('exam_id, room_id, exams(start_time, shift_start)')
        .eq('id', sanitizedExamRoomId)
        .single();

      if (roomError) throw roomError;

      const reportingTime = examRoomData?.exams?.shift_start || examRoomData?.exams?.start_time || '09:00';

      const { error: dutyError } = await supabase.from('duties').insert({
        exam_id: examRoomData.exam_id,
        room_id: examRoomData.room_id,
        instructor_id: sanitizedInstructorId,
        exam_room_instructor_id: inserted.id,
        reporting_time: reportingTime,
        status: 'pending',
      });

      if (dutyError) throw dutyError;

      await fetchExamDetail(examIdRef.current);
      return { error: null };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to add instructor right now.');
      setError(message);
      return { error: message };
    }
  }, [fetchExamDetail]);

  const refetch = useCallback(() => fetchExamDetail(examIdRef.current), [fetchExamDetail]);

  useEffect(() => {
    if (!sanitizeUUID(examIdRef.current || '')) return undefined;

    const roomIdValues = Array.from(roomIds);

    const dutiesChannel = supabase
      .channel(`exam-detail-duties-${examIdRef.current}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'duties',
          filter: `exam_id=eq.${examIdRef.current}`,
        },
        async (payload) => {
          setLastRealtimeEvent({ table: 'duties', ...payload });
          await fetchExamDetail(examIdRef.current);
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    const instructorsChannel = supabase
      .channel(`exam-detail-room-instructors-${examIdRef.current}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exam_room_instructors',
        },
        async (payload) => {
          const impactedRoomId = payload?.new?.exam_room_id || payload?.old?.exam_room_id;
          if (roomIdValues.length > 0 && impactedRoomId && !roomIdValues.includes(impactedRoomId)) {
            return;
          }
          setLastRealtimeEvent({ table: 'exam_room_instructors', ...payload });
          await fetchExamDetail(examIdRef.current);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dutiesChannel);
      supabase.removeChannel(instructorsChannel);
      setIsLive(false);
    };
  }, [fetchExamDetail, roomIds]);

  useEffect(() => {
    if (!initialExamId) return;
    fetchExamDetail(initialExamId);
  }, [initialExamId, fetchExamDetail]);

  return {
    examDetail,
    loading,
    error,
    isLive,
    lastRealtimeEvent,
    fetchExamDetail,
    updateExamStatus,
    cancelDuty,
    restoreDuty,
    removeInstructorFromExam,
    addInstructorToRoom,
    refetch,
  };
}

export default useExamDetail;
