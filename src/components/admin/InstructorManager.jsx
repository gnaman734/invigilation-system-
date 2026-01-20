import { useEffect, useState } from 'react';
import { useInstructors } from '../../lib/hooks/useInstructors';
import { Users } from 'lucide-react';
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
    <section className="app-card animate-[fade-in-up_240ms_ease-out] space-y-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Instructor Management</h2>
        <button
          type="button"
          onClick={openCreateModal}
          disabled={!isOnline}
          className="app-btn-primary"
        >
          Add Instructor
        </button>
      </div>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 sm:flex-row">
        <div className="w-full">
          <label htmlFor="instructor-search" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
            Search
          </label>
          <input
            id="instructor-search"
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Name, email, department..."
            className="app-input"
          />
        </div>
        <div className="w-full sm:max-w-xs">
          <label htmlFor="instructor-dept-filter" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
            Department
          </label>
          <select
            id="instructor-dept-filter"
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
            className="app-input"
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
              <article key={instructor.instructor_id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Name</p>
                <p className="mt-1 font-semibold text-gray-800">{instructor.name}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-gray-500">Department:</span> {instructor.department ?? '--'}</p>
                  <p><span className="text-gray-500">Duties:</span> {instructor.total_duties ?? 0}</p>
                  <p><span className="text-gray-500">Late:</span> {instructor.late_arrivals ?? 0}</p>
                  <p><span className="text-gray-500">Punctuality:</span> {formatPunctuality(instructor.punctuality_percentage)}</p>
                </div>
                <p className="mt-2 text-sm text-gray-600">{instructor.email}</p>
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
                <tr key={instructor.instructor_id}>
                  <td className="font-medium text-gray-800">{instructor.name}</td>
                  <td>{instructor.department ?? '--'}</td>
                  <td>{instructor.email}</td>
                  <td>{instructor.total_duties ?? 0}</td>
                  <td>{instructor.late_arrivals ?? 0}</td>
                  <td>{formatPunctuality(instructor.punctuality_percentage)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(instructor)}
                        disabled={!isOnline}
                        className="app-btn-ghost px-3 py-1.5 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(instructor)}
                        disabled={!isOnline}
                        className="app-btn-danger px-3 py-1.5 text-xs"
                      >
                        Delete
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
            <label htmlFor="instructor-name" className="mb-1 block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              id="instructor-name"
              type="text"
              value={form.name}
              onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
              className={`app-input ${fieldErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
              required
            />
            {fieldErrors.name ? <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p> : null}
          </div>

          <div>
            <label htmlFor="instructor-email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="instructor-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
              className={`app-input ${fieldErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
              required
            />
            {fieldErrors.email ? <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p> : null}
          </div>

          <div>
            <label htmlFor="instructor-department" className="mb-1 block text-sm font-medium text-slate-700">
              Department
            </label>
            <input
              id="instructor-department"
              type="text"
              value={form.department}
              onChange={(event) => setForm((previous) => ({ ...previous, department: event.target.value }))}
              className={`app-input ${fieldErrors.department ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
              required
            />
            {fieldErrors.department ? <p className="mt-1 text-xs text-red-600">{fieldErrors.department}</p> : null}
          </div>

          {formError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
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
