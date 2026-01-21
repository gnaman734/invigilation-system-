import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarX,
  ChevronDown,
  ClipboardList,
  Filter,
} from 'lucide-react';
import { format, isSameMonth, parseISO, subMonths } from 'date-fns';
import DutyCard from '../../components/instructor/DutyCard';
import { useDuties } from '../../lib/hooks/useDuties';
import { useInstructors } from '../../lib/hooks/useInstructors';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/shared/Toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { formatTimeDisplay, getDeadline, getMinutesLate, getStatus } from '../../lib/utils/punctuality';
import { sanitizeText } from '../../lib/utils/sanitize';

function flattenDutyGroups(groups = []) {
  return groups.flatMap((group) => group.duties ?? []);
}

function isDateInMonth(value, monthDate) {
  if (!value) {
    return false;
  }

  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return isSameMonth(parsed, monthDate);
}

function formatClockTime(dateValue) {
  const hours = String(dateValue.getHours()).padStart(2, '0');
  const minutes = String(dateValue.getMinutes()).padStart(2, '0');
  const seconds = String(dateValue.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function buildDeadlineDate(duty) {
  const deadlineTime = getDeadline(duty.reporting_time);
  if (!deadlineTime || !duty.exam_date) {
    return null;
  }

  const parsed = new Date(`${duty.exam_date}T${deadlineTime}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function DutyCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#111118] p-5">
      <div className="skeleton h-4 w-40" />
      <div className="skeleton mt-2 h-3 w-52" />
      <div className="mt-4 h-px bg-white/5" />
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="skeleton h-10" />
        <div className="skeleton h-10" />
        <div className="skeleton h-10" />
      </div>
      <div className="skeleton mt-4 h-9" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="rounded-2xl border border-white/8 bg-[#111118] p-6">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton mt-2 h-8 w-48" />
        <div className="skeleton mt-3 h-6 w-36" />
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="skeleton h-16" />
          <div className="skeleton h-16" />
          <div className="skeleton h-16" />
        </div>
      </div>
      <div className="mt-8 space-y-3">
        <DutyCardSkeleton />
        <DutyCardSkeleton />
        <DutyCardSkeleton />
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="py-16 text-center">
      <Icon className="mx-auto h-10 w-10 text-white/10" />
      <p className="mt-3 text-sm text-white/30">{title}</p>
      <p className="mt-1 text-xs text-white/20">{subtitle}</p>
    </div>
  );
}

const FILTER_OPTIONS = ['All', 'This Month', 'Last Month', 'On Time', 'Late', 'Pending'];

export default function InstructorDashboard() {
  const { addToast } = useToast();
  const user = useAuthStore((state) => state.user);
  const { upcomingDuties, pastDuties, loading, error, markArrival, processingDutyIds } = useDuties();
  const { instructor, stats, punctualityPercentage, loading: profileLoading } = useInstructors();

  const [isPastOpen, setIsPastOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedDuty, setSelectedDuty] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [liveNow, setLiveNow] = useState(new Date());
  const [submittingArrival, setSubmittingArrival] = useState(false);
  const [arrivalError, setArrivalError] = useState('');
  const [highlightedDutyId, setHighlightedDutyId] = useState(null);

  const name = sanitizeText(instructor?.name ?? user?.user_metadata?.name ?? user?.email ?? 'Instructor');
  const department = sanitizeText(instructor?.department ?? user?.user_metadata?.department ?? 'Department');

  const upcomingFlat = useMemo(() => flattenDutyGroups(upcomingDuties), [upcomingDuties]);
  const pastFlat = useMemo(() => flattenDutyGroups(pastDuties), [pastDuties]);
  const allDuties = useMemo(() => [...upcomingFlat, ...pastFlat], [upcomingFlat, pastFlat]);

  const upcomingCount = upcomingFlat.length;
  const totalDuties = Number(stats.total_duties ?? 0);
  const onTime = Number(stats.on_time_arrivals ?? 0);

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase();
    const thisMonth = new Date();
    const lastMonth = subMonths(new Date(), 1);

    return allDuties.filter((duty) => {
      if (activeFilter === 'This Month' && !isDateInMonth(duty.exam_date, thisMonth)) {
        return false;
      }

      if (activeFilter === 'Last Month' && !isDateInMonth(duty.exam_date, lastMonth)) {
        return false;
      }

      if (activeFilter === 'On Time' && duty.status !== 'on-time') {
        return false;
      }

      if (activeFilter === 'Late' && duty.status !== 'late') {
        return false;
      }

      if (activeFilter === 'Pending' && duty.status !== 'pending') {
        return false;
      }

      if (query && !String(duty.subject ?? '').toLowerCase().includes(query)) {
        return false;
      }

      return true;
    });
  }, [activeFilter, allDuties, search]);

  useEffect(() => {
    if (!modalOpen) {
      return undefined;
    }

    const timer = window.setInterval(() => setLiveNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [modalOpen]);

  useEffect(() => {
    const handleJump = (event) => {
      const dutyId = event.detail?.dutyId;
      if (!dutyId) {
        return;
      }

      setHighlightedDutyId(dutyId);
      const target = document.getElementById(`duty-${dutyId}`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      window.setTimeout(() => setHighlightedDutyId(null), 2000);
    };

    window.addEventListener('instructor:jump-to-duty', handleJump);
    return () => window.removeEventListener('instructor:jump-to-duty', handleJump);
  }, []);

  const openMarkArrivalModal = (duty) => {
    setArrivalError('');
    setSelectedDuty(duty);
    setLiveNow(new Date());
    setModalOpen(true);
  };

  const closeMarkArrivalModal = () => {
    if (submittingArrival) {
      return;
    }

    setModalOpen(false);
    setSelectedDuty(null);
    setArrivalError('');
  };

  const handleConfirmArrival = async () => {
    if (!selectedDuty) {
      return;
    }

    setSubmittingArrival(true);
    setArrivalError('');

    const arrivalRaw = formatClockTime(new Date());
    const result = await markArrival(selectedDuty.duty_id, arrivalRaw);

    if (result?.error) {
      setArrivalError('Failed to mark arrival. Try again.');
      setSubmittingArrival(false);
      return;
    }

    const predictedStatus = getStatus(selectedDuty.reporting_time, arrivalRaw);
    const lateMinutes = getMinutesLate(selectedDuty.reporting_time, arrivalRaw);

    if (predictedStatus === 'on-time') {
      addToast({ type: 'success', message: 'Marked on time' });
    } else {
      addToast({ type: 'warning', message: `Marked late — ${lateMinutes} mins after deadline` });
    }

    setSubmittingArrival(false);
    setModalOpen(false);
    setSelectedDuty(null);
  };

  const modalDeadline = selectedDuty ? buildDeadlineDate(selectedDuty) : null;
  const minutesToDeadline = modalDeadline ? Math.round((modalDeadline.getTime() - liveNow.getTime()) / 60000) : 0;
  const isLatePreview = Boolean(modalDeadline) && minutesToDeadline < 0;

  const clockClass = isLatePreview
    ? 'text-red-400'
    : minutesToDeadline <= 5
      ? 'text-amber-400'
      : 'text-green-400';

  if (loading || profileLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <section className="card-interactive rounded-2xl border border-white/8 bg-[#111118] p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/35">Good morning,</p>
              <h1 className="mt-0.5 text-2xl text-white/90">{name}</h1>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-white/40">
                <Building2 className="h-3 w-3" />
                {department}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-3">
              <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-center transition-all duration-200 hover:border-white/12 hover:bg-white/6">
                <p className="text-xl font-bold text-white/85">{totalDuties}</p>
                <p className="mt-0.5 text-xs text-white/30">Total Duties</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-center transition-all duration-200 hover:border-white/12 hover:bg-white/6">
                <p className="text-xl font-bold text-green-400">{onTime}</p>
                <p className="mt-0.5 text-xs text-white/30">On Time</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-center transition-all duration-200 hover:border-white/12 hover:bg-white/6">
                <p className="text-xl font-bold text-amber-400">{punctualityPercentage}%</p>
                <p className="mt-0.5 text-xs text-white/30">Punctuality %</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white/60">Upcoming Duties</h2>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
              {upcomingCount}
            </span>
          </div>

          {upcomingDuties.length === 0 ? (
            <EmptyState icon={CalendarX} title="No upcoming duties" subtitle="You'll be notified when assigned" />
          ) : (
            upcomingDuties.map((group) => (
              <div key={group.dateKey} className="mt-6">
                <div className="mb-3 mt-6 flex items-center gap-3">
                  <p className="text-xs font-medium uppercase tracking-widest text-white/25">{group.dateLabel}</p>
                  <div className="h-px flex-1 bg-white/5" />
                </div>

                <div>
                  {(group.duties ?? []).map((duty) => (
                    <DutyCard
                      key={duty.duty_id}
                      duty={duty}
                      onOpenMarkArrival={openMarkArrivalModal}
                      isProcessing={processingDutyIds.includes(duty.duty_id)}
                      highlight={highlightedDutyId === duty.duty_id}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

        <section className="mt-8">
          <button
            type="button"
            onClick={() => setIsPastOpen((previous) => !previous)}
            className="btn-press flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#111118] px-4 py-3 text-left transition-all duration-200 hover:border-white/14"
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium text-white/60">
              Past Duties
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/35">{pastFlat.length}</span>
            </span>
            <ChevronDown className={`h-4 w-4 text-white/35 transition-all duration-200 ${isPastOpen ? 'rotate-180' : ''}`} />
          </button>

          <div className={`overflow-hidden transition-all duration-200 ${isPastOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            {pastDuties.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No duty history yet" subtitle="Past duties will appear here" />
            ) : (
              <div>
                {pastDuties.map((group) => (
                  <div key={group.dateKey} className="mt-6">
                    <div className="mb-3 mt-6 flex items-center gap-3">
                      <p className="text-xs font-medium uppercase tracking-widest text-white/25">{group.dateLabel}</p>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>

                    <div>
                      {(group.duties ?? []).map((duty) => (
                        <DutyCard key={duty.duty_id} duty={duty} isPast highlight={highlightedDutyId === duty.duty_id} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-8">
          <h3 className="mb-4 text-sm font-medium text-white/60">Duty History with Filters</h3>

          <div className="mb-4 flex flex-wrap items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setActiveFilter(option)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-all duration-200 ${
                  activeFilter === option
                    ? 'border-amber-500/30 bg-amber-500/8 text-amber-400'
                    : 'border-white/8 text-white/40 hover:border-white/15 hover:text-white/60'
                }`}
              >
                {option}
              </button>
            ))}

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search subject"
              className="w-48 rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-xs text-white/60 outline-none transition-all duration-200 placeholder:text-white/20 focus:border-white/15"
            />

            <p className="ml-auto text-xs text-white/25">Showing {filteredHistory.length} duties</p>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-[#111118] py-12 text-center">
              <Filter className="mx-auto h-8 w-8 text-white/10" />
              <p className="mt-2 text-sm text-white/30">No duties match your filters</p>
            </div>
          ) : (
            <div key={`${activeFilter}-${search}`} className="fade-up">
              {filteredHistory.map((duty) => (
                <DutyCard
                  key={`history-${duty.duty_id}`}
                  duty={duty}
                  isPast={duty.status !== 'pending'}
                  onOpenMarkArrival={duty.status === 'pending' ? openMarkArrivalModal : undefined}
                  isProcessing={processingDutyIds.includes(duty.duty_id)}
                  highlight={highlightedDutyId === duty.duty_id}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog open={modalOpen} onOpenChange={closeMarkArrivalModal}>
        <DialogContent className="origin-bottom sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mark Arrival</DialogTitle>
          </DialogHeader>

          {selectedDuty ? (
            <div className="space-y-3 px-6 py-5">
              <p className="text-sm text-white/75">{sanitizeText(selectedDuty.subject)}</p>
              <p className="text-xs text-white/35">Reporting time: {formatTimeDisplay(selectedDuty.reporting_time)}</p>
              <p className="text-xs text-white/35">Deadline: {formatTimeDisplay(getDeadline(selectedDuty.reporting_time))}</p>

              <div className={`my-6 text-center font-semibold ${clockClass}`}>
                <p className="text-3xl">{format(liveNow, 'hh:mm:ss a')}</p>
                {!isLatePreview && modalDeadline ? <p className="mt-2 text-xs text-white/35">{minutesToDeadline} minutes remaining</p> : null}
              </div>

              {!isLatePreview ? (
                <div className="rounded-xl border border-green-500/15 bg-green-500/8 p-3 text-center">
                  <p className="text-sm text-green-400">You will be marked ON TIME</p>
                </div>
              ) : (
                <div className="rounded-xl border border-red-500/15 bg-red-500/8 p-3 text-center">
                  <p className="text-sm text-red-400">You will be marked LATE</p>
                  <p className="mt-1 text-xs text-red-400/60">{Math.abs(minutesToDeadline)} minutes after deadline</p>
                </div>
              )}

              {arrivalError ? <p className="text-center text-xs text-red-400">Failed to mark arrival. Try again.</p> : null}
            </div>
          ) : null}

          <DialogFooter>
            <button
              type="button"
              onClick={closeMarkArrivalModal}
              className="btn-press rounded-xl border border-white/8 px-4 py-2 text-xs text-white/45 transition-all duration-200 hover:border-white/15 hover:text-white/65"
              disabled={submittingArrival}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmArrival}
              disabled={submittingArrival}
              className="btn-press inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-[#0A0A0F] transition-all duration-200 hover:bg-amber-400 disabled:opacity-70"
            >
              {submittingArrival ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/30 border-t-black" /> : null}
              {submittingArrival ? 'Marking...' : 'Confirm Arrival'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
