export const WORKLOAD_OVERLOAD_FACTOR = 1.2;
export const WORKLOAD_UNDERUTILIZED_FACTOR = 0.8;
export const DEFAULT_LATE_ARRIVAL_THRESHOLD = 3;

function toDutyCount(value) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatDutyDifference(value) {
  const rounded = Math.round(Math.abs(value) * 10) / 10;
  const wholeNumber = Number.isInteger(rounded);
  return wholeNumber ? String(Math.round(rounded)) : String(rounded.toFixed(1));
}

export function calculateAverage(instructors) {
  if (!Array.isArray(instructors) || instructors.length === 0) {
    return 0;
  }

  const totalDuties = instructors.reduce((sum, instructor) => sum + toDutyCount(instructor.total_duties), 0);
  return totalDuties / instructors.length;
}

export function getWorkloadStatus(instructorDuties, average) {
  const duties = toDutyCount(instructorDuties);
  const safeAverage = Number.isFinite(average) ? average : 0;

  if (safeAverage <= 0) {
    return 'balanced';
  }

  if (duties > safeAverage * WORKLOAD_OVERLOAD_FACTOR) {
    return 'overloaded';
  }

  if (duties < safeAverage * WORKLOAD_UNDERUTILIZED_FACTOR) {
    return 'underutilized';
  }

  return 'balanced';
}

export function getWorkloadBadgeColor(status) {
  if (status === 'overloaded') {
    return 'red';
  }

  if (status === 'underutilized') {
    return 'yellow';
  }

  return 'green';
}

export function getSuggestedInstructor(instructors, department) {
  if (!Array.isArray(instructors) || instructors.length === 0) {
    return null;
  }

  const normalizedDepartment = typeof department === 'string' ? department.trim().toLowerCase() : '';
  const departmentMatched = normalizedDepartment
    ? instructors.filter((instructor) => String(instructor.department ?? '').trim().toLowerCase() === normalizedDepartment)
    : [];

  const candidatePool = departmentMatched.length > 0 ? departmentMatched : instructors;
  if (candidatePool.length === 0) {
    return null;
  }

  const sortedCandidates = [...candidatePool].sort((first, second) => {
    const dutyGap = toDutyCount(first.total_duties) - toDutyCount(second.total_duties);
    if (dutyGap !== 0) {
      return dutyGap;
    }

    return String(first.name ?? '').localeCompare(String(second.name ?? ''));
  });

  const instructor = sortedCandidates[0];
  const average = calculateAverage(candidatePool);
  const variance = toDutyCount(instructor.total_duties) - average;

  let suggestion = 'At average load';
  if (variance < 0) {
    suggestion = `${formatDutyDifference(variance)} duties below average`;
  } else if (variance > 0) {
    suggestion = `${formatDutyDifference(variance)} duties above average`;
  }

  return { instructor, variance, suggestion };
}

export function flagLateInstructors(instructors, threshold = DEFAULT_LATE_ARRIVAL_THRESHOLD) {
  if (!Array.isArray(instructors) || instructors.length === 0) {
    return [];
  }

  return instructors
    .filter((instructor) => toDutyCount(instructor.late_arrivals) >= threshold)
    .sort((first, second) => toDutyCount(second.late_arrivals) - toDutyCount(first.late_arrivals));
}
