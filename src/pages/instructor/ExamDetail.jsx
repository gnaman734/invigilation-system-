import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, Building2, Calendar, CheckCircle2, ChevronLeft, Clock3, FileText, MapPin, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDuties } from '../../lib/hooks/useDuties';
import { formatTimeDisplay, getDeadline, getMinutesLate, getStatus } from '../../lib/utils/punctuality';
import { useToast } from '../../components/shared/Toast';

function ExamDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="skeleton h-8 w-40" />
      <div className="skeleton mt-3 h-44" />
      <div className="skeleton mt-4 h-52" />
      <div className="skeleton mt-4 h-44" />
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status ?? 'pending').toLowerCase();

  if (normalized === 'on-time') {
    return <span className="inline-flex rounded-full border border-green-500/20 bg-green-500/8 px-2 py-0.5 text-xs font-medium text-green-400/80">On Time</span>;
  }

  if (normalized === 'late') {
    return <span className="inline-flex rounded-full border border-red-500/20 bg-red-500/8 px-2 py-0.5 text-xs font-medium text-red-400/80">Late</span>;
  }

  if (normalized === 'cancelled') {
    return <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-medium text-white/30">Cancelled</span>;
  }

  return <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/8 px-2 py-0.5 text-xs font-medium text-amber-400/80">Pending</span>;
}

export default function InstructorExamDetail() {
  const { dutyId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { fetchDutyWithExamContext, markArrival, processingDutyIds } = useDuties();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);

  const load = async () => {
    if (!dutyId) {
      setError('Invalid duty selected.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    const startedAt = Date.now();

    const result = await fetchDutyWithExamContext(dutyId);
    const elapsed = Date.now() - startedAt;
    const wait = Math.max(0, 400 - elapsed);

    window.setTimeout(() => {
      if (result.error) {
        setError(result.error);
        setDetail(null);
      } else {
        setDetail(result.data ?? null);
      }
      setLoading(false);
    }, wait);
  };

  useEffect(() => {
    load();
  }, [dutyId]);

  const handleMarkArrival = async () => {
    if (!detail?.duty_id) return;

    const now = new Date();
    const arrival = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const result = await markArrival(detail.duty_id, arrival);

    if (result.error) {
      addToast({ type: 'error', message: 'Failed to mark arrival' });
      return;
    }

    addToast({ type: 'success', message: 'Arrival marked successfully.' });
    load();
  };

  if (loading) {
    return <ExamDetailSkeleton />;
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">Could not load exam details</p>
        <button type="button" className="mt-3 rounded-xl border border-white/10 px-4 py-2 text-xs text-white/40" onClick={load}>Retry</button>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <p className="rounded-xl border border-white/8 bg-[#111118] px-4 py-3 text-sm text-white/40">No exam detail available.</p>
      </div>
    );
  }

  const status = String(detail.status ?? 'pending').toLowerCase();
  const startTime = detail.start_time ? String(detail.start_time).slice(0, 5) : null;
  const endTime = detail.end_time ? String(detail.end_time).slice(0, 5) : null;
  const hasSlot = Boolean(startTime && endTime);
  const deadline = getDeadline(detail.reporting_time);
  const lateMinutes = detail.arrival_time ? getMinutesLate(detail.reporting_time, detail.arrival_time) : 0;
  const predicted = detail.arrival_time ? getStatus(detail.reporting_time, detail.arrival_time) : status;

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <button type="button" className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white/70" onClick={() => navigate('/instructor/dashboard')}>
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <section className="mt-3 rounded-2xl border border-amber-500/15 bg-gradient-to-r from-amber-500/8 to-transparent p-6">
          <h1 className="font-serif text-2xl text-white/90">{detail.subject || 'Exam'}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/45">{detail.exam_department || '--'}</span>
            <StatusBadge status={status} />
          </div>
          <p className="mt-2 text-xs text-white/45"><Calendar className="mr-1 inline h-3.5 w-3.5" />{detail.exam_date ? format(parseISO(detail.exam_date), 'EEE, dd MMM yyyy') : '--'}</p>
          <p className="text-xs text-white/45"><Clock3 className="mr-1 inline h-3.5 w-3.5" />{hasSlot ? `${startTime} — ${endTime}` : <span className="text-white/30">Time not set</span>}</p>
          {detail.notes ? <p className="mt-2 text-xs italic text-white/40">{detail.notes}</p> : null}
        </section>

        <section className="mt-4 rounded-2xl border border-white/8 bg-[#111118] p-5">
          <p className="mb-4 text-xs uppercase tracking-wider text-white/25">Your Assignment</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-white/30">Room</p>
              <p className="mt-0.5 text-lg font-semibold text-white/85"><MapPin className="mr-1 inline h-4 w-4 text-white/25" />{detail.room_number || '--'}</p>
              <p className="text-xs text-white/35">{detail.floor_label || detail.building || '--'}</p>
            </div>
            <div>
              <p className="text-xs text-white/30">Reporting time</p>
              <p className="mt-0.5 text-base text-amber-400">{formatTimeDisplay(detail.reporting_time)}</p>
              <p className="text-xs text-white/35">Deadline: {formatTimeDisplay(deadline)}</p>
            </div>
          </div>

          {status === 'pending' ? (
            <button
              type="button"
              disabled={processingDutyIds.includes(detail.duty_id)}
              onClick={handleMarkArrival}
              className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-black disabled:opacity-60"
            >
              {processingDutyIds.includes(detail.duty_id) ? 'Marking...' : 'Mark Arrival'}
            </button>
          ) : null}

          {predicted === 'on-time' && detail.arrival_time ? (
            <div className="mt-4 rounded-xl border border-green-500/15 bg-green-500/8 p-3 text-sm text-green-400">
              <CheckCircle2 className="mr-1 inline h-4 w-4" />Marked on time at {formatTimeDisplay(detail.arrival_time)}
            </div>
          ) : null}

          {predicted === 'late' && detail.arrival_time ? (
            <div className="mt-4 rounded-xl border border-red-500/15 bg-red-500/8 p-3 text-sm text-red-400">
              <AlertTriangle className="mr-1 inline h-4 w-4" />Marked late at {formatTimeDisplay(detail.arrival_time)}
              <p className="mt-1 text-xs text-red-400/70">{lateMinutes} minutes after deadline</p>
            </div>
          ) : null}
        </section>

        <section className="mt-4 rounded-2xl border border-white/8 bg-[#111118] p-5">
          <p className="mb-3 text-xs uppercase tracking-wider text-white/25">Also in this room</p>
          {(detail.other_instructors ?? []).length === 0 ? (
            <p className="text-xs text-white/30">You are the only invigilator</p>
          ) : (
            <div className="space-y-2">
              {(detail.other_instructors ?? []).map((row) => (
                <div key={row.instructor_id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 p-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-[10px] text-amber-400">
                    {String(row?.name || 'I').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm text-white/75">{row.name}</p>
                    <p className="text-xs text-white/35">{row.department || '--'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {detail.notes ? (
          <section className="mt-4 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
            <p className="text-sm italic text-white/55"><FileText className="mr-1 inline h-4 w-4 text-amber-400" />{detail.notes}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
