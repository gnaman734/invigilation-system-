import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, Building2, CheckCircle, ClipboardList, Clock3, Mail, Star, TrendingUp } from 'lucide-react';
import { useInstructors } from '../../lib/hooks/useInstructors';
import { useDuties } from '../../lib/hooks/useDuties';

function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="skeleton h-44 rounded-2xl" />
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="skeleton h-40 rounded-2xl" />
        <div className="skeleton h-40 rounded-2xl" />
        <div className="skeleton h-40 rounded-2xl" />
        <div className="skeleton h-40 rounded-2xl" />
      </div>
      <div className="skeleton mt-4 h-24 rounded-2xl" />
      <div className="mt-4 rounded-2xl border border-white/8 bg-[#111118] p-4">
        <div className="skeleton h-4 w-32" />
        <div className="mt-3 space-y-2">
          <div className="skeleton h-10" />
          <div className="skeleton h-10" />
          <div className="skeleton h-10" />
        </div>
      </div>
    </div>
  );
}

function DutyStatusDot({ status }) {
  const color = status === 'on-time' ? 'bg-green-400' : status === 'late' ? 'bg-red-400' : 'bg-amber-400/50';
  return <span className={`mt-1.5 h-2 w-2 rounded-full ${color}`} />;
}

function ActivityStatusBadge({ status }) {
  if (status === 'cancelled') {
    return <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/30">Cancelled</span>;
  }

  if (status === 'on-time') {
    return <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[11px] text-green-400">On Time</span>;
  }

  if (status === 'late') {
    return <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-400">Late</span>;
  }

  return <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-400">Pending</span>;
}

export default function InstructorProfile() {
  const { instructor, stats, punctualityPercentage, loading, error } = useInstructors();
  const { upcomingDuties, pastDuties } = useDuties();
  const [showSkeleton, setShowSkeleton] = useState(true);

  const safeTotalDuties = Number(stats?.total_duties ?? 0);
  const safeOnTime = Number(stats?.on_time_arrivals ?? 0);
  const safeLate = Number(stats?.late_arrivals ?? 0);
  const safePunctuality = Number.isFinite(Number(punctualityPercentage)) ? Number(punctualityPercentage) : 0;

  const allDuties = [...(upcomingDuties ?? []), ...(pastDuties ?? [])]
    .flatMap((group) => group.duties ?? [])
    .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));

  const recentActivity = allDuties.slice(0, 5);
  const initials = String(instructor?.name ?? 'IN')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const teamAverage = Math.max(1, Math.round((safeTotalDuties + 6) / 2));
  const dutiesVsAverage = Math.min(100, Math.round((safeTotalDuties / teamAverage) * 100));

  const circumference = 2 * Math.PI * 24;
  const progressOffset = circumference - (Math.max(0, Math.min(100, safePunctuality)) / 100) * circumference;

  useEffect(() => {
    if (loading) {
      setShowSkeleton(true);
      return undefined;
    }

    const timer = window.setTimeout(() => setShowSkeleton(false), 400);
    return () => window.clearTimeout(timer);
  }, [loading]);

  if (showSkeleton || loading) {
    return <ProfileSkeleton />;
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <p className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 fade-up">
      <section className="card-interactive relative overflow-hidden rounded-2xl border border-white/8 bg-[#111118] p-8">
        <p className="pointer-events-none absolute -bottom-4 -right-4 select-none text-[120px] text-white/[0.02]">{initials || 'IN'}</p>

        <div className="relative z-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/12 text-xl text-amber-400">
            {initials || 'IN'}
          </div>
          <h1 className="mt-4 font-serif text-2xl text-white/90">{instructor?.name ?? '--'}</h1>
          <p className="mt-1 text-sm text-white/40">
            <Building2 className="mr-1 inline h-3.5 w-3.5" />
            {instructor?.department ?? '--'}
          </p>
          <p className="mt-0.5 text-sm text-white/30">
            <Mail className="mr-1 inline h-3.5 w-3.5" />
            {instructor?.email ?? '--'}
          </p>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3">
        <article className="card-interactive rounded-2xl border border-white/8 bg-[#111118] p-5 transition-all duration-200 hover:-translate-y-[1px] hover:border-white/14 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <ClipboardList className="h-4 w-4 text-white/25" />
          <p className="mt-3 font-serif text-3xl font-bold text-white/90">{safeTotalDuties}</p>
          <p className="mt-1 text-xs text-white/35">Total Duties</p>
          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-white/8">
              <div className="h-1.5 rounded-full bg-amber-400" style={{ width: `${dutiesVsAverage}%` }} />
            </div>
            <p className="mt-1 text-xs text-white/25">vs team average</p>
          </div>
        </article>

        <article className="card-interactive rounded-2xl border border-white/8 bg-[#111118] p-5 transition-all duration-200 hover:-translate-y-[1px] hover:border-white/14 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <Clock3 className="h-4 w-4 text-white/25" />
          <p className="mt-3 font-serif text-3xl font-bold text-amber-400">{safePunctuality}%</p>
          <p className="mt-1 text-xs text-white/35">Punctuality Rate</p>
          <div className="mt-3 flex items-center justify-center">
            <svg width="62" height="62" viewBox="0 0 62 62">
              <circle cx="31" cy="31" r="24" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
              <circle
                cx="31"
                cy="31"
                r="24"
                stroke="#F59E0B"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={progressOffset}
                transform="rotate(-90 31 31)"
              />
            </svg>
          </div>
        </article>

        <article className="card-interactive rounded-2xl border border-white/8 bg-[#111118] p-5 transition-all duration-200 hover:-translate-y-[1px] hover:border-white/14 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <CheckCircle className="h-4 w-4 text-white/25" />
          <p className="mt-3 font-serif text-3xl font-bold text-green-400">{safeOnTime}</p>
          <p className="mt-1 text-xs text-white/35">On-Time Arrivals</p>
          <p className="mt-2 text-xs text-white/25">out of {safeTotalDuties} total</p>
        </article>

        <article className="card-interactive rounded-2xl border border-white/8 bg-[#111118] p-5 transition-all duration-200 hover:-translate-y-[1px] hover:border-white/14 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <AlertCircle className="h-4 w-4 text-white/25" />
          <p className={`mt-3 font-serif text-3xl font-bold ${safeLate > 0 ? 'text-red-400' : 'text-white/90'}`}>{safeLate}</p>
          <p className="mt-1 text-xs text-white/35">Late Arrivals</p>
          {safeLate === 0 ? <p className="mt-2 text-xs text-green-400/60">Perfect record</p> : null}
        </article>
      </section>

      <section
        className={`mt-4 rounded-2xl border p-5 ${
          safePunctuality >= 90
            ? 'border-green-500/15 bg-green-500/5'
            : safePunctuality >= 70
              ? 'border-amber-500/15 bg-amber-500/5'
              : 'border-red-500/15 bg-red-500/5'
        }`}
      >
        {safePunctuality >= 90 ? (
          <>
            <p className="text-sm font-medium text-green-400">
              <Star className="mr-1 inline h-3.5 w-3.5" />
              Excellent Punctuality
            </p>
            <p className="mt-1 text-xs text-white/35">You are in the top tier of punctual instructors</p>
          </>
        ) : null}

        {safePunctuality >= 70 && safePunctuality < 90 ? (
          <>
            <p className="text-sm font-medium text-amber-400">
              <TrendingUp className="mr-1 inline h-3.5 w-3.5" />
              Good Standing
            </p>
            <p className="mt-1 text-xs text-white/35">Keep it up to reach excellent tier</p>
          </>
        ) : null}

        {safePunctuality < 70 ? (
          <>
            <p className="text-sm font-medium text-red-400">
              <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
              Needs Improvement
            </p>
            <p className="mt-1 text-xs text-white/35">Focus on arriving 30 mins before reporting time</p>
          </>
        ) : null}
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-white/8 bg-[#111118]">
        <header className="border-b border-white/6 px-5 py-4">
          <h2 className="text-sm font-medium text-white/60">Recent Activity</h2>
        </header>

        {recentActivity.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-white/25">No duty history yet</div>
        ) : (
          recentActivity.map((duty, index) => (
            <div
              key={duty.duty_id}
              className={`flex items-start gap-3 px-5 py-3.5 transition-colors duration-200 hover:bg-white/3 ${index !== recentActivity.length - 1 ? 'border-b border-white/4' : ''}`}
            >
              <DutyStatusDot status={duty.status} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white/70">{duty.subject}</p>
                <p className="mt-0.5 text-xs text-white/30">
                  {duty.exam_date ?? '--'} • {duty.room_number ?? '--'}
                </p>
              </div>
              <ActivityStatusBadge status={duty.status} />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
