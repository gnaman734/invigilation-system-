import { useEffect, useMemo, useState } from 'react';
import { DoorOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRooms } from '../../lib/hooks/useRooms';
import { useToast } from '../shared/Toast';
import ConfirmDialog from '../shared/ConfirmDialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

const departments = ['Computer Science', 'Mathematics', 'Physics', 'Electronics', 'Mechanical', 'Other'];
const emptyRoomForm = { room_number: '', floor_id: '', department: 'Computer Science', capacity: 30, is_active: true, building: '' };

export default function RoomsManager() {
  const { addToast } = useToast();
  const { rooms, floors, loading, error, fetchAllRooms, createRoom, updateRoom, deleteRoom } = useRooms();
  const [activeFloor, setActiveFloor] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [form, setForm] = useState(emptyRoomForm);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAllRooms();
  }, [fetchAllRooms]);

  const visibleRooms = useMemo(() => {
    const source = rooms ?? [];
    return activeFloor === 'all' ? source : source.filter((room) => room.floor_id === activeFloor);
  }, [rooms, activeFloor]);

  const groupedByFloor = useMemo(() => {
    return visibleRooms.reduce((acc, room) => {
      const key = room.floor_id || 'unassigned';
      if (!acc[key]) acc[key] = [];
      acc[key].push(room);
      return acc;
    }, {});
  }, [visibleRooms]);

  const openCreate = () => {
    setEditingRoom(null);
    setFormError('');
    setForm({ ...emptyRoomForm, floor_id: activeFloor === 'all' ? '' : activeFloor });
    setDialogOpen(true);
  };

  const openEdit = (room) => {
    setEditingRoom(room);
    setFormError('');
    setForm({
      room_number: room.room_number ?? '',
      floor_id: room.floor_id ?? '',
      department: room.department || 'Computer Science',
      capacity: room.capacity ?? 30,
      is_active: room.is_active ?? true,
      building: room.building ?? '',
    });
    setDialogOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');
    setSubmitting(true);
    const result = editingRoom ? await updateRoom(editingRoom.id, form) : await createRoom(form);
    if (!result?.error) {
      setDialogOpen(false);
      setForm(emptyRoomForm);
      setEditingRoom(null);
      setFormError('');
      addToast({ type: 'success', message: editingRoom ? 'Room updated successfully.' : 'Room created successfully.' });
      setSubmitting(false);
      return;
    }

    setFormError(result.error || 'Unable to save room right now.');
    addToast({ type: 'error', message: result.error || 'Unable to save room right now.' });
    setSubmitting(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    setDeleting(true);
    const result = await deleteRoom(deleteTarget.id);
    if (!result?.error) {
      setDeleteTarget(null);
      setDeleteError('');
      addToast({ type: 'success', message: 'Room deleted successfully.' });
      setDeleting(false);
      return;
    }
    setDeleteError(result.error || 'Unable to delete room right now.');
    addToast({ type: 'error', message: result.error || 'Unable to delete room right now.' });
    setDeleting(false);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-white/8 bg-[#111118] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl text-white/85">Rooms</h2>
          <p className="text-xs text-white/35">Setup only. Rooms created here are not assigned to exams in this section.</p>
        </div>
        <button type="button" className="app-btn-primary" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Create Room
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-white/8 pb-2">
        <button
          type="button"
          onClick={() => setActiveFloor('all')}
          className={`px-3 py-1.5 text-xs ${activeFloor === 'all' ? 'border-b-2 border-amber-400 text-amber-400' : 'text-white/40 hover:text-white/70'}`}
        >
          All
        </button>
        {(floors ?? []).map((floor) => (
          <button
            key={floor.id}
            type="button"
            onClick={() => setActiveFloor(floor.id)}
            className={`px-3 py-1.5 text-xs ${activeFloor === floor.id ? 'border-b-2 border-amber-400 text-amber-400' : 'text-white/40 hover:text-white/70'}`}
          >
            {floor.floor_label || `Floor ${floor.floor_number}`}
          </button>
        ))}
      </div>

      {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div> : null}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="skeleton h-32" />
          <div className="skeleton h-32" />
          <div className="skeleton h-32" />
        </div>
      ) : null}

      {!loading && visibleRooms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/3 px-4 py-10 text-center">
          <DoorOpen className="mx-auto h-7 w-7 text-white/20" />
          <p className="mt-2 text-sm text-white/55">No rooms for this floor</p>
        </div>
      ) : null}

      {!loading && visibleRooms.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(groupedByFloor).map(([floorId, floorRooms]) => (
            <div key={floorId} className="space-y-2">
              <p className="text-xs text-white/35">
                {floorRooms[0]?.floors?.floor_label || floorRooms[0]?.building || 'Unassigned floor'}
              </p>
              {floorRooms.map((room) => (
                <article key={room.id} className="rounded-xl border border-white/8 bg-white/4 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-white/85">{room.room_number}</p>
                      <p className="text-xs text-white/35">{room.department || 'Department not set'} · Cap: {room.capacity ?? '--'}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${room.is_active ? 'bg-green-500/10 text-green-300' : 'bg-white/10 text-white/45'}`}>
                      {room.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button type="button" className="rounded-lg p-2 text-white/35 hover:bg-white/8 hover:text-white/70" onClick={() => openEdit(room)}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-white/35 hover:bg-red-500/10 hover:text-red-400"
                      onClick={() => {
                        setDeleteError('');
                        setDeleteTarget(room);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setFormError('');
            setEditingRoom(null);
            setForm(emptyRoomForm);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRoom ? 'Edit Room' : 'Create Room'}</DialogTitle>
          </DialogHeader>
          <form className="space-y-3 px-6 pb-2" onSubmit={submit}>
            <input className="app-input" placeholder="Room number" value={form.room_number} onChange={(event) => setForm((prev) => ({ ...prev, room_number: event.target.value }))} required />
            <select className="app-input" value={form.floor_id} onChange={(event) => setForm((prev) => ({ ...prev, floor_id: event.target.value }))} required>
              <option value="">Select floor</option>
              {(floors ?? []).map((floor) => (
                <option key={floor.id} value={floor.id}>{floor.floor_label || `Floor ${floor.floor_number}`}</option>
              ))}
            </select>
            <select className="app-input" value={form.department} onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value }))}>
              {departments.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
            <input className="app-input" type="number" min={1} value={form.capacity} onChange={(event) => setForm((prev) => ({ ...prev, capacity: event.target.value }))} />
            <label className="inline-flex items-center gap-2 text-xs text-white/55">
              <input type="checkbox" checked={Boolean(form.is_active)} onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))} />
              Active room
            </label>
            {formError ? <p className="text-xs text-red-400">{formError}</p> : null}
            <DialogFooter className="px-0 pb-0">
              <button type="button" className="app-btn-ghost" onClick={() => setDialogOpen(false)}>Cancel</button>
              <button type="submit" className="app-btn-primary" disabled={submitting || loading}>{submitting ? 'Saving...' : editingRoom ? 'Save' : 'Create'}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (deleting) return;
          setDeleteTarget(null);
          setDeleteError('');
        }}
        onConfirm={confirmDelete}
        message={deleting ? 'Deleting room...' : `Delete room ${deleteTarget?.room_number ?? ''}? This cannot be undone.${deleteError ? `\n\n${deleteError}` : ''}`}
      />
    </section>
  );
}
