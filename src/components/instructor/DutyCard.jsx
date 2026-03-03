import { format, isAfter, parseISO } from 'date-fns';
import { AlertCircle, Calendar, CheckCircle, Clock3, MapPin } from 'lucide-react';
import { formatTimeDisplay, getDeadline } from '../../lib/utils/punctuality';
import { sanitizeText } from '../../lib/utils/sanitize';

function StatusBadge({ status }) {
  const normalized = String(status ?? 'pending').toLowerCase();

  if (normalized === 'on-time') {
    return <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-400">On Time</span>;
  }

  if (normalized === 'late') {
    return <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-400">Late</span>;
  }

  return <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">Pending</span>;
}

function getDeadlineState(duty) {
  const deadlineTime = getDeadline(duty.reporting_time);
  if (!duty.exam_date || !deadlineTime) {
    return { isPassed: false, deadlineTime };
  }

  const deadlineDateTime = new Date(`${duty.exam_date}T${deadlineTime}:00`);
  if (Number.isNaN(deadlineDateTime.getTime())) {
    return { isPassed: false, deadlineTime };
  }

  return {
    isPassed: isAfter(new Date(), deadlineDateTime),
    deadlineTime,
  };
}

export default function DutyCard({
  duty,
  onOpenMarkArrival,
  isProcessing = false,
  statusJustChanged = false,
  isPast = false,
  highlight = false,
}) {
  const examDate = duty.exam_date ? format(parseISO(duty.exam_date), 'EEEE, dd MMMM yyyy') : '--';
  const deadline = getDeadlineState(duty);
  const canMarkArrival = !isPast && duty.status === 'pending' && typeof onOpenMarkArrival === 'function';

  const topLineClass =
    duty.status === 'on-time' ? 'bg-green-500/40' : duty.status === 'late' ? 'bg-red-500/40' : 'bg-transparent';

  return (
    <article
      id={`duty-${duty.duty_id}`}
      className={`group card-interactive relative mb-3 overflow-hidden rounded-2xl border border-white/8 bg-[#111118] transition-all duration-200 hover:-translate-y-[1px] hover:border-white/14 hover:bg-[#16161F] hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] ${
        statusJustChanged ? 'ring-1 ring-amber-500/20' : ''
      } ${isPast ? 'opacity-75' : ''} ${highlight ? 'ring-1 ring-amber-500/35' : ''}`}
    >
      <div className={`absolute left-0 right-0 top-0 h-[2px] rounded-t-2xl ${topLineClass}`} />

      {isProcessing ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0A0A0F]/70">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-400" />
        </div>
      ) : null}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white/85">{sanitizeText(duty.subject)}</p>
            <p className="mt-0.5 text-xs text-white/35">
              <Calendar className="mr-1 inline h-3 w-3" />
              {examDate}
            </p>
          </div>
          <StatusBadge status={duty.status} />
        </div>
      </div>

      <div className="mx-5 h-px bg-white/5" />

      <div className="px-5 py-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <MapPin className="mb-1 h-3.5 w-3.5 text-white/20" />
            <p className="text-xs text-white/30">Room</p>
            <p className="mt-0.5 text-xs text-white/65">
              {sanitizeText(duty.room_number)}
              {duty.building ? `, ${sanitizeText(duty.building)}` : ''}
              {duty.floor_label ? ` • ${sanitizeText(duty.floor_label)}` : ''}
            </p>
          </div>

          <div>
            <Clock3 className="mb-1 h-3.5 w-3.5 text-white/20" />
            <p className="text-xs text-white/30">Reporting</p>
            <p className="mt-0.5 text-xs text-white/65">{formatTimeDisplay(duty.reporting_time)}</p>
          </div>

          <div>
            <AlertCircle className="mb-1 h-3.5 w-3.5 text-white/20" />
            <p className="text-xs text-white/30">Deadline</p>
            <p
              className={`mt-0.5 text-xs ${
                duty.status === 'pending' && deadline.isPassed ? 'text-red-400/70' : 'text-white/65'
              }`}
            >
              {formatTimeDisplay(deadline.deadlineTime)}
            </p>
          </div>
        </div>
      </div>

      {isPast && duty.arrival_time ? (
        <p className="px-5 pb-4 text-xs text-white/45">Arrival: {formatTimeDisplay(duty.arrival_time)}</p>
      ) : null}

      {Array.isArray(duty.other_instructors) && duty.other_instructors.length > 0 ? (
        <div className="px-5 pb-4">
          <p className="mb-1 text-xs text-white/35">Also in this room:</p>
          <div className="flex items-center gap-1.5">
            {duty.other_instructors.slice(0, 3).map((item) => {
              const initials = String(item?.name ?? 'I')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join('')
                .toUpperCase();

              return (
                <span
                  key={item.instructor_id}
                  title={item.name}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[10px] text-white/65"
                >
                  {initials}
                </span>
              );
            })}
            {duty.other_instructors.length > 3 ? (
              <span className="text-[10px] text-white/35">+{duty.other_instructors.length - 3} more</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {canMarkArrival ? (
        <div className="relative mx-5 mb-5">
          <button
            type="button"
            onClick={() => onOpenMarkArrival(duty)}
            className="btn-press flex w-full items-center justify-center gap-2 rounded-xl border border-white/8 py-2.5 text-xs font-medium text-white/40 transition-all duration-200 group-hover:border-amber-500/25 group-hover:bg-amber-500/5 group-hover:text-amber-400/80"
            title="Click to mark your arrival for this duty"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Mark Arrival
          </button>
          <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded-md border border-white/10 bg-[#16161F] px-2 py-1 text-[10px] text-white/45 group-hover:block">
            Click to mark your arrival for this duty
          </span>
        </div>
      ) : null}
    </article>
  );
}
