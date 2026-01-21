import { useEffect, useMemo, useState } from 'react';
import { Layers, Plus, Pencil, Trash2 } from 'lucide-react';
import { useFloors } from '../../lib/hooks/useFloors';
import ConfirmDialog from '../shared/ConfirmDialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

const emptyFloorForm = { floor_number: '', floor_label: '', building: '' };

export default function FloorsManager() {
  const { floors, loading, error, fetchAllFloors, createFloor, updateFloor, deleteFloor } = useFloors();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyFloorForm);
  const [editingId, setEditingId] = useState('');
  const [inlineForm, setInlineForm] = useState(emptyFloorForm);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchAllFloors();
  }, [fetchAllFloors]);

  const sortedFloors = useMemo(() => [...(floors ?? [])].sort((a, b) => Number(a.floor_number) - Number(b.floor_number)), [floors]);

  const startInlineEdit = (floor) => {
    setEditingId(floor.id);
    setInlineForm({
      floor_number: String(floor.floor_number ?? ''),
      floor_label: floor.floor_label ?? '',
      building: floor.building ?? '',
    });
  };

  const saveInlineEdit = async () => {
    if (!editingId) return;
    const result = await updateFloor(editingId, inlineForm);
    if (!result?.error) {
      setEditingId('');
      setInlineForm(emptyFloorForm);
    }
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    const result = await createFloor(createForm);
    if (!result?.error) {
      setCreateForm(emptyFloorForm);
      setIsCreateOpen(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteFloor(deleteTarget.id);
    if (!result?.error) setDeleteTarget(null);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-white/8 bg-[#111118] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl text-white/85">Floors</h2>
          <p className="text-xs text-white/35">Reference setup only. No rooms, exams, or duties created here.</p>
        </div>
        <button type="button" className="app-btn-primary" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Create Floor
        </button>
      </div>

      {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div> : null}

      {loading ? (
        <div className="space-y-2">
          <div className="skeleton h-12" />
          <div className="skeleton h-12" />
          <div className="skeleton h-12" />
        </div>
      ) : null}

      {!loading && sortedFloors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/3 px-4 py-10 text-center">
          <Layers className="mx-auto h-7 w-7 text-white/20" />
          <p className="mt-2 text-sm text-white/55">No floors configured yet</p>
        </div>
      ) : null}

      {!loading && sortedFloors.length > 0 ? (
        <div className="space-y-2">
          {sortedFloors.map((floor) => {
            const isEditing = editingId === floor.id;
            return (
              <article key={floor.id} className="rounded-xl border border-white/8 bg-white/3 p-3">
                {isEditing ? (
                  <div className="grid gap-2 md:grid-cols-[110px,1fr,1fr,auto] md:items-center">
                    <input className="app-input" type="number" value={inlineForm.floor_number} onChange={(event) => setInlineForm((prev) => ({ ...prev, floor_number: event.target.value }))} />
                    <input className="app-input" value={inlineForm.floor_label} onChange={(event) => setInlineForm((prev) => ({ ...prev, floor_label: event.target.value }))} />
                    <input className="app-input" value={inlineForm.building} onChange={(event) => setInlineForm((prev) => ({ ...prev, building: event.target.value }))} />
                    <div className="flex items-center gap-2">
                      <button type="button" className="app-btn-primary px-3 py-2 text-xs" onClick={saveInlineEdit}>Save</button>
                      <button type="button" className="app-btn-ghost px-3 py-2 text-xs" onClick={() => setEditingId('')}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <button type="button" onClick={() => startInlineEdit(floor)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/55">Floor {floor.floor_number}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white/85">{floor.floor_label}</p>
                        <p className="truncate text-xs text-white/35">{floor.building || 'No building'}</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/4 px-2 py-0.5 text-xs text-white/40">{floor.room_count ?? 0} rooms</span>
                      <button type="button" className="rounded-lg p-2 text-white/35 hover:bg-white/8 hover:text-white/70" onClick={() => startInlineEdit(floor)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" className="rounded-lg p-2 text-white/35 hover:bg-red-500/10 hover:text-red-400" onClick={() => setDeleteTarget(floor)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : null}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Floor</DialogTitle>
          </DialogHeader>
          <form className="space-y-3 px-6 pb-2" onSubmit={submitCreate}>
            <input className="app-input" type="number" placeholder="Floor number" value={createForm.floor_number} onChange={(event) => setCreateForm((prev) => ({ ...prev, floor_number: event.target.value }))} required />
            <input className="app-input" placeholder="Floor label" value={createForm.floor_label} onChange={(event) => setCreateForm((prev) => ({ ...prev, floor_label: event.target.value }))} required />
            <input className="app-input" placeholder="Building" value={createForm.building} onChange={(event) => setCreateForm((prev) => ({ ...prev, building: event.target.value }))} />
            <DialogFooter className="px-0 pb-0">
              <button type="button" className="app-btn-ghost" onClick={() => setIsCreateOpen(false)}>Cancel</button>
              <button type="submit" className="app-btn-primary">Create</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        message={`Delete ${deleteTarget?.floor_label ?? 'this floor'}? This cannot be undone.`}
      />
    </section>
  );
}
