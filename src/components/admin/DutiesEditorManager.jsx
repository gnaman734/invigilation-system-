import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ClipboardList, Trash2 } from 'lucide-react';
import { useDuties } from '../../lib/hooks/useDuties';
import { useExamsRooms } from '../../lib/hooks/useExamsRooms';
import { useInstructors } from '../../lib/hooks/useInstructors';
import { useToast } from '../shared/Toast';
import ConfirmDialog from '../shared/ConfirmDialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

const emptyEditForm = { reporting_time: '', room_id: '', instructor_id: '', status: 'pending' };

export default function DutiesEditorManager() {
  const { addToast } = useToast();
  const { allDuties, loading, error, fetchAllDuties, updateDuty, deleteDuty } = useDuties();
  const { rooms, fetchAllRooms } = useExamsRooms();
  const { instructors, fetchAllInstructors } = useInstructors();

  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editingDuty, setEditingDuty] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedDutyIds, setSelectedDutyIds] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    fetchAllDuties();
    fetchAllRooms();
    fetchAllInstructors({ force: true });
  }, [fetchAllDuties, fetchAllRooms, fetchAllInstructors]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (allDuties ?? []).filter((duty) => {
      const statusMatch = statusFilter === 'all' || duty.status === statusFilter;
      const haystack = `${duty.subject} ${duty.instructor_name} ${duty.room_number}`.toLowerCase();
      const searchMatch = !query || haystack.includes(query);
      return statusMatch && searchMatch;
    });
  }, [allDuties, search, statusFilter]);

  const openEdit = (duty) => {
    setEditingDuty(duty);
    setEditForm({
      reporting_time: duty.reporting_time?.slice(0, 5) ?? '',
      room_id: duty.room_id ?? '',
      instructor_id: duty.instructor_id ?? '',
      status: duty.status ?? 'pending',
    });
  };

  const closeEdit = () => {
    setEditingDuty(null);
    setEditForm(emptyEditForm);
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!editingDuty) return;

    setSavingEdit(true);

    const result = await updateDuty(editingDuty.duty_id, {
      reporting_time: `${editForm.reporting_time}:00`,
      room_id: editForm.room_id,
      instructor_id: editForm.instructor_id,
      status: editForm.status,
    });

    if (!result?.error) {
      addToast({ type: 'success', message: 'Duty updated successfully.' });
      closeEdit();
    } else {
      addToast({ type: 'error', message: result.error });
    }

    setSavingEdit(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteDuty(deleteTarget.duty_id);
    if (!result?.error) {
      setDeleteTarget(null);
      addToast({ type: result?.queued ? 'info' : 'success', message: result?.queued ? 'Offline: deletion queued.' : 'Duty deleted successfully.' });
      return;
    }

    addToast({ type: 'error', message: result.error ?? 'Unable to delete duty.' });
  };

  const toggleBulkSelection = (dutyId) => {
    setSelectedDutyIds((prev) => (prev.includes(dutyId) ? prev.filter((id) => id !== dutyId) : [...prev, dutyId]));
  };

  const bulkDelete = async () => {
    if (!selectedDutyIds.length) return;
    setBulkBusy(true);
    const results = await Promise.all(selectedDutyIds.map((dutyId) => deleteDuty(dutyId)));
    const failures = results.filter((result) => result?.error).length;
    addToast({
      type: failures ? 'warning' : 'success',
      message: failures ? `${selectedDutyIds.length - failures} deleted, ${failures} failed.` : `${selectedDutyIds.length} duties deleted successfully.`,
    });
    setSelectedDutyIds([]);
    setBulkBusy(false);
  };

  const bulkStatusUpdate = async (status) => {
    if (!selectedDutyIds.length) return;
    setBulkBusy(true);
    const results = await Promise.all(selectedDutyIds.map((dutyId) => updateDuty(dutyId, { status })));
    const failures = results.filter((result) => result?.error).length;
    addToast({
      type: failures ? 'warning' : 'success',
      message: failures ? `${selectedDutyIds.length - failures} updated, ${failures} failed.` : `${selectedDutyIds.length} duties marked ${status}.`,
    });
    setSelectedDutyIds([]);
    setBulkBusy(false);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-white/8 bg-[#111118] p-5">
      <div className="rounded-xl border border-white/10 bg-white/3 px-3 py-2 text-xs text-white/40">
        <AlertCircle className="mr-2 inline h-3.5 w-3.5" />
        To create new duties, use Create Exam + Duties from the Overview page.
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {['all', 'pending', 'on-time', 'late', 'cancelled'].map((status) => (
          <button key={status} type="button" className={`app-filter-chip ${statusFilter === status ? 'app-filter-chip-active' : ''}`} onClick={() => setStatusFilter(status)}>
            {status}
          </button>
        ))}
        <input className="app-input ml-auto w-64" placeholder="Search by subject, room, instructor" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>

      {selectedDutyIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-white/3 px-3 py-2 text-xs text-white/55">
          <span>{selectedDutyIds.length} selected</span>
          <button type="button" disabled={bulkBusy} className="app-btn-danger px-3 py-1 text-xs disabled:opacity-60" onClick={bulkDelete}>Delete all</button>
          <button type="button" disabled={bulkBusy} className="app-btn-ghost px-3 py-1 text-xs disabled:opacity-60" onClick={() => bulkStatusUpdate('pending')}>Mark pending</button>
          <button type="button" disabled={bulkBusy} className="app-btn-ghost px-3 py-1 text-xs disabled:opacity-60" onClick={() => bulkStatusUpdate('cancelled')}>Mark cancelled</button>
        </div>
      ) : null}

      {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div> : null}

      {loading ? (
        <div className="space-y-2">
          <div className="skeleton h-12" />
          <div className="skeleton h-12" />
          <div className="skeleton h-12" />
        </div>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/3 px-4 py-10 text-center">
          <ClipboardList className="mx-auto h-7 w-7 text-white/20" />
          <p className="mt-2 text-sm text-white/55">No duties found</p>
        </div>
      ) : null}

      {!loading && filtered.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="min-w-full text-sm">
            <thead className="border-b border-white/8 bg-white/3 text-xs uppercase tracking-wide text-white/35">
              <tr>
                <th className="px-4 py-3 text-left">Select</th>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-left">Instructor</th>
                <th className="px-4 py-3 text-left">Room</th>
                <th className="px-4 py-3 text-left">Reporting</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((duty) => (
                <tr key={duty.duty_id} className="border-b border-white/6 text-white/75">
                  <td className="px-4 py-3"><input type="checkbox" checked={selectedDutyIds.includes(duty.duty_id)} onChange={() => toggleBulkSelection(duty.duty_id)} /></td>
                  <td className="px-4 py-3">{duty.subject}</td>
                  <td className="px-4 py-3">{duty.instructor_name}</td>
                  <td className="px-4 py-3">{duty.room_number}</td>
                  <td className="px-4 py-3">{duty.reporting_time?.slice(0, 5) ?? '--'}</td>
                  <td className="px-4 py-3">{duty.status}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button type="button" className="app-btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(duty)}>Edit</button>
                      <button type="button" className="rounded-lg p-2 text-white/35 hover:bg-red-500/10 hover:text-red-400" onClick={() => setDeleteTarget(duty)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Dialog open={Boolean(editingDuty)} onOpenChange={(open) => (open ? null : closeEdit())}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Duty</DialogTitle>
          </DialogHeader>
          <form className="space-y-3 px-6 pb-2" onSubmit={saveEdit}>
            <input className="app-input" type="time" value={editForm.reporting_time} onChange={(event) => setEditForm((prev) => ({ ...prev, reporting_time: event.target.value }))} required />
            <select className="app-input" value={editForm.room_id} onChange={(event) => setEditForm((prev) => ({ ...prev, room_id: event.target.value }))}>
              {(rooms ?? []).map((room) => <option key={room.id} value={room.id}>{room.room_number}</option>)}
            </select>
            <select className="app-input" value={editForm.instructor_id} onChange={(event) => setEditForm((prev) => ({ ...prev, instructor_id: event.target.value }))}>
              {(instructors ?? []).map((instructor) => <option key={instructor.instructor_id} value={instructor.instructor_id}>{instructor.name}</option>)}
            </select>
            <select className="app-input" value={editForm.status} onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value }))}>
              {['pending', 'on-time', 'late', 'cancelled'].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <DialogFooter className="px-0 pb-0">
              <button type="button" className="app-btn-ghost" onClick={closeEdit}>Cancel</button>
              <button type="submit" disabled={savingEdit} className="app-btn-primary disabled:opacity-60">{savingEdit ? 'Saving...' : 'Save'}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} message={`Delete duty for ${deleteTarget?.instructor_name ?? 'this instructor'}?`} />
    </section>
  );
}
