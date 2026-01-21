import { useCallback, useState } from 'react';
import { supabase } from '../supabase';
import { sanitizeText, sanitizeUUID } from '../utils/sanitize';

function toFriendlyError(message, fallback) {
  if (!message) return fallback;
  if (/violates row-level security/i.test(message)) return 'You do not have permission to perform this action.';
  if (/network|failed to fetch|timeout/i.test(message)) return 'Network issue detected. Please try again.';
  return fallback;
}

export function useRooms() {
  const [rooms, setRooms] = useState([]);
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAllRooms = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [{ data: roomsData, error: roomsError }, { data: floorsData, error: floorsError }] = await Promise.all([
        supabase.from('rooms').select('*, floors(id, floor_number, floor_label, building)').order('room_number', { ascending: true }),
        supabase.from('floors').select('id, floor_number, floor_label, building').order('floor_number', { ascending: true }),
      ]);

      if (roomsError) throw roomsError;
      if (floorsError) throw floorsError;

      setRooms(roomsData ?? []);
      setFloors(floorsData ?? []);
      return { error: null, data: roomsData ?? [] };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to fetch rooms right now.');
      setError(message);
      setRooms([]);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoomsByFloor = useCallback(async (floorId) => {
    setLoading(true);
    setError('');

    try {
      let query = supabase.from('rooms').select('*, floors(id, floor_number, floor_label, building)').order('room_number', { ascending: true });
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
        capacity: Number.parseInt(String(data.capacity ?? 30), 10),
        is_active: Boolean(data.is_active ?? true),
        building: sanitizeText(data.building),
      };

      if (!payload.room_number || !payload.floor_id) {
        setLoading(false);
        return { error: 'Room number and floor are required.' };
      }

      if (!Number.isFinite(payload.capacity) || payload.capacity < 1) {
        setLoading(false);
        return { error: 'Capacity must be a positive number.' };
      }

      const { data: created, error: createError } = await supabase.from('rooms').insert(payload).select('*').single();
      if (createError) throw createError;

      await fetchAllRooms();
      return { error: null, data: created };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to create room right now.');
      setError(message);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, [fetchAllRooms]);

  const updateRoom = useCallback(async (id, data) => {
    setLoading(true);
    setError('');

    try {
      if (!sanitizeUUID(id)) {
        setLoading(false);
        return { error: 'Invalid room selected.' };
      }

      const payload = { ...data };
      if (Object.prototype.hasOwnProperty.call(payload, 'room_number')) payload.room_number = sanitizeText(payload.room_number);
      if (Object.prototype.hasOwnProperty.call(payload, 'department')) payload.department = sanitizeText(payload.department);
      if (Object.prototype.hasOwnProperty.call(payload, 'building')) payload.building = sanitizeText(payload.building);
      if (Object.prototype.hasOwnProperty.call(payload, 'floor_id')) payload.floor_id = sanitizeUUID(payload.floor_id) ? payload.floor_id : null;
      if (Object.prototype.hasOwnProperty.call(payload, 'capacity')) {
        const capacity = Number.parseInt(String(payload.capacity ?? 0), 10);
        if (!Number.isFinite(capacity) || capacity < 1) {
          setLoading(false);
          return { error: 'Capacity must be a positive number.' };
        }
        payload.capacity = capacity;
      }

      const { error: updateError } = await supabase.from('rooms').update(payload).eq('id', id);
      if (updateError) throw updateError;

      await fetchAllRooms();
      return { error: null };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to update room right now.');
      setError(message);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, [fetchAllRooms]);

  const deleteRoom = useCallback(async (id) => {
    setLoading(true);
    setError('');

    try {
      if (!sanitizeUUID(id)) {
        setLoading(false);
        return { error: 'Invalid room selected.' };
      }

      const { error: deleteError } = await supabase.from('rooms').delete().eq('id', id);
      if (deleteError) throw deleteError;

      await fetchAllRooms();
      return { error: null };
    } catch (caughtError) {
      const message = toFriendlyError(caughtError?.message, 'Unable to delete room right now.');
      setError(message);
      return { error: message };
    } finally {
      setLoading(false);
    }
  }, [fetchAllRooms]);

  return {
    rooms,
    floors,
    loading,
    error,
    fetchAllRooms,
    fetchRoomsByFloor,
    createRoom,
    updateRoom,
    deleteRoom,
  };
}
