import { useEffect, useMemo, useState } from 'react';
import { Pencil, ShieldOff, Users } from 'lucide-react';
import { useInstructors } from '../../lib/hooks/useInstructors';
import ConfirmDialog from '../shared/ConfirmDialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

function formatPunctuality(value) {
  if (value === null || value === undefined) return '0%';
  return `${Number(value).toFixed(1)}%`;
}

export default function InstructorSetupManager() {
  const { instructors, loading, error, fetchAllInstructors, updateInstructor, deactivateInstructor } = useInstructors();
  const [search, setSearch] = useState('');
  const [editingInstructor, setEditingInstructor] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');

  useEffect(() => {
    fetchAllInstructors({ force: true });
  }, [fetchAllInstructors]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (instructors ?? []).filter((item) => {
      const haystack = `${item.name} ${item.department}`.toLowerCase();
      return !query || haystack.includes(query);
    });
  }, [instructors, search]);

  const openEdit = (instructor) => {
    setEditingInstructor(instructor);
    setEditName(instructor.name ?? '');
    setEditDepartment(instructor.department ?? '');
  };

  const closeEdit = () => {
    setEditingInstructor(null);
    setEditName('');
    setEditDepartment('');
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!editingInstructor) return;

    const result = await updateInstructor(editingInstructor.instructor_id, {
      name: editName,
      email: editingInstructor.email,
      department: editDepartment,
    });

    if (!result?.error) closeEdit();
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    const result = await deactivateInstructor(deactivateTarget.instructor_id);
    if (!result?.error) setDeactivateTarget(null);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-white/8 bg-[#111118] p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl text-white/85">Instructors</h2>
        <input className="app-input w-72" placeholder="Search by name or department" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>

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
          <Users className="mx-auto h-7 w-7 text-white/20" />
          <p className="mt-2 text-sm text-white/55">No approved instructors found</p>
        </div>
      ) : null}

      {!loading && filtered.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="min-w-full text-sm">
            <thead className="border-b border-white/8 bg-white/3 text-xs uppercase tracking-wide text-white/35">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Duties</th>
                <th className="px-4 py-3 text-left">Punctuality</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((instructor) => (
                <tr key={instructor.instructor_id} className="border-b border-white/6 text-white/75">
                  <td className="px-4 py-3">{instructor.name}</td>
                  <td className="px-4 py-3">{instructor.department || '--'}</td>
                  <td className="px-4 py-3">{instructor.total_duties ?? 0}</td>
                  <td className="px-4 py-3">{formatPunctuality(instructor.punctuality_percentage)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${instructor.is_active ? 'bg-green-500/10 text-green-300' : 'bg-white/10 text-white/45'}`}>
                      {instructor.is_active ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button type="button" className="rounded-lg p-2 text-white/35 hover:bg-white/8 hover:text-white/70" onClick={() => openEdit(instructor)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" className="rounded-lg p-2 text-white/35 hover:bg-red-500/10 hover:text-red-400" onClick={() => setDeactivateTarget(instructor)}>
                        <ShieldOff className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Dialog open={Boolean(editingInstructor)} onOpenChange={(open) => (open ? null : closeEdit())}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Instructor</DialogTitle>
          </DialogHeader>
          <form className="space-y-3 px-6 pb-2" onSubmit={saveEdit}>
            <input className="app-input" value={editName} onChange={(event) => setEditName(event.target.value)} required />
            <input className="app-input" value={editDepartment} onChange={(event) => setEditDepartment(event.target.value)} required />
            <DialogFooter className="px-0 pb-0">
              <button type="button" className="app-btn-ghost" onClick={closeEdit}>Cancel</button>
              <button type="submit" className="app-btn-primary">Save</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={confirmDeactivate}
        message={`Deactivate ${deactivateTarget?.name ?? 'this instructor'}?`}
      />
    </section>
  );
}
