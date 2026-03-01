import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarX, Check, ClipboardList, Copy, DoorOpen, Eye, GraduationCap, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useExamManagement } from '../../lib/hooks/useExamManagement';
import { useToast } from '../../components/shared/Toast';
import ExamWizard from '../../components/admin/ExamWizard';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';

const STATUS_OPTIONS = ['upcoming', 'ongoing', 'completed'];

function statusBadgeClasses(status) {
  if (status === 'ongoing') return 'border-blue-500/25 bg-blue-500/10 text-blue-300';
  if (status === 'completed') return 'border-green-500/25 bg-green-500/10 text-green-300';
  return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
}

export default function ExamManagement({ embedded = false, onCreateExamClick }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const examMgmt = useExamManagement();
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [highlightNewest, setHighlightNewest] = useState(false);

  useEffect(() => {
    examMgmt.fetchAllExams();
  }, [examMgmt.fetchAllExams]);

  const exams = useMemo(() => {
    return (examMgmt.exams ?? []).filter((exam) => {
      if (statusFilter !== 'all' && exam.status !== statusFilter) return false;
      if (departmentFilter !== 'all' && exam.department !== departmentFilter) return false;
      if (monthFilter !== 'all') {
        const month = String(new Date(exam.exam_date).getMonth() + 1).padStart(2, '0');
        if (month !== monthFilter) return false;
      }
      if (search.trim() && !String(exam.subject ?? '').toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  }, [examMgmt.exams, statusFilter, departmentFilter, monthFilter, search]);

  const removeExam = async (id) => {
    const result = await examMgmt.deleteExam(id);
    if (result.error) {
      addToast({ type: 'error', message: result.error });
      return;
    }
    addToast({ type: 'success', message: 'Exam deleted' });
  };

  const openWizard = () => {
    if (typeof onCreateExamClick === 'function') {
      onCreateExamClick();
      return;
    }
    setWizardOpen(true);
  };

  return (
    <div className={embedded ? 'space-y-4' : 'mx-auto w-full max-w-7xl px-4 py-6 sm:px-6'}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          {!embedded ? (
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard?tab=overview')}
              className="mb-2 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-white/20 hover:text-white/85"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          ) : null}
          <h1 className="text-2xl text-white/90">Exams</h1>
          <p className="mt-1 text-sm text-white/35">{exams.length} total exams</p>
        </div>
        <button type="button" onClick={openWizard} className="btn-press rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black">
          Create Exam + Duties
        </button>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {['all', 'upcoming', 'ongoing', 'completed'].map((status) => (
          <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`rounded-full border px-3 py-1.5 text-xs transition-all ${statusFilter === status ? 'border-amber-500/30 bg-amber-500/8 text-amber-400' : 'border-white/8 text-white/40 hover:border-white/15 hover:text-white/60'}`}>
            {status === 'all' ? 'All' : status[0].toUpperCase() + status.slice(1)}
          </button>
        ))}

        <select className="app-input w-44" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
          <option value="all">All Departments</option>
          {[...new Set((examMgmt.exams ?? []).map((e) => e.department).filter(Boolean))].map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>

        <select className="app-input w-36" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
          <option value="all">All Months</option>
          {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        <input className="app-input w-56" placeholder="Search by subject" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {examMgmt.loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="skeleton h-52" />
          <div className="skeleton h-52" />
        </div>
      ) : null}

      {!examMgmt.loading && exams.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-[#111118] py-16 text-center">
          <CalendarX className="mx-auto h-12 w-12 text-white/10" />
          <p className="mt-3 text-sm text-white/30">No exams yet</p>
          <p className="mt-1 text-xs text-white/20">Create Exam + Duties to get started</p>
          <button type="button" className="btn-press mt-4 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black" onClick={openWizard}>
            Create Exam + Duties
          </button>
        </div>
      ) : null}

      {!examMgmt.loading && exams.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {exams.map((exam, index) => {
            const roomCount = exam.exam_rooms?.length ?? 0;
            const instructorCount = (exam.exam_rooms ?? []).reduce((sum, room) => sum + (room.exam_room_instructors?.length ?? 0), 0);
            const capacity = (exam.exam_rooms ?? []).reduce((sum, room) => sum + Number(room.rooms?.capacity ?? 0), 0);
            const totalDuties = exam.duties?.length ?? 0;
            const completedDuties = (exam.duties ?? []).filter((duty) => duty.status === 'on-time' || duty.status === 'late').length;
            const completionRate = totalDuties > 0 ? Math.round((completedDuties / totalDuties) * 100) : 0;
            return (
              <article
                key={exam.id}
                className={`group cursor-pointer rounded-2xl border border-white/8 bg-[#111118] p-6 transition-all duration-200 hover:-translate-y-[1px] hover:border-white/14 ${highlightNewest && index === 0 ? 'fade-up' : ''}`}
                onClick={() => navigate(`/admin/exams/${exam.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base text-white/90">{exam.subject}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={`rounded-full border px-2 py-0.5 text-[11px] capitalize ${statusBadgeClasses(exam.status || 'upcoming')}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {exam.status || 'upcoming'}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36 border-white/10 bg-[#111118] text-white/75">
                      {STATUS_OPTIONS.map((status) => (
                        <DropdownMenuItem
                          key={status}
                          className="cursor-pointer capitalize focus:bg-white/10"
                          onClick={async (event) => {
                            event.stopPropagation();
                            const result = await examMgmt.updateExam(exam.id, { status });
                            if (result.error) addToast({ type: 'error', message: result.error });
                            else addToast({ type: 'success', message: 'Exam status updated.' });
                          }}
                        >
                          {exam.status === status ? <Check className="mr-1 h-3.5 w-3.5 text-amber-400" /> : <span className="mr-1 h-3.5 w-3.5" />}
                          {status}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="mt-2 text-xs text-white/40">{exam.exam_date ? `${format(new Date(`${exam.exam_date}T00:00:00`), 'dd MMM yyyy, EEEE')}` : '--'}</p>
                <p className="mt-1 text-xs text-white/40">{exam.department || '--'} • {exam.start_time?.slice(0, 5)} - {exam.end_time?.slice(0, 5)}</p>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border border-white/8 bg-white/4 px-2 py-2">
                    <p className="text-sm text-white/80">{roomCount}</p>
                    <p className="text-[11px] text-white/35">Rooms</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/4 px-2 py-2">
                    <p className="text-sm text-white/80">{instructorCount}</p>
                    <p className="text-[11px] text-white/35">Instructors</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/4 px-2 py-2">
                    <p className="text-sm text-white/80">{capacity}</p>
                    <p className="text-[11px] text-white/35">Capacity</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-white/5 pt-3 text-xs text-white/45">
                  <span className="inline-flex items-center gap-1.5"><DoorOpen className="h-3.5 w-3.5" />{roomCount} Rooms</span>
                  <span className="inline-flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5" />{totalDuties} Duties</span>
                  <span className={`rounded-full px-2 py-0.5 ${completionRate === 100 ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>{completionRate}% complete</span>
                </div>

                <div className="mt-4 flex items-center gap-2 opacity-100 transition-all duration-200 md:opacity-0 md:group-hover:opacity-100">
                  <button type="button" className="app-btn-ghost px-3 py-1.5 text-xs" onClick={(event) => { event.stopPropagation(); navigate(`/admin/exams/${exam.id}`); }}><Eye className="h-3.5 w-3.5" />View</button>
                  <button type="button" className="app-btn-ghost px-3 py-1.5 text-xs" onClick={(event) => { event.stopPropagation(); navigate(`/admin/exams/${exam.id}`); }}><Pencil className="h-3.5 w-3.5" />Edit</button>
                  <button type="button" className="app-btn-ghost px-3 py-1.5 text-xs" onClick={(event) => { event.stopPropagation(); addToast({ type: 'info', message: 'Duplicate opens wizard. Pick a new date.' }); openWizard(); }}><Copy className="h-3.5 w-3.5" />Duplicate</button>
                  <button type="button" className="app-btn-danger px-3 py-1.5 text-xs" onClick={(event) => { event.stopPropagation(); removeExam(exam.id); }}><Trash2 className="h-3.5 w-3.5" />Delete</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      <ExamWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreated={() => {
          setWizardOpen(false);
          examMgmt.fetchAllExams();
          setHighlightNewest(true);
          window.setTimeout(() => setHighlightNewest(false), 700);
        }}
      />
    </div>
  );
}
