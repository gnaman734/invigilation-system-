import { useCallback, useState } from 'react';
import { supabase } from '../supabase';
import { sanitizeText, sanitizeUUID } from '../utils/sanitize';

function toFriendlyError(message, fallback) {
  if (!message) return fallback;
  if (/violates row-level security/i.test(message)) return 'You do not have permission to perform this action.';
  if (/network|failed to fetch|timeout/i.test(message)) return 'Network issue detected. Please try again.';
  return fallback;
}

export function useFloors() {
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAllFloors = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('floors')
        .select('id, floor_number, floor_label, building, created_at, rooms(count)')
        .order('floor_number', { ascending: true });

      if (fetchError) throw fetchError;

      const mapped = (data ?? []).map((floor) => ({
        ...floor,
        room_count: Number(
          Array.isArray(floor.rooms)
            ? floor.rooms?.[0]?.count ?? 0
            : floor.rooms?.count ?? 0
        ),
      }));

      setFloors(mapped);
      return { error: null, data: mapped };
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
      const floorNumber = Number.parseInt(String(data.floor_number ?? '').trim(), 10);
      const payload = {
        floor_number: floorNumber,
        floor_label: sanitizeText(data.floor_label),
        building: sanitizeText(data.building),
      };

      if (!Number.isFinite(payload.floor_number) || !payload.floor_label) {
        setLoading(false);
        return { error: 'Floor number and floor label are required.' };
      }

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
      if (!sanitizeUUID(id)) {
        setLoading(false);
        return { error: 'Invalid floor selected.' };
      }

      const payload = { ...data };
      if (Object.prototype.hasOwnProperty.call(payload, 'floor_number')) {
        const floorNumber = Number.parseInt(String(payload.floor_number ?? '').trim(), 10);
        if (!Number.isFinite(floorNumber)) {
          setLoading(false);
          return { error: 'Floor number must be valid.' };
        }
        payload.floor_number = floorNumber;
      }

      if (Object.prototype.hasOwnProperty.call(payload, 'floor_label')) {
        payload.floor_label = sanitizeText(payload.floor_label);
      }

      if (Object.prototype.hasOwnProperty.call(payload, 'building')) {
        payload.building = sanitizeText(payload.building);
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
      if (!sanitizeUUID(id)) {
        setLoading(false);
        return { error: 'Invalid floor selected.' };
      }

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

  return {
    floors,
    loading,
    error,
    fetchAllFloors,
    createFloor,
    updateFloor,
    deleteFloor,
  };
}
