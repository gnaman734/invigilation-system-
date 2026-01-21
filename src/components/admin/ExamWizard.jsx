import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, Check, CheckCircle2, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { useExamManagement } from '../../lib/hooks/useExamManagement';
import { useInstructors } from '../../lib/hooks/useInstructors';
import { useToast } from '../shared/Toast';
import { useDuties } from '../../lib/hooks/useDuties';
import { distributeInstructors } from '../../lib/utils/distributeInstructors';

const STEPS = ['Exam Details', 'Select Rooms', 'Assign Instructors', 'Review'];
const DEPARTMENTS = ['Computer Science', 'Mathematics', 'Physics', 'Electronics', 'Mechanical', 'Other'];

function toMinutes(time) {
  const [h, m] = String(time || '').split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function durationText(start, end) {
  const diff = Math.max(0, toMinutes(end) - toMinutes(start));
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (!diff) return 'Duration: --';
  if (!mins) return `Duration: ${hours} hours`;
  return `Duration: ${hours}h ${mins}m`;
}

function normalizeMax(value) {
  const parsed = Number.parseInt(String(value ?? 1), 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(20, Math.max(1, parsed));
}

function workloadDot(totalDuties) {
  const value = Number(totalDuties ?? 0);
  if (value >= 8) return 'bg-red-400';
  if (value >= 5) return 'bg-amber-400';
  return 'bg-green-400';
}

export default function ExamWizard({ open, onOpenChange, onCreated }) {
  const { addToast } = useToast();
  const examMgmt = useExamManagement();
  const { fetchAllInstructors } = useInstructors();
  const { bulkCreateDuties } = useDuties();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [details, setDetails] = useState({
    subject: '',
    department: 'Computer Science',
    exam_date: '',
    start_time: '09:00',
    end_time: '12:00',
    notes: '',
    expected_students: '',
    slots: [{ start: '09:00', end: '12:00' }],
  });

  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [maxInstructorsByRoom, setMaxInstructorsByRoom] = useState({});
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [searchByRoom, setSearchByRoom] = useState({});
  const [wizardState, setWizardState] = useState({ assignment: {}, unassignedPool: [], allInstructors: [] });
  const [swapState, setSwapState] = useState({ open: false, instructorId: null, instructorName: '', fromRoomId: null });

  useEffect(() => {
    if (!open) return;
    examMgmt.fetchAllFloors();
    examMgmt.fetchRoomsByFloor('all');
  }, [open]);

  const selectedRooms = useMemo(() => {
    return (examMgmt.rooms ?? [])
      .filter((room) => selectedRoomIds.includes(room.id))
      .map((room) => ({
        ...room,
        floor_label: room?.floors?.floor_label || room.building || '--',
        max_instructors: normalizeMax(maxInstructorsByRoom[room.id] ?? 1),
      }));
  }, [examMgmt.rooms, selectedRoomIds, maxInstructorsByRoom]);

  const visibleRooms = useMemo(() => {
    let rows = examMgmt.rooms ?? [];
    if (selectedFloor !== 'all') rows = rows.filter((room) => room.floor_id === selectedFloor);
    return rows;
  }, [examMgmt.rooms, selectedFloor]);

  const totalAssigned = useMemo(() => Object.values(wizardState.assignment).reduce((sum, arr) => sum + (arr?.length ?? 0), 0), [wizardState.assignment]);
  const averagePerRoom = useMemo(() => (selectedRooms.length ? (totalAssigned / selectedRooms.length).toFixed(1) : '0.0'), [totalAssigned, selectedRooms.length]);
  const distributionQuality = useMemo(() => {
    const counts = selectedRooms.map((room) => wizardState.assignment?.[room.id]?.length ?? 0);
    if (!counts.length) return 'Good';
    const diff = Math.max(...counts) - Math.min(...counts);
    if (diff <= 1) return 'Good';
    if (diff === 2) return 'Fair';
    return 'Poor';
  }, [selectedRooms, wizardState.assignment]);

  const instructorsById = useMemo(() => (wizardState.allInstructors ?? []).reduce((acc, row) => ({ ...acc, [row.instructor_id]: row }), {}), [wizardState.allInstructors]);

  const recomputeUnassigned = (assignment, allRows) => {
    const assignedIds = new Set(Object.values(assignment).flat());
    return (allRows ?? []).filter((row) => !assignedIds.has(row.instructor_id));
  };

  const runDistribution = (allRows) => {
    const result = distributeInstructors(allRows, selectedRooms);
    const assignment = {};
    selectedRooms.forEach((room) => {
      assignment[room.id] = (result.assigned?.[room.id]?.instructors ?? []).map((item) => item.instructor_id);
    });
    setWizardState({ assignment, unassignedPool: result.unassigned, allInstructors: allRows });
  };

  useEffect(() => {
    if (!open || step !== 3 || !selectedRooms.length) return;
    let cancelled = false;
    const load = async () => {
      const response = await fetchAllInstructors({ force: true });
      if (cancelled) return;
      const rows = [...(response?.data ?? [])].sort((a, b) => Number(a.total_duties ?? 0) - Number(b.total_duties ?? 0));
      runDistribution(rows);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, step, selectedRooms.map((r) => `${r.id}:${r.max_instructors}`).join('|')]);

  const resetWizard = () => {
    setStep(1);
    setSaving(false);
    setError('');
    setDetails({
      subject: '',
      department: 'Computer Science',
      exam_date: '',
      start_time: '09:00',
      end_time: '12:00',
      notes: '',
      expected_students: '',
      slots: [{ start: '09:00', end: '12:00' }],
    });
    setSelectedRoomIds([]);
    setMaxInstructorsByRoom({});
    setSearchByRoom({});
    setSelectedFloor('all');
    setWizardState({ assignment: {}, unassignedPool: [], allInstructors: [] });
    setSwapState({ open: false, instructorId: null, instructorName: '', fromRoomId: null });
  };

  const close = () => {
    if (saving) return;
    onOpenChange(false);
    resetWizard();
  };

  const validateStep = () => {
    if (step === 1) return details.subject.trim() && details.exam_date && details.slots.length > 0;
    if (step === 2) return selectedRoomIds.length > 0;
    if (step === 3) return selectedRoomIds.length > 0;
    return true;
  };

  const next = () => {
    setError('');
    if (!validateStep()) {
      setError(step === 1 ? 'Subject, exam date, and at least one slot are required.' : step === 2 ? 'Select at least one room.' : 'Select at least one room.');
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const back = () => {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  };

  const toggleRoom = (roomId) => {
    setSelectedRoomIds((previous) => (previous.includes(roomId) ? previous.filter((id) => id !== roomId) : [...previous, roomId]));
    setMaxInstructorsByRoom((previous) => ({ ...previous, [roomId]: normalizeMax(previous[roomId] ?? 1) }));
  };

  const setRoomMax = (roomId, nextValue) => {
    setMaxInstructorsByRoom((previous) => ({ ...previous, [roomId]: normalizeMax(nextValue) }));
  };

  const addToRoom = (roomId, instructorId) => {
    const room = selectedRooms.find((r) => r.id === roomId);
    if (!room) return;

    const next = { ...wizardState.assignment };
    Object.keys(next).forEach((id) => {
      next[id] = (next[id] ?? []).filter((value) => value !== instructorId);
    });

    const roomList = next[roomId] ?? [];
    if (roomList.length >= normalizeMax(room.max_instructors)) {
      addToast({ type: 'warning', message: 'Room is full. Increase max instructors or remove one first.' });
      return;
    }

    next[roomId] = [...roomList, instructorId];
    setWizardState((previous) => ({ ...previous, assignment: next, unassignedPool: recomputeUnassigned(next, previous.allInstructors) }));
  };

  const removeFromRoom = (roomId, instructorId) => {
    const next = { ...wizardState.assignment, [roomId]: (wizardState.assignment?.[roomId] ?? []).filter((id) => id !== instructorId) };
    setWizardState((previous) => ({ ...previous, assignment: next, unassignedPool: recomputeUnassigned(next, previous.allInstructors) }));
  };

  const moveToRoom = (toRoomId, instructorId) => {
    addToRoom(toRoomId, instructorId);
    setSwapState({ open: false, instructorId: null, instructorName: '', fromRoomId: null });
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const firstSlot = details.slots[0];
      const dayOfWeek = details.exam_date ? format(new Date(`${details.exam_date}T00:00:00`), 'EEEE') : '';
      const examCreate = await examMgmt.createExam({
        subject: details.subject,
        department: details.department,
        exam_date: details.exam_date,
        start_time: firstSlot.start,
        end_time: firstSlot.end,
        shift_label: details.slots.length > 1 ? 'Custom' : 'Morning',
        shift_start: firstSlot.start,
        shift_end: firstSlot.end,
        day_of_week: dayOfWeek,
        status: 'upcoming',
      });

      if (examCreate.error || !examCreate.data?.id) throw new Error(examCreate.error || 'Failed to create exam');
      const examId = examCreate.data.id;
      const examRooms = [];

      for (const roomId of selectedRoomIds) {
        const assignResult = await examMgmt.assignRoomsToExam(examId, [roomId]);
        if (assignResult.error) throw new Error(assignResult.error);
        if ((assignResult.data ?? []).length > 0) examRooms.push(assignResult.data[0]);
      }

      for (const examRoom of examRooms) {
        const selected = wizardState.assignment?.[examRoom.room_id] ?? [];
        const instructorAssign = await examMgmt.assignInstructorsToExamRoom(examRoom.id, selected);
        if (instructorAssign.error) throw new Error(instructorAssign.error);

        const inserted = instructorAssign.data ?? [];
        if (inserted.length > 0) {
          const dutyPayload = inserted.map((item) => ({
            exam_id: examId,
            room_id: examRoom.room_id,
            instructor_id: item.instructor_id,
            exam_room_instructor_id: item.id,
            reporting_time: `${firstSlot.start}:00`,
            status: 'pending',
          }));
          const bulkResult = await bulkCreateDuties(dutyPayload);
          if (bulkResult?.error) throw new Error(bulkResult.error);
        }
      }

      addToast({ type: 'success', message: `Exam created. ${totalAssigned} duties assigned.` });
      if (typeof onCreated === 'function') onCreated();
      close();
    } catch (caughtError) {
      setError(caughtError?.message || 'Failed to create exam. Try again.');
      if (caughtError?.message) addToast({ type: 'error', message: caughtError.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Exam + Duties</DialogTitle>
          </DialogHeader>

          <div className="mb-4 grid grid-cols-4 gap-2">
            {STEPS.map((label, index) => {
              const number = index + 1;
              const isDone = number < step;
              const isCurrent = number === step;
              return (
                <div key={label} className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${isDone ? 'bg-amber-500 text-black' : isCurrent ? 'bg-[#16161F] text-white' : 'border border-white/15 text-white/40'}`}>
                    {isDone ? <Check className="h-3.5 w-3.5" /> : number}
                  </span>
                  <span className="hidden text-[11px] text-white/45 sm:inline">{label}</span>
                </div>
              );
            })}
          </div>

          {step === 1 ? (
            <div className="space-y-3 px-1">
              <h3 className="text-sm font-semibold text-white/80">Create New Exam</h3>
              <p className="text-xs text-white/40">Fill in the exam information</p>
              <input className="app-input" placeholder="e.g. Data Structures" value={details.subject} onChange={(e) => setDetails((p) => ({ ...p, subject: e.target.value }))} />
              <select className="app-input" value={details.department} onChange={(e) => setDetails((p) => ({ ...p, department: e.target.value }))}>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <input className="app-input" type="date" value={details.exam_date} onChange={(e) => setDetails((p) => ({ ...p, exam_date: e.target.value }))} />
              {details.exam_date ? <p className="text-xs text-amber-400">This falls on a {format(new Date(`${details.exam_date}T00:00:00`), 'EEEE')}</p> : null}
              <div className="grid grid-cols-2 gap-2">
                <input className="app-input" type="time" value={details.start_time} onChange={(e) => setDetails((p) => ({ ...p, start_time: e.target.value }))} />
                <input className="app-input" type="time" value={details.end_time} onChange={(e) => setDetails((p) => ({ ...p, end_time: e.target.value }))} />
              </div>
              <p className="text-xs text-white/40">{durationText(details.start_time, details.end_time)}</p>
              <button type="button" className="text-xs text-amber-400" onClick={() => setDetails((p) => ({ ...p, slots: [...p.slots, { start: p.start_time, end: p.end_time }] }))}>+ Add another slot</button>
              <div className="flex flex-wrap gap-2">
                {details.slots.map((slot, idx) => (
                  <span key={`${slot.start}-${slot.end}-${idx}`} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/55">
                    {slot.start} - {slot.end}
                    <button type="button" onClick={() => setDetails((p) => ({ ...p, slots: p.slots.filter((_, i) => i !== idx) }))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
              <input className="app-input" type="number" placeholder="Total students expected" value={details.expected_students} onChange={(e) => setDetails((p) => ({ ...p, expected_students: e.target.value }))} />
              <textarea className="app-input min-h-24" placeholder="Any special instructions..." value={details.notes} onChange={(e) => setDetails((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4 sm:grid-cols-[40%,60%]">
              <div>
                <p className="mb-2 text-sm text-white/75">Available Rooms</p>
                <div className="mb-2 flex gap-1 overflow-x-auto">
                  <button type="button" onClick={() => setSelectedFloor('all')} className={`rounded-lg px-2 py-1 text-xs ${selectedFloor === 'all' ? 'bg-amber-500/10 text-amber-400' : 'text-white/40'}`}>All Floors</button>
                  {(examMgmt.floors ?? []).map((f) => (
                    <button key={f.id} type="button" onClick={() => setSelectedFloor(f.id)} className={`rounded-lg px-2 py-1 text-xs ${selectedFloor === f.id ? 'bg-amber-500/10 text-amber-400' : 'text-white/40'}`}>{f.floor_label || `Floor ${f.floor_number}`}</button>
                  ))}
                </div>
                <button type="button" className="mb-2 text-xs text-amber-400" onClick={() => setSelectedRoomIds(selectedRoomIds.length === visibleRooms.length ? [] : visibleRooms.map((r) => r.id))}>{selectedRoomIds.length === visibleRooms.length ? 'Deselect All' : 'Select All Rooms'}</button>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {visibleRooms.map((room) => {
                    const checked = selectedRoomIds.includes(room.id);
                    return (
                      <button key={room.id} type="button" className={`rounded-xl border p-3 text-left transition-all ${checked ? 'border-amber-500/40 bg-amber-500/8' : 'border-white/8 bg-[#16161F] hover:border-white/15'}`} onClick={() => toggleRoom(room.id)}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm text-white/80">{room.room_number}</p>
                            <p className="text-xs text-white/40">{room.floors?.floor_label || room.building || '--'}</p>
                            <p className="text-xs text-white/40">Capacity: {room.capacity ?? 30}</p>
                          </div>
                          <Checkbox checked={checked} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm text-white/75">Selected Rooms <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/40">{selectedRooms.length}</span></p>
                {selectedRooms.length === 0 ? (
                  <div className="rounded-xl border border-white/8 bg-white/4 p-4 text-center text-xs text-white/35">No rooms selected yet</div>
                ) : (
                  selectedRooms.map((room) => {
                    const roomMax = normalizeMax(maxInstructorsByRoom[room.id] ?? 1);
                    return (
                      <div key={room.id} className="mb-2 rounded-xl border border-white/8 bg-white/4 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm text-white/75">{room.room_number}</p>
                            <p className="text-xs text-white/40">{room.floor_label}</p>
                          </div>
                          <button type="button" onClick={() => toggleRoom(room.id)}><X className="h-4 w-4 text-white/40" /></button>
                        </div>
                        <div className="mt-3 rounded-xl border border-white/8 bg-[#111118] p-3">
                          <p className="text-xs text-white/60">Instructor slots:</p>
                          <div className="mt-2 flex items-center gap-2">
                            <button type="button" onClick={() => setRoomMax(room.id, roomMax - 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-white/80"><Minus className="h-3.5 w-3.5" /></button>
                            <input type="number" min={1} max={20} className="w-20 rounded-lg border border-white/10 bg-[#16161F] px-2 py-1.5 text-center text-sm text-white/80" value={roomMax} onChange={(e) => setRoomMax(room.id, e.target.value)} />
                            <button type="button" onClick={() => setRoomMax(room.id, roomMax + 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/50 hover:text-white/80"><Plus className="h-3.5 w-3.5" /></button>
                          </div>
                          <p className="mt-2 text-xs text-white/25">Distribution will fill this many instructors in this room</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-white/8 bg-[#111118] p-5">
                <div>
                  <h3 className="text-sm font-semibold text-white/85">Instructor Distribution</h3>
                  <p className="text-xs text-white/45">Instructors auto-distributed by workload. Adjust if needed.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5 text-xs text-white/50">{wizardState.allInstructors.length} instructors</span>
                    <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5 text-xs text-white/50">{selectedRooms.length} rooms</span>
                    <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5 text-xs text-white/50">{averagePerRoom} per room avg</span>
                    <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5 text-xs text-white/50">{wizardState.unassignedPool.length} unassigned</span>
                    <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5 text-xs text-white/50">Balance: {distributionQuality}</span>
                  </div>
                </div>
                <button type="button" onClick={() => runDistribution([...wizardState.allInstructors])} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/40 hover:text-white/70"><RotateCcw className="h-3.5 w-3.5" />Re-distribute</button>
              </div>

              {selectedRooms.map((room) => {
                const assignedIds = wizardState.assignment?.[room.id] ?? [];
                const assignedRows = assignedIds.map((id) => instructorsById[id]).filter(Boolean);
                const max = normalizeMax(room.max_instructors);
                const filled = assignedRows.length;
                const openSlots = Math.max(0, max - filled);
                const isFull = filled === max;
                const isOver = filled > max;
                const pct = max ? Math.min(100, Math.round((filled / max) * 100)) : 0;
                const barColor = isOver ? 'bg-red-400' : isFull ? 'bg-amber-400' : 'bg-green-400';
                const query = String(searchByRoom[room.id] ?? '').trim().toLowerCase();
                const poolRows = wizardState.unassignedPool.filter((inst) => !query || String(inst.name ?? '').toLowerCase().includes(query));
                return (
                  <section key={room.id} className="mb-4 rounded-2xl border border-white/8 bg-[#111118] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-sm font-semibold text-white/85">{room.room_number}</p><p className="text-xs text-white/40">{room.floor_label}</p></div>
                      <div className="text-right">
                        <p className="text-xs text-white/50">{filled} / {max} slots filled</p>
                        {isFull && !isOver ? <span className="mt-1 inline-flex rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">Full</span> : null}
                        {isOver ? <span className="mt-1 inline-flex rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">Over capacity</span> : null}
                        {!isFull && !isOver ? <span className="mt-1 inline-flex rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">{openSlots} slots open</span> : null}
                      </div>
                    </div>
                    <div className="mt-3 h-1 w-full rounded-full bg-white/5"><div className={`h-1 rounded-full ${barColor}`} style={{ width: `${pct}%` }} /></div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                        <p className="mb-2 text-xs text-white/55">Assigned to this room</p>
                        {assignedRows.length === 0 ? <p className="text-xs text-white/30">No instructors assigned</p> : (
                          <div className="space-y-1.5">
                            {assignedRows.map((inst) => (
                              <div key={inst.instructor_id} className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10 text-xs text-amber-400">{String(inst.name || 'I').slice(0, 2).toUpperCase()}</span>
                                <div className="min-w-0 flex-1"><p className="truncate text-sm text-white/80">{inst.name}</p></div>
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/50"><span className={`h-1.5 w-1.5 rounded-full ${workloadDot(inst.total_duties)}`} />{inst.total_duties ?? 0} duties</span>
                                <button type="button" onClick={() => setSwapState({ open: true, instructorId: inst.instructor_id, instructorName: inst.name, fromRoomId: room.id })} className="text-white/20 hover:text-amber-400"><ArrowLeftRight className="h-3.5 w-3.5" /></button>
                                <button type="button" onClick={() => removeFromRoom(room.id, inst.instructor_id)} className="text-white/20 hover:text-red-400"><X className="h-3.5 w-3.5" /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                        <p className="mb-2 text-xs text-white/55">Add from pool</p>
                        <input className="app-input mb-2" placeholder="Search unassigned..." value={searchByRoom[room.id] ?? ''} onChange={(e) => setSearchByRoom((p) => ({ ...p, [room.id]: e.target.value }))} />
                        <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
                          {poolRows.map((inst) => (
                            <div key={inst.instructor_id} className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10 text-xs text-amber-400">{String(inst.name || 'I').slice(0, 2).toUpperCase()}</span>
                              <div className="min-w-0 flex-1"><p className="truncate text-sm text-white/80">{inst.name}</p></div>
                              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/50"><span className={`h-1.5 w-1.5 rounded-full ${workloadDot(inst.total_duties)}`} />{inst.total_duties ?? 0} duties</span>
                              <button type="button" onClick={() => addToRoom(room.id, inst.instructor_id)} className="text-white/20 hover:text-amber-400"><Plus className="h-3.5 w-3.5" /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}

              <section className="rounded-2xl border border-white/8 bg-[#111118] p-4">
                <div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold text-white/85">Unassigned Instructors</p><span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">{wizardState.unassignedPool.length}</span></div>
                {wizardState.unassignedPool.length > 0 ? (
                  <>
                    <div className="mb-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-300">{wizardState.unassignedPool.length} instructors are not assigned to any room. They will not receive a duty for this exam.</div>
                    <div className="flex flex-wrap gap-2">
                      {wizardState.unassignedPool.map((inst) => (
                        <span key={inst.instructor_id} className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-xs text-white/60"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/10 text-[10px] text-amber-400">{String(inst.name || 'I').slice(0, 2).toUpperCase()}</span>{inst.name}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-xl border border-green-400/20 bg-green-500/10 px-3 py-2 text-xs text-green-300"><CheckCircle2 className="h-4 w-4 text-green-400" />All instructors assigned</div>
                )}
              </section>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/8 bg-white/4 p-4">
                <p className="text-base text-white/85">{details.subject}</p>
                <p className="text-xs text-white/40">{details.department}</p>
                <p className="text-xs text-white/40">{details.exam_date || '--'} {details.exam_date ? `(${format(new Date(`${details.exam_date}T00:00:00`), 'EEEE')})` : ''}</p>
                <div className="mt-2 flex flex-wrap gap-1">{details.slots.map((slot, idx) => <span key={`${slot.start}-${idx}`} className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/45">{slot.start} - {slot.end}</span>)}</div>
                <p className="mt-2 text-xs text-white/40">Total rooms: {selectedRooms.length}</p>
                <p className="text-xs text-white/40">Total instructors assigned: {totalAssigned}</p>
                <p className="text-xs text-white/40">Unassigned instructors: {wizardState.unassignedPool.length}</p>
              </div>
              {selectedRooms.map((room) => {
                const assignedIds = wizardState.assignment?.[room.id] ?? [];
                const assignedRows = assignedIds.map((id) => instructorsById[id]).filter(Boolean);
                const max = normalizeMax(room.max_instructors);
                return (
                  <div key={room.id} className="rounded-xl border border-white/8 bg-white/3 p-3">
                    <p className="text-sm text-white/75">{room.room_number} — {room.floor_label}</p>
                    {assignedRows.length === 0 ? <p className="mt-2 text-xs text-white/35">No instructors</p> : (
                      <div className="mt-2 space-y-1">{assignedRows.map((inst) => <div key={inst.instructor_id} className="flex items-center justify-between text-xs text-white/45"><span>{inst.name}</span><span>{inst.total_duties ?? 0} duties</span></div>)}</div>
                    )}
                    {assignedRows.length === 0 ? <p className="mt-2 text-xs text-amber-400">Room {room.room_number} has no instructor</p> : null}
                    {assignedRows.length > max ? <p className="mt-2 text-xs text-amber-400">Room {room.room_number} exceeds slot limit</p> : null}
                  </div>
                );
              })}
              {wizardState.unassignedPool.length > 0 ? <p className="text-xs text-white/45">{wizardState.unassignedPool.length} instructors not assigned</p> : null}
            </div>
          ) : null}

          {error ? <p className="text-xs text-red-400">{error}</p> : null}

          <DialogFooter>
            {step > 1 ? <button type="button" onClick={back} className="btn-press rounded-xl border border-white/10 px-4 py-2 text-xs text-white/45">Back</button> : <span />}
            {step < 4 ? (
              <button type="button" onClick={next} className="btn-press rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-black">{step === 1 ? 'Next: Select Rooms →' : step === 2 ? 'Next: Assign Instructors →' : 'Next: Review →'}</button>
            ) : (
              <button type="button" onClick={save} disabled={saving} className="btn-press inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-black disabled:opacity-70">{saving ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/40 border-t-black" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{saving ? 'Saving...' : 'Create Exam + Assign Duties'}</button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={swapState.open} onOpenChange={(value) => { if (!value) setSwapState({ open: false, instructorId: null, instructorName: '', fromRoomId: null }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Move {swapState.instructorName || 'Instructor'} to another room</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {selectedRooms.filter((room) => room.id !== swapState.fromRoomId).map((room) => {
              const roomCount = wizardState.assignment?.[room.id]?.length ?? 0;
              const available = normalizeMax(room.max_instructors) - roomCount;
              if (available <= 0) return null;
              return (
                <button key={room.id} type="button" className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:border-amber-400/40" onClick={() => moveToRoom(room.id, swapState.instructorId)}>
                  <span className="text-sm text-white/80">{room.room_number}</span>
                  <span className="text-xs text-white/45">{available} slots available</span>
                </button>
              );
            })}
            {!selectedRooms.some((room) => room.id !== swapState.fromRoomId && (normalizeMax(room.max_instructors) - (wizardState.assignment?.[room.id]?.length ?? 0) > 0)) ? <div className="rounded-xl border border-white/8 bg-white/4 p-3 text-xs text-white/45">No rooms with available slots. Increase max instructors.</div> : null}
          </div>
          <DialogFooter><button type="button" onClick={() => setSwapState({ open: false, instructorId: null, instructorName: '', fromRoomId: null })} className="btn-press rounded-xl border border-white/10 px-4 py-2 text-xs text-white/45">Cancel</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
