import { useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Clock3,
  Download,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { useExamManagement } from '../../lib/hooks/useExamManagement';
import { useExamDetail } from '../../lib/hooks/useExamDetail';
import { useInstructors } from '../../lib/hooks/useInstructors';
import { exportExamCSV } from '../../lib/utils/exportExamCSV';
import { useToast } from '../../components/shared/Toast';

const STATUS_OPTIONS = ['upcoming', 'ongoing', 'completed'];

function statusBadgeClasses(status) {
  if (status === 'ongoing') return 'border-blue-500/25 bg-blue-500/10 text-blue-300';
  if (status === 'completed') return 'border-green-500/25 bg-green-500/10 text-green-300';
  return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
}

function statusPillClasses(status) {
  if (status === 'on-time') return 'border-green-500/20 bg-green-500/10 text-green-400';
  if (status === 'late') return 'border-red-500/20 bg-red-500/10 text-red-400';
  if (status === 'cancelled') return 'border-white/15 bg-white/5 text-white/35 line-through';
  return 'border-amber-500/20 bg-amber-500/10 text-amber-400';
}

function initials(name) {
  return String(name || 'I')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function ExamDetail() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const examMgmt = useExamManagement();
  const {
    examDetail,
    loading,
    error,
    isLive,
    lastRealtimeEvent,
    updateExamStatus,
    cancelDuty,
    restoreDuty,
    removeInstructorFromExam,
    addInstructorToRoom,
    refetch,
  } = useExamDetail(examId);
  const { fetchAllInstructors } = useInstructors();

  const [lastUpdatedAt, setLastUpdatedAt] = useState(new Date());
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addModalState, setAddModalState] = useState({ open: false, roomId: null, roomLabel: '' });
  const [allInstructors, setAllInstructors] = useState([]);
  const [searchInstructor, setSearchInstructor] = useState('');
  const [busyInstructorId, setBusyInstructorId] = useState('');
  const [flashIds, setFlashIds] = useState(new Set());
  const [loadingInstructors, setLoadingInstructors] = useState(false);

  const exam = examDetail.exam;
  const rooms = examDetail.rooms ?? [];
  const stats = examDetail.stats;

  useEffect(() => {
    setLastUpdatedAt(new Date());
  }, [examDetail]);

  useEffect(() => {
    if (!lastRealtimeEvent) return;
    const dutyId = lastRealtimeEvent?.new?.id || lastRealtimeEvent?.old?.id;
    if (!dutyId) return;

    setFlashIds((previous) => new Set([...previous, dutyId]));
    const timeout = window.setTimeout(() => {
      setFlashIds((previous) => {
        const next = new Set(previous);
        next.delete(dutyId);
        return next;
      });
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [lastRealtimeEvent]);

  const completionSegments = useMemo(() => {
    const total = Math.max(1, stats.total_duties || 0);
    return {
      green: ((stats.on_time_count || 0) / total) * 100,
      red: ((stats.late_count || 0) / total) * 100,
      amber: ((stats.pending_count || 0) / total) * 100,
    };
  }, [stats]);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.exam_room_id === addModalState.roomId),
    [rooms, addModalState.roomId]
  );

  const instructorInExamMap = useMemo(() => {
    const map = new Map();
    rooms.forEach((room) => {
      (room.instructors ?? []).forEach((row) => {
        map.set(row.instructor_id, room.room_number);
      });
    });
    return map;
  }, [rooms]);

  const availableInstructors = useMemo(() => {
    const query = searchInstructor.trim().toLowerCase();
    const existingInRoom = new Set((selectedRoom?.instructors ?? []).map((item) => item.instructor_id));

    return (allInstructors ?? [])
      .filter((row) => !existingInRoom.has(row.instructor_id))
      .filter((row) => {
        if (!query) return true;
        return String(row.name ?? '').toLowerCase().includes(query) || String(row.department ?? '').toLowerCase().includes(query);
      });
  }, [allInstructors, selectedRoom, searchInstructor]);

  const openAddInstructorModal = async (room) => {
    setSearchInstructor('');
    setAddModalState({ open: true, roomId: room.exam_room_id, roomLabel: room.room_number });
    setLoadingInstructors(true);

    const cachedFirst = await fetchAllInstructors();
    if (!cachedFirst.error) {
      setAllInstructors(cachedFirst.data ?? []);
    }

    if (cachedFirst.error || !(cachedFirst.data ?? []).length) {
      const fresh = await fetchAllInstructors({ force: true });
      if (fresh.error) {
        addToast({ type: 'error', message: fresh.error });
        setLoadingInstructors(false);
        return;
      }
      setAllInstructors(fresh.data ?? []);
    }

    setLoadingInstructors(false);
  };

  const handleAddInstructor = async (instructor) => {
    if (!addModalState.roomId) return;
    setBusyInstructorId(instructor.instructor_id);
    const result = await addInstructorToRoom(addModalState.roomId, instructor.instructor_id);
    setBusyInstructorId('');

    if (result.error) {
      addToast({ type: 'error', message: result.error });
      return;
    }

    addToast({ type: 'success', message: `${instructor.name} added to ${addModalState.roomLabel}` });
  };

  const handleDeleteExam = async () => {
    if (!exam?.id) return;
    setDeleting(true);

    const result = await examMgmt.deleteExam(exam.id);
    setDeleting(false);

    if (result.error) {
      addToast({ type: 'error', message: result.error });
      return;
    }

    setIsDeleteOpen(false);
    addToast({ type: 'success', message: 'Exam deleted.' });
    navigate('/admin/exams');
  };

  if (loading && !exam) {
    return (
      <div className="min-h-screen bg-[#0A0A0F]">
        <div className="sticky top-0 z-20 h-14 border-b border-white/6 bg-[#0A0A0F]" />
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="skeleton h-56" />
          <div className="skeleton mt-4 h-16" />
          <div className="skeleton mt-4 h-64" />
        </div>
      </div>
    );
  }

  if (error && !exam) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
          <p className="text-sm text-red-300">{error}</p>
          <button type="button" onClick={() => refetch()} className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-xs text-white/60">Retry</button>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/8 bg-[#111118] p-6 text-center">
          <p className="text-sm text-white/40">Exam not found.</p>
          <button type="button" onClick={() => navigate('/admin/exams')} className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-xs text-white/60">Back to Exams</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-white/6 bg-[#0A0A0F] px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/admin/exams')} className="rounded-lg border border-white/10 p-1.5 text-white/55 hover:text-white/85">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <p className="text-sm text-white/50">Exams / {exam.subject}</p>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${statusBadgeClasses(exam.status)}`}>
                {String(exam.status || '').replace('-', ' ')}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 border-white/10 bg-[#111118] text-white/75">
              {STATUS_OPTIONS.map((status) => (
                <DropdownMenuItem
                  key={status}
                  className="cursor-pointer capitalize focus:bg-white/10"
                  onClick={async () => {
                    const result = await updateExamStatus(exam.id, status);
                    if (result.error) addToast({ type: 'error', message: result.error });
                    else addToast({ type: 'success', message: `Exam marked ${status}.` });
                  }}
                >
                  {exam.status === status ? <Check className="mr-1 h-3.5 w-3.5 text-amber-400" /> : <span className="mr-1 h-3.5 w-3.5" />}
                  {status}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="mx-auto min-h-screen w-full max-w-6xl px-6 py-8">
        <section className="rounded-2xl border border-amber-500/15 bg-gradient-to-r from-amber-500/8 to-transparent p-6 sm:p-8">
          <div className="grid gap-5 lg:grid-cols-[1fr,340px]">
            <div>
              <h1 className="font-serif text-3xl text-white/92">{exam.subject}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70">{exam.department || '--'}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${statusBadgeClasses(exam.status)}`}>
                      {String(exam.status || '').replace('-', ' ')}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40 border-white/10 bg-[#111118] text-white/75">
                    {STATUS_OPTIONS.map((status) => (
                      <DropdownMenuItem
                        key={status}
                        className="cursor-pointer capitalize focus:bg-white/10"
                        onClick={async () => {
                          const result = await updateExamStatus(exam.id, status);
                          if (result.error) addToast({ type: 'error', message: result.error });
                          else addToast({ type: 'success', message: `Exam marked ${status}.` });
                        }}
                      >
                        {exam.status === status ? <Check className="mr-1 h-3.5 w-3.5 text-amber-400" /> : <span className="mr-1 h-3.5 w-3.5" />}
                        {status}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p className="mt-3 text-sm text-white/50">
                <Calendar className="mr-1 inline h-3.5 w-3.5" />
                {exam.exam_date ? format(parseISO(exam.exam_date), 'EEEE, dd MMMM yyyy') : '--'}
              </p>
              <p className="mt-1 text-sm text-white/50">
                <Clock3 className="mr-1 inline h-3.5 w-3.5" />
                {(exam.shift_start || '--').slice(0, 5)} — {(exam.shift_end || '--').slice(0, 5)}
              </p>

              {exam.notes ? <p className="mt-2 text-xs italic text-white/35">{exam.notes}</p> : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4 text-center transition-all hover:border-white/12">
                <p className="font-serif text-2xl text-white/90">{stats.total_rooms}</p>
                <p className="text-xs text-white/35">Total Rooms</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4 text-center transition-all hover:border-white/12">
                <p className="font-serif text-2xl text-white/90">{stats.total_instructors}</p>
                <p className="text-xs text-white/35">Total Instructors</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4 text-center transition-all hover:border-white/12">
                <p className="font-serif text-2xl text-amber-400">{stats.completion_rate}%</p>
                <p className="text-xs text-white/35">Completion Rate</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4 text-center transition-all hover:border-white/12">
                <p className={`font-serif text-2xl ${stats.pending_count > 0 ? 'text-amber-400' : 'text-green-400'}`}>{stats.pending_count}</p>
                <p className="text-xs text-white/35">Pending Duties</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-white/8 bg-[#111118] p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs text-white/40">Duty Progress</p>
            <p className="text-xs text-white/40">{stats.on_time_count + stats.late_count} completed of {stats.total_duties} total</p>
          </div>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div className="h-2 bg-green-400" style={{ width: `${completionSegments.green}%` }} />
            <div className="h-2 bg-red-400" style={{ width: `${completionSegments.red}%` }} />
            <div className="h-2 bg-amber-400" style={{ width: `${completionSegments.amber}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/45">
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-400" />{stats.on_time_count} On Time</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-400" />{stats.late_count} Late</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />{stats.pending_count} Pending</span>
          </div>
        </section>

        <div className="mt-5 space-y-4 pb-28">
          {rooms.map((room) => (
            <section key={room.exam_room_id} className="overflow-hidden rounded-2xl border border-white/8 bg-[#111118]">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 px-6 py-4">
                <div>
                  <p className="text-base font-semibold text-white/85">{room.room_number}</p>
                  <p className="text-xs text-white/40">{room.floor_label}</p>
                  <p className="text-xs text-white/35">{room.department} • Capacity {room.capacity ?? '--'}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/50">{room.instructors.length} instructors</span>
                  <button type="button" onClick={() => openAddInstructorModal(room)} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:border-amber-500/30 hover:text-amber-300">+ Add Instructor</button>
                </div>
              </header>

              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full">
                  <thead className="bg-[#0D0D14]">
                    <tr className="text-left text-xs uppercase tracking-wider text-white/25">
                      <th className="px-6 py-3 font-medium">Instructor</th>
                      <th className="px-6 py-3 font-medium">Reporting Time</th>
                      <th className="px-6 py-3 font-medium">Arrival</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(room.instructors ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center">
                          <Users className="mx-auto h-8 w-8 text-white/10" />
                          <p className="mt-2 text-xs text-white/30">No instructors assigned</p>
                          <button type="button" onClick={() => openAddInstructorModal(room)} className="mt-1 text-xs text-amber-400">+ Add Instructor</button>
                        </td>
                      </tr>
                    ) : (
                      (room.instructors ?? []).map((row) => {
                        const isFlashing = row.duty_id && flashIds.has(row.duty_id);
                        return (
                          <tr key={row.exam_room_instructor_id} className={`group border-b border-white/4 transition-colors hover:bg-white/3 ${isFlashing ? 'bg-amber-500/5' : ''}`}>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-3">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-xs text-amber-400">{initials(row.name)}</span>
                                <div>
                                  <p className="text-sm text-white/80">{row.name}</p>
                                  <p className="text-xs text-white/35">{row.department}</p>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-3.5 text-sm text-white/55">
                              <Clock3 className="mr-1 inline h-3 w-3" />
                              {row.reporting_time ? String(row.reporting_time).slice(0, 5) : '--'}
                            </td>

                            <td className="px-6 py-3.5 text-sm text-white/65">{row.arrival_time ? String(row.arrival_time).slice(0, 5) : <span className="text-white/25">—</span>}</td>

                            <td className="px-6 py-3.5">
                              <span className={`rounded-full border px-2 py-0.5 text-xs ${statusPillClasses(row.duty_status)}`}>{row.duty_status}</span>
                            </td>

                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                {row.duty_status === 'pending' ? (
                                  <button
                                    type="button"
                                    title="Cancel this duty"
                                    className="rounded-lg p-1.5 text-white/25 hover:bg-red-500/10 hover:text-red-400"
                                    onClick={async () => {
                                      const result = await cancelDuty(row.duty_id);
                                      if (result.error) addToast({ type: 'error', message: result.error });
                                    }}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                ) : null}

                                {row.duty_status === 'cancelled' ? (
                                  <button
                                    type="button"
                                    title="Restore duty"
                                    className="rounded-lg p-1.5 text-white/25 hover:text-amber-400"
                                    onClick={async () => {
                                      const result = await restoreDuty(row.duty_id);
                                      if (result.error) addToast({ type: 'error', message: result.error });
                                    }}
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </button>
                                ) : null}

                                <button
                                  type="button"
                                  title="Remove instructor from exam"
                                  className="rounded-lg p-1.5 text-white/25 hover:bg-red-500/10 hover:text-red-400"
                                  onClick={async () => {
                                    const result = await removeInstructorFromExam(row.exam_room_instructor_id, row.duty_id);
                                    if (result.error) addToast({ type: 'error', message: result.error });
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/6 bg-[#0A0A0F] px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 text-xs text-white/25">
            <span>Last updated {formatDistanceToNowStrict(lastUpdatedAt, { addSuffix: true })}</span>
            <button type="button" onClick={() => refetch()} className="rounded-lg border border-white/10 p-1.5 text-white/45 hover:text-white/75">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <span className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${isLive ? 'animate-pulse bg-green-400' : 'bg-white/20'}`} />
              Live
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const result = exportExamCSV(examDetail);
                addToast({ type: 'success', message: `Exported ${result.rowCount} duties as CSV` });
              }}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60 hover:border-white/20 hover:text-white/80"
            >
              <Download className="mr-1 inline h-3.5 w-3.5" />Export CSV
            </button>

            <button type="button" onClick={() => setIsDeleteOpen(true)} className="rounded-xl border border-red-500/20 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10">
              <Trash2 className="mr-1 inline h-3.5 w-3.5" />Delete Exam
            </button>
          </div>
        </div>
      </footer>

      <Dialog open={addModalState.open} onOpenChange={(value) => setAddModalState((previous) => ({ ...previous, open: value }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Instructor to {addModalState.roomLabel}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 px-6 py-4">
            <input
              className="app-input"
              placeholder="Search by name or department..."
              value={searchInstructor}
              onChange={(event) => setSearchInstructor(event.target.value)}
            />

            <div className="max-h-80 space-y-2 overflow-y-auto">
              {loadingInstructors ? <p className="text-center text-xs text-white/35">Loading instructors...</p> : null}
              {availableInstructors.map((instructor) => {
                const assignedInRoom = instructorInExamMap.get(instructor.instructor_id);
                const inOtherRoom = assignedInRoom && assignedInRoom !== selectedRoom?.room_number;

                return (
                  <div key={instructor.instructor_id} className="flex cursor-pointer items-center gap-3 rounded-xl p-2.5 hover:bg-white/5">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-xs text-amber-400">{initials(instructor.name)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white/80">{instructor.name}</p>
                      <p className="text-xs text-white/35">{instructor.department}</p>
                    </div>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/45">{instructor.total_duties ?? 0} duties</span>
                    {inOtherRoom ? <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">In this exam</span> : null}
                    <button
                      type="button"
                      onClick={() => handleAddInstructor(instructor)}
                      disabled={busyInstructorId === instructor.instructor_id}
                      className="rounded-lg p-1.5 text-amber-400 hover:bg-amber-500/10 disabled:opacity-60"
                    >
                      {busyInstructorId === instructor.instructor_id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </button>
                  </div>
                );
              })}

              {!loadingInstructors && availableInstructors.length === 0 ? <p className="text-center text-xs text-white/35">No instructors available.</p> : null}
            </div>
          </div>

          <DialogFooter>
            <button type="button" onClick={() => setAddModalState({ open: false, roomId: null, roomLabel: '' })} className="rounded-xl border border-white/10 px-4 py-2 text-xs text-white/55">Done</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => !deleting && setIsDeleteOpen(false)}
        onConfirm={handleDeleteExam}
        message={deleting ? 'Deleting exam...' : 'Are you sure you want to delete this exam and all associated duties?'}
      />
    </div>
  );
}
