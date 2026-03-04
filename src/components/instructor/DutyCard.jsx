import { useMemo, useState } from 'react';
import { format, isAfter, parseISO } from 'date-fns';
import { AlertCircle, Building2, Calendar, CheckCircle, ChevronDown, Clock3, FileText, MapPin, Users } from 'lucide-react';
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

  if (normalized === 'cancelled') {
    return <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/30">Cancelled</span>;
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
  now = new Date(),
  showReminderHints = false,
  onLoadExamContext,
}) {
  const [expanded, setExpanded] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [examContext, setExamContext] = useState(null);

  const normalizedDutyStatus = String(duty.status ?? 'pending').toLowerCase();
  const examDate = duty.exam_date ? format(parseISO(duty.exam_date), 'EEEE, dd MMMM yyyy') : '--';
  const deadline = getDeadlineState(duty);
  const canMarkArrival = !isPast && normalizedDutyStatus === 'pending' && typeof onOpenMarkArrival === 'function';
  const reportingDateTime = duty.exam_date && duty.reporting_time ? new Date(`${duty.exam_date}T${duty.reporting_time}`) : null;
  const validReportingDateTime = reportingDateTime && !Number.isNaN(reportingDateTime.getTime()) ? reportingDateTime : null;
  const minutesToReporting = validReportingDateTime ? Math.round((validReportingDateTime.getTime() - now.getTime()) / 60000) : null;
  const reminderLabel = !showReminderHints || minutesToReporting === null || minutesToReporting < 0
    ? null
    : minutesToReporting <= 30
      ? 'T-30m'
      : minutesToReporting <= 120
        ? 'T-2h'
        : minutesToReporting <= 1440
          ? 'T-24h'
          : null;
  const isMissedDutyRisk = normalizedDutyStatus === 'pending' && deadline.isPassed;

  const hasExamReference = Boolean(duty.exam_id || duty.subject || duty.start_time || duty.end_time || duty.department);

  const visibleOtherInstructors = useMemo(() => {
    const list = examContext?.other_instructors ?? duty.other_instructors ?? [];
    return Array.isArray(list) ? list : [];
  }, [examContext, duty.other_instructors]);

  const toggleExpanded = async () => {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);

    if (!nextExpanded) {
      return;
    }

    if (examContext || typeof onLoadExamContext !== 'function') {
      return;
    }

    setContextLoading(true);
    const result = await onLoadExamContext(duty.duty_id);
    setContextLoading(false);

    if (!result?.error && result?.data) {
      setExamContext(result.data);
    }
  };

  const topLineClass =
    normalizedDutyStatus === 'on-time'
      ? 'bg-green-500/60'
      : normalizedDutyStatus === 'late'
        ? 'bg-red-500/60'
        : normalizedDutyStatus === 'cancelled'
          ? 'bg-white/30'
          : 'bg-amber-500/60';

  return (
    <article
      id={`duty-${duty.duty_id}`}
      onClick={toggleExpanded}
      className={`group card-interactive relative mb-3 cursor-default overflow-hidden rounded-2xl border border-white/8 bg-[#111118] transition-all duration-200 hover:-translate-y-[1px] hover:border-white/14 hover:bg-[#16161F] hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] ${
        statusJustChanged ? 'ring-1 ring-amber-500/20' : ''
      } ${isPast || normalizedDutyStatus === 'cancelled' ? 'opacity-50' : ''} ${highlight ? 'ring-1 ring-amber-500/35' : ''}`}
    >
      <div className={`absolute left-0 right-0 top-0 h-[2px] ${topLineClass}`} />

      {isMissedDutyRisk ? (
        <div className="mx-5 mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          Missed duty risk: reporting deadline has passed.
        </div>
      ) : null}

      {isProcessing ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0A0A0F]/70">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-400" />
        </div>
      ) : null}

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`font-serif text-sm font-semibold text-white/85 ${normalizedDutyStatus === 'cancelled' ? 'line-through' : ''}`}>{sanitizeText(duty.subject)}</p>
            <p className="mt-0.5 text-xs text-white/35">
              <Calendar className="mr-1 inline h-3 w-3" />
              {examDate}
            </p>
            {reminderLabel ? (
              <span className="mt-2 inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                {reminderLabel} reminder
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={duty.status} />
            <button type="button" onClick={(event) => { event.stopPropagation(); toggleExpanded(); }} className="rounded-lg p-1 text-white/30 transition-colors hover:bg-white/8 hover:text-white/70">
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-4 h-px bg-white/5 sm:mx-5" />

      <div className="px-4 py-4 sm:px-5">
        <div className="grid grid-cols-2 gap-3">
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
                normalizedDutyStatus === 'pending' && deadline.isPassed ? 'text-red-400/70' : 'text-white/65'
              }`}
            >
              {formatTimeDisplay(deadline.deadlineTime)}
            </p>
          </div>

          <div>
            <Calendar className="mb-1 h-3.5 w-3.5 text-white/20" />
            <p className="text-xs text-white/30">Exam Date</p>
            <p className="mt-0.5 text-xs text-white/65">{duty.exam_date ? format(parseISO(duty.exam_date), 'EEE, dd MMM yyyy') : '--'}</p>
          </div>
        </div>
      </div>

      {isPast && duty.arrival_time ? (
        <p className="px-4 pb-4 text-xs text-white/45 sm:px-5">Arrival: {formatTimeDisplay(duty.arrival_time)}</p>
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

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded ? 'max-h-96' : 'max-h-0'}`}>
      <div className="mx-4 h-px bg-white/5 sm:mx-5" />
      <div className="px-4 pb-4 pt-3 sm:px-5">
          {!hasExamReference ? (
            <p className="text-xs italic text-white/25">Exam details unavailable for this duty.</p>
          ) : (
          <div className="rounded-xl bg-white/3 p-4">
            <p className="mb-3 text-xs uppercase tracking-wider text-white/25">Exam Details</p>

            <div className="space-y-2 text-xs text-white/50">
              <p><Building2 className="mr-1 inline h-3.5 w-3.5" />{sanitizeText(examContext?.exam_department || duty.department || '--')}</p>
              <p><Clock3 className="mr-1 inline h-3.5 w-3.5" />{(examContext?.start_time || duty.start_time) && (examContext?.end_time || duty.end_time) ? `${String(examContext?.start_time || duty.start_time).slice(0, 5)} — ${String(examContext?.end_time || duty.end_time).slice(0, 5)}` : <span className="text-white/30">Time not set</span>}</p>
              <p><Users className="mr-1 inline h-3.5 w-3.5" />Capacity: {examContext?.capacity ?? duty.capacity ?? '--'} students</p>
            </div>

            <div className="mt-3">
              <p className="text-xs text-white/35">Also invigilating:</p>
              {contextLoading ? <p className="mt-1 text-xs text-white/35">Loading...</p> : (
                <div className="mt-1 flex items-center gap-0.5">
                  {visibleOtherInstructors.slice(0, 3).map((item, index) => (
                    <span key={item.instructor_id || `${item.name}-${index}`} className={`${index > 0 ? '-ml-1' : ''} inline-flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-[10px] text-amber-400`} title={item.name}>
                      {String(item?.name || 'I').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                    </span>
                  ))}
                  {visibleOtherInstructors.length > 3 ? <span className="ml-1 text-xs text-white/35">+{visibleOtherInstructors.length - 3} more</span> : null}
                  {!visibleOtherInstructors.length ? <span className="text-xs italic text-white/25">You are the only invigilator in this room</span> : null}
                </div>
              )}
            </div>

            {examContext?.notes ? <p className="mt-3 text-xs italic text-white/45"><FileText className="mr-1 inline h-3.5 w-3.5" />{examContext.notes}</p> : null}
          </div>
          )}
        </div>
      </div>

      {canMarkArrival ? (
        <div className="relative mx-4 mb-4 sm:mx-5 sm:mb-5">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenMarkArrival(duty);
            }}
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
