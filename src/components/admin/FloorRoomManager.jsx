import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useExamManagement } from '../../lib/hooks/useExamManagement';
import { useToast } from '../shared/Toast';

const DEPARTMENTS = ['Computer Science', 'Mathematics', 'Physics', 'Electronics', 'Mechanical', 'Other'];

export default function FloorRoomManager() {
  const examMgmt = useExamManagement();
  const { addToast } = useToast();
  const [selectedFloor, setSelectedFloor] = useState(null);

  const [showFloorForm, setShowFloorForm] = useState(false);
  const [floorForm, setFloorForm] = useState({ floor_number: '', floor_label: '', building: '' });

  const [showRoomForm, setShowRoomForm] = useState(false);
  const [roomForm, setRoomForm] = useState({ room_number: '', floor_id: '', department: 'Computer Science', capacity: 30, is_active: true, building: '' });

  useEffect(() => {
    examMgmt.fetchAllFloors();
    examMgmt.fetchRoomsByFloor('all');
  }, []);

  const filteredRooms = useMemo(() => {
    if (!selectedFloor) return examMgmt.rooms ?? [];
    return (examMgmt.rooms ?? []).filter((room) => room.floor_id === selectedFloor.id);
  }, [examMgmt.rooms, selectedFloor]);

  const roomCountByFloor = useMemo(() => {
    const map = {};
    (examMgmt.rooms ?? []).forEach((room) => {
      map[room.floor_id] = (map[room.floor_id] ?? 0) + 1;
    });
    return map;
  }, [examMgmt.rooms]);

  const saveFloor = async () => {
    const parsed = Number.parseInt(String(floorForm.floor_number ?? '').trim(), 10);
    if (!Number.isFinite(parsed)) {
      addToast({ type: 'error', message: 'Please enter a valid floor number.' });
      return;
    }

    const result = await examMgmt.createFloor(floorForm);
    if (result.error) {
      addToast({ type: 'error', message: result.error });
      return;
    }
    addToast({ type: 'success', message: 'Floor created' });
    setFloorForm({ floor_number: '', floor_label: '', building: '' });
    setShowFloorForm(false);
  };

  const saveRoom = async () => {
    const payload = {
      ...roomForm,
      floor_id: roomForm.floor_id || selectedFloor?.id || null,
      building: selectedFloor?.building || roomForm.building,
    };
    const result = await examMgmt.createRoom(payload);
    if (result.error) {
      addToast({ type: 'error', message: result.error });
      return;
    }
    addToast({ type: 'success', message: 'Room created' });
    setRoomForm({ room_number: '', floor_id: '', department: 'Computer Science', capacity: 30, is_active: true, building: '' });
    setShowRoomForm(false);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/8 bg-[#111118] p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-white/70">Floors</p>
          <button type="button" className="btn-press inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black" onClick={() => setShowFloorForm((v) => !v)}>
            <Plus className="h-3.5 w-3.5" /> Add Floor
          </button>
        </div>

        {showFloorForm ? (
          <div className="mb-3 grid gap-2 rounded-xl border border-white/8 bg-white/4 p-3">
            <input type="number" min="0" className="app-input" placeholder="Floor number" value={floorForm.floor_number} onChange={(e) => setFloorForm((p) => ({ ...p, floor_number: e.target.value }))} />
            <input className="app-input" placeholder="Floor label" value={floorForm.floor_label} onChange={(e) => setFloorForm((p) => ({ ...p, floor_label: e.target.value }))} />
            <input className="app-input" placeholder="Building" value={floorForm.building} onChange={(e) => setFloorForm((p) => ({ ...p, building: e.target.value }))} />
            <div className="flex gap-2">
              <button type="button" className="app-btn-primary text-xs" onClick={saveFloor}>Save</button>
              <button type="button" className="app-btn-ghost text-xs" onClick={() => setShowFloorForm(false)}>Cancel</button>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          {(examMgmt.floors ?? []).map((floor) => (
            <button key={floor.id} type="button" className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left ${selectedFloor?.id === floor.id ? 'border-amber-500/30 bg-amber-500/8' : 'border-white/8 bg-white/3'}`} onClick={() => setSelectedFloor(floor)}>
              <span>
                <p className="text-sm text-white/75">{floor.floor_label || `Floor ${floor.floor_number}`}</p>
                <p className="text-xs text-white/35">{floor.building || '--'}</p>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/35">{roomCountByFloor[floor.id] ?? 0}</span>
                <Pencil className="h-3.5 w-3.5 text-white/35" />
                <Trash2 className="h-3.5 w-3.5 text-white/35" onClick={async (event) => {
                  event.stopPropagation();
                  const result = await examMgmt.deleteFloor(floor.id);
                  if (result.error) addToast({ type: 'error', message: result.error });
                  else addToast({ type: 'success', message: 'Floor deleted' });
                }} />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/8 bg-[#111118] p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-white/70">Rooms {selectedFloor ? `(filtered)` : ''}</p>
          <button type="button" className="btn-press inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black" onClick={() => setShowRoomForm((v) => !v)}>
            <Plus className="h-3.5 w-3.5" /> Add Room
          </button>
        </div>

        {showRoomForm ? (
          <div className="mb-3 grid gap-2 rounded-xl border border-white/8 bg-white/4 p-3">
            <input className="app-input" placeholder="Room number" value={roomForm.room_number} onChange={(e) => setRoomForm((p) => ({ ...p, room_number: e.target.value }))} />
            <select className="app-input" value={roomForm.floor_id || selectedFloor?.id || ''} onChange={(e) => setRoomForm((p) => ({ ...p, floor_id: e.target.value }))}>
              <option value="">Select floor</option>
              {(examMgmt.floors ?? []).map((floor) => (
                <option key={floor.id} value={floor.id}>{floor.floor_label || `Floor ${floor.floor_number}`}</option>
              ))}
            </select>
            <select className="app-input" value={roomForm.department} onChange={(e) => setRoomForm((p) => ({ ...p, department: e.target.value }))}>
              {DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
            </select>
            <input type="number" className="app-input" placeholder="Capacity" value={roomForm.capacity} onChange={(e) => setRoomForm((p) => ({ ...p, capacity: Number(e.target.value || 30) }))} />
            <label className="flex items-center gap-2 text-xs text-white/55"><input type="checkbox" checked={roomForm.is_active} onChange={(e) => setRoomForm((p) => ({ ...p, is_active: e.target.checked }))} /> Is Active</label>
            <div className="flex gap-2">
              <button type="button" className="app-btn-primary text-xs" onClick={saveRoom}>Save</button>
              <button type="button" className="app-btn-ghost text-xs" onClick={() => setShowRoomForm(false)}>Cancel</button>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          {filteredRooms.map((room) => (
            <article key={room.id} className="rounded-xl border border-white/8 bg-white/3 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/80">{room.room_number}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs ${room.is_active ? 'bg-green-500/10 text-green-400' : 'bg-white/8 text-white/45'}`}>{room.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <p className="mt-1 text-xs text-white/40">{room.floors?.floor_label || room.building || '--'} • {room.department || '--'} • Capacity {room.capacity ?? 30}</p>
              <div className="mt-2 flex items-center gap-2">
                <button type="button" className="app-btn-ghost px-3 py-1 text-xs" onClick={async () => {
                  const result = await examMgmt.updateRoom(room.id, { is_active: !room.is_active });
                  if (result.error) addToast({ type: 'error', message: result.error });
                  else addToast({ type: 'success', message: 'Room updated' });
                }}>
                  <Pencil className="h-3.5 w-3.5" />Edit
                </button>
                <button type="button" className="app-btn-danger px-3 py-1 text-xs" onClick={async () => {
                  const result = await examMgmt.deleteRoom(room.id);
                  if (result.error) addToast({ type: 'error', message: result.error });
                  else addToast({ type: 'success', message: 'Room deleted' });
                }}>
                  <Trash2 className="h-3.5 w-3.5" />Delete
                </button>
              </div>
            </article>
          ))}
          {filteredRooms.length === 0 ? <p className="text-center text-xs text-white/30">No rooms found</p> : null}
        </div>
      </section>
    </div>
  );
}
