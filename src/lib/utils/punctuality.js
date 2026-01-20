import { format, parse } from 'date-fns';

const REFERENCE_DATE = '1970-01-01';
export const PUNCTUALITY_EXCELLENT_THRESHOLD = 90;
export const PUNCTUALITY_GOOD_THRESHOLD = 70;
export const RECENT_LATE_ARRIVALS_LIMIT = 10;

function parseTime(time) {
  if (!time) {
    return null;
  }

  const normalized = time.length === 5 ? `${time}:00` : time;
  return parse(`${REFERENCE_DATE} ${normalized}`, 'yyyy-MM-dd HH:mm:ss', new Date());
}

export function getDeadline(reportingTime) {
  const reporting = parseTime(reportingTime);

  if (!reporting) {
    return '';
  }

  const deadline = new Date(reporting.getTime() - 30 * 60 * 1000);
  return format(deadline, 'HH:mm');
}

export function isPunctual(reportingTime, arrivalTime) {
  const arrival = parseTime(arrivalTime);
  const deadline = parseTime(getDeadline(reportingTime));

  if (!arrival || !deadline) {
    return false;
  }

  return arrival.getTime() <= deadline.getTime();
}

export function getStatus(reportingTime, arrivalTime) {
  return isPunctual(reportingTime, arrivalTime) ? 'on-time' : 'late';
}

export function formatTimeDisplay(time) {
  const parsedTime = parseTime(time);

  if (!parsedTime) {
    return '--';
  }

  return format(parsedTime, 'hh:mm a');
}

export function calculatePunctualityPercentage(onTimeArrivals, totalDuties) {
  const onTime = Number(onTimeArrivals ?? 0);
  const total = Number(totalDuties ?? 0);

  if (!Number.isFinite(onTime) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Math.round((onTime / total) * 10000) / 100;
}

export function getPunctualityTrend(percentage) {
  const safePercentage = Number(percentage ?? 0);

  if (safePercentage >= PUNCTUALITY_EXCELLENT_THRESHOLD) {
    return '🟢 Excellent';
  }

  if (safePercentage >= PUNCTUALITY_GOOD_THRESHOLD) {
    return '🟡 Good';
  }

  return '🔴 Needs Improvement';
}

export function getMinutesLate(reportingTime, arrivalTime) {
  const deadline = parseTime(getDeadline(reportingTime));
  const arrival = parseTime(arrivalTime);

  if (!deadline || !arrival) {
    return 0;
  }

  const differenceInMinutes = Math.round((arrival.getTime() - deadline.getTime()) / (60 * 1000));
  return differenceInMinutes > 0 ? differenceInMinutes : 0;
}
