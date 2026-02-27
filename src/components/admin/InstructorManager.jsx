import { useEffect, useState } from 'react';
import { useInstructors } from '../../lib/hooks/useInstructors';
import { Pencil, Trash2, Users } from 'lucide-react';
import ConfirmDialog from '../shared/ConfirmDialog';
import Modal from '../shared/Modal';
import TablePagination from '../shared/TablePagination';
import { useToast } from '../shared/Toast';
import { useOnlineStatus } from '../../lib/hooks/useOnlineStatus';
import { useDebouncedValue } from '../../lib/hooks/useDebouncedValue';
import EmptyState from '../shared/EmptyState';
import { TableSkeleton } from '../shared/Skeletons';

const emptyForm = {
  name: '',
  email: '',
  department: '',
};

function formatPunctuality(value) {
  if (value === null || value === undefined) {
    return '0%';
  }

  return `${Number(value).toFixed(2)}%`;
}

export default function InstructorManager({ openCreateTrigger = 0 }) {
  const { addToast } = useToast();
  const { isOnline } = useOnlineStatus();
  const {
    instructors,
    loading,
    error,
    fetchAllInstructors,
    createInstructor,
    updateInstructor,
    deleteInstructor,
  } = useInstructors();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', department: '' });
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingInstructor, setEditingInstructor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const debouncedDepartmentFilter = useDebouncedValue(departmentFilter, 300);

  useEffect(() => {
    fetchAllInstructors();
  }, [fetchAllInstructors]);

  const filteredInstructors = instructors.filter((instructor) => {
    const query = debouncedSearchTerm.trim().toLowerCase();
    const haystack = [instructor.name, instructor.email, instructor.department].join(' ').toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    const matchesDepartment = debouncedDepartmentFilter === 'all' || instructor.department === debouncedDepartmentFilter;
    return matchesSearch && matchesDepartment;
  });

  useEffect(() => {
    setPage(1);
  }, [filteredInstructors.length, searchTerm, departmentFilter]);

  const paginatedInstructors = filteredInstructors.slice((page - 1) * 10, page * 10);
  const departmentOptions = [...new Set(instructors.map((instructor) => instructor.department).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b))
  );

  useEffect(() => {
    if (openCreateTrigger > 0) {
      openCreateModal();
    }
  }, [openCreateTrigger]);

  const openCreateModal = () => {
    setEditingInstructor(null);
    setForm(emptyForm);
    setFormError('');
    setFieldErrors({ name: '', email: '', department: '' });
    setSubmitting(false);
    setShake(false);
    setIsModalOpen(true);
  };

  const openEditModal = (instructor) => {
    setEditingInstructor(instructor);
    setForm({
      name: instructor.name ?? '',
      email: instructor.email ?? '',
      department: instructor.department ?? '',
    });
    setFormError('');
    setFieldErrors({ name: '', email: '', department: '' });
    setSubmitting(false);
    setShake(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormError('');
    setFieldErrors({ name: '', email: '', department: '' });
    setSubmitting(false);
    setShake(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setFieldErrors({ name: '', email: '', department: '' });

    const nextFieldErrors = {
      name: form.name.trim() ? '' : 'Name is required.',
      email: form.email.trim() ? '' : 'Email is required.',
      department: form.department.trim() ? '' : 'Department is required.',
    };

    if (nextFieldErrors.name || nextFieldErrors.email || nextFieldErrors.department) {
      setFieldErrors(nextFieldErrors);
      setShake(true);
      window.setTimeout(() => setShake(false), 350);
      return;
    }

    setSubmitting(true);

    const result = editingInstructor
      ? await updateInstructor(editingInstructor.instructor_id, form)
      : await createInstructor(form);

    if (result?.error) {
      setFormError(result.error);
      addToast({ type: 'error', message: result.error });
      setSubmitting(false);
      setShake(true);
      window.setTimeout(() => setShake(false), 350);
      return;
    }

    if (result?.queued) {
      addToast({ type: 'info', message: 'Offline: instructor change queued for sync.' });
      setSubmitting(false);
      closeModal();
      return;
    }

    addToast({
      type: 'success',
      message: editingInstructor ? 'Instructor updated successfully' : 'Instructor created successfully',
    });

    if (!editingInstructor && result?.warning) {
      addToast({ type: 'warning', message: result.warning });
    }

    if (!editingInstructor && !result?.warning) {
      addToast({ type: 'info', message: 'Login setup link sent to instructor email.' });
    }

    setSubmitting(false);
    closeModal();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    const result = await deleteInstructor(deleteTarget.instructor_id);
    if (!result?.error) {
      setDeleteTarget(null);
      addToast({ type: result?.queued ? 'info' : 'success', message: result?.queued ? 'Offline: instructor deletion queued for sync.' : 'Instructor deleted successfully' });
      return;
    }

    addToast({ type: 'error', message: result?.error ?? 'Unable to delete instructor' });
  };

  return (
    <section className="app-card fade-up space-y-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl">Instructor Management</h2>
        <button
          type="button"
          onClick={openCreateModal}
          disabled={!isOnline}
          className="app-btn-primary"
        >
          Add Instructor
        </button>
      </div>

      {error ? <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}

      <div className="flex items-center justify-between border-b border-white/6 px-5 py-4">
        <p className="text-sm font-medium text-white/70">Faculty Records</p>
        <div className="flex flex-col gap-3 sm:flex-row">
        <div className="w-full">
          <label htmlFor="instructor-search" className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/35">
            Search
          </label>
          <input
            id="instructor-search"
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Name, email, department..."
            className="app-input w-52 px-3 py-2 text-xs text-white/60"
          />
        </div>
        <div className="w-full sm:max-w-xs">
          <label htmlFor="instructor-dept-filter" className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/35">
            Department
          </label>
          <select
            id="instructor-dept-filter"
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
            className="app-input px-3 py-2 text-xs text-white/60"
          >
            <option value="all">All departments</option>
            {departmentOptions.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </div>
        </div>
      </div>

      {loading ? <TableSkeleton rows={5} /> : null}

      {!loading && filteredInstructors.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No instructors found"
          subtitle="Add your first instructor to get started"
          actionLabel={isOnline ? 'Add Instructor' : undefined}
          onAction={isOnline ? openCreateModal : undefined}
        />
      ) : null}

      {!loading && filteredInstructors.length > 0 ? (
        <>
          <div className="space-y-3 md:hidden">
            {paginatedInstructors.map((instructor) => (
              <article key={instructor.instructor_id} className="app-card card-interactive rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/35">Name</p>
                <p className="mt-1 font-semibold text-white/80">{instructor.name}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-white/35">Department:</span> {instructor.department ?? '--'}</p>
                  <p><span className="text-white/35">Duties:</span> {instructor.total_duties ?? 0}</p>
                  <p><span className="text-white/35">Late:</span> {instructor.late_arrivals ?? 0}</p>
                  <p><span className="text-white/35">Punctuality:</span> {formatPunctuality(instructor.punctuality_percentage)}</p>
                </div>
                <p className="mt-2 text-sm text-white/55">{instructor.email}</p>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => openEditModal(instructor)} disabled={!isOnline} className="app-btn-ghost px-3 py-1.5 text-xs">Edit</button>
                  <button type="button" onClick={() => setDeleteTarget(instructor)} disabled={!isOnline} className="app-btn-danger px-3 py-1.5 text-xs">Delete</button>
                </div>
              </article>
            ))}
            <TablePagination totalItems={filteredInstructors.length} page={page} onPageChange={setPage} />
          </div>

          <div className="hidden md:block app-table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>Email</th>
                <th>Total Duties</th>
                <th>Late Arrivals</th>
                <th>Punctuality %</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInstructors.map((instructor) => (
                <tr key={instructor.instructor_id} className="group">
                  <td className="font-medium text-white/80">{instructor.name}</td>
                  <td>{instructor.department ?? '--'}</td>
                  <td>{instructor.email}</td>
                  <td>{instructor.total_duties ?? 0}</td>
                  <td>{instructor.late_arrivals ?? 0}</td>
                  <td>{formatPunctuality(instructor.punctuality_percentage)}</td>
                  <td>
                    <div className="flex items-center gap-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => openEditModal(instructor)}
                        disabled={!isOnline}
                        className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/8 hover:text-white/70"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(instructor)}
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
          <TablePagination totalItems={filteredInstructors.length} page={page} onPageChange={setPage} />
          </div>
        </>
      ) : null}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingInstructor ? 'Edit Instructor' : 'Create Instructor'}
      >
        <form className={`space-y-3 ${shake ? 'animate-shake' : ''}`} onSubmit={handleSubmit}>
          <div>
            <label htmlFor="instructor-name" className="mb-1 block text-xs tracking-wide text-white/40">
              Name
            </label>
            <input
              id="instructor-name"
              type="text"
              value={form.name}
              onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
              className={`app-input ${fieldErrors.name ? 'border-red-500/40' : ''}`}
              required
            />
            {fieldErrors.name ? <p className="mt-1 text-xs text-red-400">{fieldErrors.name}</p> : null}
          </div>

          <div>
            <label htmlFor="instructor-email" className="mb-1 block text-xs tracking-wide text-white/40">
              Email
            </label>
            <input
              id="instructor-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
              className={`app-input ${fieldErrors.email ? 'border-red-500/40' : ''}`}
              required
            />
            {fieldErrors.email ? <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p> : null}
          </div>

          <div>
            <label htmlFor="instructor-department" className="mb-1 block text-xs tracking-wide text-white/40">
              Department
            </label>
            <input
              id="instructor-department"
              type="text"
              value={form.department}
              onChange={(event) => setForm((previous) => ({ ...previous, department: event.target.value }))}
              className={`app-input ${fieldErrors.department ? 'border-red-500/40' : ''}`}
              required
            />
            {fieldErrors.department ? <p className="mt-1 text-xs text-red-400">{fieldErrors.department}</p> : null}
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
              ) : editingInstructor ? 'Save Changes' : 'Create Instructor'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        message={`Delete ${deleteTarget?.name ?? 'this instructor'}? This action cannot be undone.`}
      />
    </section>
  );
}
