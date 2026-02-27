import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ClipboardList, Pencil, Trash2 } from 'lucide-react';
import { useDuties } from '../../lib/hooks/useDuties';
import { useExamsRooms } from '../../lib/hooks/useExamsRooms';
import { useInstructors } from '../../lib/hooks/useInstructors';
import StatusBadge from '../shared/StatusBadge';
import Modal from '../shared/Modal';
import ConfirmDialog from '../shared/ConfirmDialog';
import { formatTimeDisplay } from '../../lib/utils/punctuality';
import { getSuggestedInstructor } from '../../lib/utils/workload';
import TablePagination from '../shared/TablePagination';
import { useToast } from '../shared/Toast';
import { useOnlineStatus } from '../../lib/hooks/useOnlineStatus';
import { useDebouncedValue } from '../../lib/hooks/useDebouncedValue';
import EmptyState from '../shared/EmptyState';
import { TableSkeleton } from '../shared/Skeletons';

const emptyDutyForm = {
  exam_id: '',
  room_id: '',
  instructor_id: '',
  reporting_time: '',
};

export default function DutyManager({ openCreateTrigger = 0 }) {
  const { addToast } = useToast();
  const { isOnline } = useOnlineStatus();
  const { allDuties, loading: dutiesLoading, error: dutiesError, fetchAllDuties, createDuty, updateDuty, deleteDuty } = useDuties();
  const {
    exams,
    rooms,
    loading: examsRoomsLoading,
    error: examsRoomsError,
    fetchAllExams,
    fetchAllRooms,
  } = useExamsRooms();
  const {
    instructors,
    loading: instructorsLoading,
    error: instructorsError,
    fetchAllInstructors,
  } = useInstructors();

  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDuty, setEditingDuty] = useState(null);
  const [form, setForm] = useState(emptyDutyForm);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ exam_id: '', room_id: '', instructor_id: '', reporting_time: '' });
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [suggestionDepartment, setSuggestionDepartment] = useState('');
  const [suggestionResult, setSuggestionResult] = useState(null);
  const [suggestionMessage, setSuggestionMessage] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const debouncedDateFilter = useDebouncedValue(dateFilter, 300);
  const debouncedStatusFilter = useDebouncedValue(statusFilter, 300);

  useEffect(() => {
    fetchAllDuties();
    fetchAllExams();
    fetchAllRooms();
    fetchAllInstructors();
  }, [fetchAllDuties, fetchAllExams, fetchAllRooms, fetchAllInstructors]);

  const filteredDuties = useMemo(() => {
    return allDuties.filter((duty) => {
      const matchesDate = !debouncedDateFilter || duty.exam_date === debouncedDateFilter;
      const matchesStatus = debouncedStatusFilter === 'all' || duty.status === debouncedStatusFilter;
      const query = debouncedSearchTerm.trim().toLowerCase();
      const haystack = [duty.subject, duty.instructor_name, duty.room_number, duty.building].join(' ').toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      return matchesDate && matchesStatus && matchesSearch;
    });
  }, [allDuties, debouncedDateFilter, debouncedSearchTerm, debouncedStatusFilter]);

  useEffect(() => {
    setPage(1);
  }, [dateFilter, statusFilter, searchTerm, allDuties.length]);

  const paginatedDuties = useMemo(() => {
    const startIndex = (page - 1) * 10;
    return filteredDuties.slice(startIndex, startIndex + 10);
  }, [filteredDuties, page]);

  const loading = dutiesLoading || examsRoomsLoading || instructorsLoading;
  const error = dutiesError || examsRoomsError || instructorsError;

  const closeModal = () => {
    setIsModalOpen(false);
    setFormError('');
    setForm(emptyDutyForm);
    setEditingDuty(null);
    setSuggestionDepartment('');
    setSuggestionResult(null);
    setSuggestionMessage('');
    setFieldErrors({ exam_id: '', room_id: '', instructor_id: '', reporting_time: '' });
    setSubmitting(false);
    setShake(false);
  };

  const openCreateModal = () => {
    setEditingDuty(null);
    setForm(emptyDutyForm);
    setFormError('');
    setFieldErrors({ exam_id: '', room_id: '', instructor_id: '', reporting_time: '' });
    setSuggestionDepartment('');
    setSuggestionResult(null);
    setSuggestionMessage('');
    setIsModalOpen(true);
  };

  const openEditModal = (duty) => {
    setEditingDuty(duty);
    setForm({
      exam_id: duty.exam_id ?? '',
      room_id: duty.room_id ?? '',
      instructor_id: duty.instructor_id ?? '',
      reporting_time: duty.reporting_time?.slice(0, 5) ?? '',
    });
    setFormError('');
    setFieldErrors({ exam_id: '', room_id: '', instructor_id: '', reporting_time: '' });
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (openCreateTrigger > 0) {
      openCreateModal();
    }
  }, [openCreateTrigger]);

  const departmentOptions = useMemo(() => {
    const values = instructors
      .map((instructor) => String(instructor.department ?? '').trim())
      .filter((department) => department.length > 0);

    return [...new Set(values)].sort((first, second) => first.localeCompare(second));
  }, [instructors]);

  const handleSmartSuggest = () => {
    setSuggestionResult(null);
    setSuggestionMessage('');

    try {
      const suggestion = getSuggestedInstructor(instructors, suggestionDepartment || undefined);
      if (!suggestion?.instructor) {
        setSuggestionMessage('All instructors are equally loaded');
        return;
      }

      setSuggestionResult(suggestion);
    } catch (_error) {
      setSuggestionMessage('All instructors are equally loaded');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setFieldErrors({ exam_id: '', room_id: '', instructor_id: '', reporting_time: '' });

    const nextFieldErrors = {
      exam_id: form.exam_id ? '' : 'Exam is required.',
      room_id: form.room_id ? '' : 'Room is required.',
      instructor_id: form.instructor_id ? '' : 'Instructor is required.',
      reporting_time: form.reporting_time ? '' : 'Reporting time is required.',
    };

    if (nextFieldErrors.exam_id || nextFieldErrors.room_id || nextFieldErrors.instructor_id || nextFieldErrors.reporting_time) {
      setFieldErrors(nextFieldErrors);
      setShake(true);
      window.setTimeout(() => setShake(false), 350);
      return;
    }

    setSubmitting(true);

    const payload = {
      exam_id: form.exam_id,
      room_id: form.room_id,
      instructor_id: form.instructor_id,
      reporting_time: `${form.reporting_time}:00`,
    };

    const result = editingDuty
      ? await updateDuty(editingDuty.duty_id, payload)
      : await createDuty({ ...payload, status: 'pending', arrival_time: null });

    if (result?.error) {
      setFormError(result.error);
      addToast({ type: 'error', message: result.error });
      setSubmitting(false);
      setShake(true);
      window.setTimeout(() => setShake(false), 350);
      return;
    }

    if (result?.queued) {
      addToast({ type: 'info', message: 'Offline: duty change queued for sync.' });
      setSubmitting(false);
      closeModal();
      return;
    }

    addToast({ type: 'success', message: editingDuty ? 'Duty updated successfully' : 'Duty created successfully' });
    setSubmitting(false);
    closeModal();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    const result = await deleteDuty(deleteTarget.duty_id);
    if (!result?.error) {
      setDeleteTarget(null);
      addToast({ type: result?.queued ? 'info' : 'success', message: result?.queued ? 'Offline: duty deletion queued for sync.' : 'Duty deleted successfully' });
      return;
    }

    addToast({ type: 'error', message: result?.error ?? 'Unable to delete duty' });
  };

  return (
    <section className="app-card fade-up space-y-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl">Duty Management</h2>
        <button
          type="button"
          onClick={openCreateModal}
          disabled={!isOnline}
          className="app-btn-primary"
        >
          Add Duty
        </button>
      </div>

      <div className="flex items-center justify-between border-b border-white/6 px-5 py-4">
        <p className="text-sm font-medium text-white/70">Duty Schedule</p>
        <div className="flex flex-col gap-3 sm:flex-row">
        <div className="w-full">
          <label htmlFor="duty-search-filter" className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/35">
            Search
          </label>
          <input
            id="duty-search-filter"
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Subject, room, instructor..."
            className="app-input w-52 px-3 py-2 text-xs text-white/60"
          />
        </div>

        <div className="w-full">
          <label htmlFor="duty-date-filter" className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/35">
            Filter by Date
          </label>
          <input
            id="duty-date-filter"
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            className="app-input px-3 py-2 text-xs text-white/60"
          />
        </div>

        <div className="w-full sm:max-w-xs">
          <label htmlFor="duty-status-filter" className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/35">
            Filter by Status
          </label>
          <select
            id="duty-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="app-input px-3 py-2 text-xs text-white/60"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="on-time">On-Time</option>
            <option value="late">Late</option>
          </select>
        </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: `All (${allDuties.length})` },
          { id: 'pending', label: `Pending (${allDuties.filter((duty) => duty.status === 'pending').length})` },
          { id: 'on-time', label: `On-Time (${allDuties.filter((duty) => duty.status === 'on-time').length})` },
          { id: 'late', label: `Late (${allDuties.filter((duty) => duty.status === 'late').length})` },
        ].map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setStatusFilter(chip.id)}
            className={`app-filter-chip ${statusFilter === chip.id ? 'app-filter-chip-active' : ''}`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {error ? <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}

      {loading ? <TableSkeleton rows={5} /> : null}

      {!loading && filteredDuties.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No duties assigned yet"
          subtitle="Duties will appear here once assigned"
          actionLabel={isOnline ? 'Create Duty' : undefined}
          onAction={isOnline ? openCreateModal : undefined}
        />
      ) : null}

      {!loading && filteredDuties.length > 0 ? (
        <>
          <div className="space-y-3 md:hidden">
            {paginatedDuties.map((duty) => (
              <article key={duty.duty_id} className="app-card card-interactive rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/35">Subject</p>
                <p className="mt-1 font-semibold text-white/80">{duty.subject}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-white/35">Date:</span> {duty.exam_date ? format(parseISO(duty.exam_date), 'dd MMM yyyy') : '--'}</p>
                  <p><span className="text-white/35">Room:</span> {duty.room_number}</p>
                  <p><span className="text-white/35">Instructor:</span> {duty.instructor_name}</p>
                  <p><span className="text-white/35">Time:</span> {formatTimeDisplay(duty.reporting_time)}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <StatusBadge status={duty.status} />
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => openEditModal(duty)} disabled={!isOnline} className="app-btn-ghost px-3 py-1.5 text-xs">Edit</button>
                    <button type="button" onClick={() => setDeleteTarget(duty)} disabled={!isOnline} className="app-btn-danger px-3 py-1.5 text-xs">Delete</button>
                  </div>
                </div>
              </article>
            ))}
            <TablePagination totalItems={filteredDuties.length} page={page} onPageChange={setPage} />
          </div>

          <div className="hidden md:block app-table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Date</th>
                <th>Room</th>
                <th>Instructor</th>
                <th>Reporting Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDuties.map((duty) => (
                <tr key={duty.duty_id} className="group">
                  <td className="font-medium text-white/80">{duty.subject}</td>
                  <td>
                    {duty.exam_date ? format(parseISO(duty.exam_date), 'dd MMM yyyy') : '--'}
                  </td>
                  <td>
                    {duty.room_number}
                    {duty.building ? `, ${duty.building}` : ''}
                  </td>
                  <td>{duty.instructor_name}</td>
                  <td>{formatTimeDisplay(duty.reporting_time)}</td>
                  <td>
                    <StatusBadge status={duty.status} />
                  </td>
                  <td>
                    <div className="flex items-center gap-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => openEditModal(duty)}
                        disabled={!isOnline}
                        className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/8 hover:text-white/70"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(duty)}
                        disabled={!isOnline}
                        className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <TablePagination totalItems={filteredDuties.length} page={page} onPageChange={setPage} />
          </div>
        </>
      ) : null}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingDuty ? 'Edit Duty' : 'Create Duty'}>
        <form className={`space-y-3 ${shake ? 'animate-shake' : ''}`} onSubmit={handleSubmit}>
          <div>
            <label htmlFor="duty-exam" className="mb-1 block text-xs tracking-wide text-white/40">
              Exam
            </label>
            <select
              id="duty-exam"
              value={form.exam_id}
              onChange={(event) => setForm((previous) => ({ ...previous, exam_id: event.target.value }))}
              className={`app-input ${fieldErrors.exam_id ? 'border-red-500/40' : ''}`}
              required
            >
              <option value="">Select exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.subject} ({exam.exam_date})
                </option>
              ))}
            </select>
            {fieldErrors.exam_id ? <p className="mt-1 text-xs text-red-400">{fieldErrors.exam_id}</p> : null}
          </div>

          <div>
            <label htmlFor="duty-room" className="mb-1 block text-xs tracking-wide text-white/40">
              Room
            </label>
            <select
              id="duty-room"
              value={form.room_id}
              onChange={(event) => setForm((previous) => ({ ...previous, room_id: event.target.value }))}
              className={`app-input ${fieldErrors.room_id ? 'border-red-500/40' : ''}`}
              required
            >
              <option value="">Select room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.room_number} {room.building ? `(${room.building})` : ''}
                </option>
              ))}
            </select>
            {fieldErrors.room_id ? <p className="mt-1 text-xs text-red-400">{fieldErrors.room_id}</p> : null}
          </div>

          <div>
            <label htmlFor="duty-instructor" className="mb-1 block text-xs tracking-wide text-white/40">
              Instructor
            </label>
            <select
              id="duty-instructor"
              value={form.instructor_id}
              onChange={(event) => setForm((previous) => ({ ...previous, instructor_id: event.target.value }))}
              className={`app-input ${fieldErrors.instructor_id ? 'border-red-500/40' : ''}`}
              required
            >
              <option value="">Select instructor</option>
              {instructors.map((instructor) => (
                <option key={instructor.instructor_id} value={instructor.instructor_id}>
                  {instructor.name}
                </option>
              ))}
            </select>
            {fieldErrors.instructor_id ? <p className="mt-1 text-xs text-red-400">{fieldErrors.instructor_id}</p> : null}
          </div>

          <div className="space-y-2 rounded-xl border border-white/8 bg-[#16161F] p-3">
            <p className="text-sm font-medium text-white/75">Smart Suggest</p>
            <div>
              <label htmlFor="suggestion-department" className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/35">
                Department Filter (Optional)
              </label>
              <select
                id="suggestion-department"
                value={suggestionDepartment}
                onChange={(event) => setSuggestionDepartment(event.target.value)}
                className="app-input"
              >
                <option value="">All departments</option>
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSmartSuggest}
              disabled={!isOnline}
              className="app-btn-ghost"
            >
              Smart Suggest
            </button>

            {suggestionResult?.instructor ? (
              <div className="rounded-md border border-green-500/20 bg-green-500/10 px-3 py-3 text-sm">
                <p className="font-semibold text-green-300">{suggestionResult.instructor.name}</p>
                <p className="mt-1 text-green-200">Current duties: {suggestionResult.instructor.total_duties ?? 0}</p>
                <p className="mt-1 text-green-200">Variance: {suggestionResult.variance.toFixed(2)}</p>
                <p className="mt-1 text-green-200">{suggestionResult.suggestion} - Best choice</p>
                <button
                  type="button"
                  onClick={() =>
                    setForm((previous) => ({
                      ...previous,
                      instructor_id: suggestionResult.instructor.instructor_id,
                    }))
                  }
                  className="mt-2 rounded-lg border border-green-500/20 bg-green-500/15 px-3 py-1.5 text-xs font-semibold text-green-100 transition hover:bg-green-500/25"
                >
                  Use This Instructor
                </button>
              </div>
            ) : null}

            {suggestionMessage ? (
              <p className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">{suggestionMessage}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="duty-reporting-time" className="mb-1 block text-xs tracking-wide text-white/40">
              Reporting Time
            </label>
            <input
              id="duty-reporting-time"
              type="time"
              value={form.reporting_time}
              onChange={(event) => setForm((previous) => ({ ...previous, reporting_time: event.target.value }))}
              className={`app-input ${fieldErrors.reporting_time ? 'border-red-500/40' : ''}`}
              required
            />
            {fieldErrors.reporting_time ? <p className="mt-1 text-xs text-red-400">{fieldErrors.reporting_time}</p> : null}
          </div>

          {formError ? (
            <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{formError}</p>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="app-btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isOnline || submitting}
              className="app-btn-primary"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                  Processing...
                </span>
              ) : editingDuty ? 'Save Changes' : 'Create Duty'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        message={`Delete duty for ${deleteTarget?.subject ?? 'this subject'}? This action cannot be undone.`}
      />
    </section>
  );
}
