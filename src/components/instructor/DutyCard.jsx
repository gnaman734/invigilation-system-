import { format, parseISO } from 'date-fns';
import StatusBadge from '../shared/StatusBadge';
import { formatTimeDisplay, getDeadline } from '../../lib/utils/punctuality';
import { sanitizeText } from '../../lib/utils/sanitize';

export default function DutyCard({ duty, onMarkArrival, isNew = false, isProcessing = false, statusJustChanged = false, disableActions = false }) {
  const examDate = duty.exam_date ? format(parseISO(duty.exam_date), 'EEEE, dd MMMM yyyy') : '--';
  const deadline = getDeadline(duty.reporting_time);
  const canMarkArrival = duty.status === 'pending' && typeof onMarkArrival === 'function';

  const statusBorder =
    duty.status === 'on-time' ? 'border-l-green-400' : duty.status === 'late' ? 'border-l-red-400' : 'border-l-yellow-400';

  return (
    <article className={`relative app-card border-l-4 p-5 transition-all duration-300 ${statusBorder} ${isNew ? 'animate-[fade-in-up_260ms_ease-out]' : ''}`}>
      {isProcessing ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/65">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#1E3A5F]/30 border-t-[#1E3A5F]" />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#1A1A2E]">{sanitizeText(duty.subject)}</h3>
          <p className="mt-1 text-sm text-gray-600">{examDate}</p>
          <p className="mt-1 text-sm text-gray-600">
            Room {sanitizeText(duty.room_number)}
            {duty.building ? `, ${sanitizeText(duty.building)}` : ''}
          </p>
        </div>

        <div className={`transition-all duration-300 ${statusJustChanged ? 'scale-105' : 'scale-100'}`}>
          <StatusBadge status={duty.status} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="app-label">Reporting Time</p>
          <p className="mt-1 text-sm font-semibold text-[#1A1A2E]">{formatTimeDisplay(duty.reporting_time)}</p>
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <p className="app-label">Deadline (30 mins before)</p>
          <p className="mt-1 text-sm font-semibold text-[#1A1A2E]">{formatTimeDisplay(deadline)}</p>
        </div>
      </div>

      {duty.status === 'on-time' ? (
        <p className="mt-4 text-sm font-medium text-green-700">Arrived at {formatTimeDisplay(duty.arrival_time)}</p>
      ) : null}

      {duty.status === 'late' ? (
        <p className="mt-4 text-sm font-medium text-red-700">Arrived at {formatTimeDisplay(duty.arrival_time)}</p>
      ) : null}

      {canMarkArrival ? (
        <button
          type="button"
          onClick={() => onMarkArrival(duty.duty_id)}
          disabled={disableActions || isProcessing}
          className="app-btn-primary mt-4"
        >
          {isProcessing ? 'Saving...' : 'Mark Arrival'}
        </button>
      ) : null}
    </article>
  );
}
