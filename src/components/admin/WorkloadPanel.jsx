import { useEffect, useMemo, useRef, useState } from 'react';
import {
  calculateAverage,
  DEFAULT_LATE_ARRIVAL_THRESHOLD,
  flagLateInstructors,
  getWorkloadBadgeColor,
  getWorkloadStatus,
} from '../../lib/utils/workload';
import TablePagination from '../shared/TablePagination';
import { useToast } from '../shared/Toast';

const BADGE_STYLES = {
  red: 'border-red-200 bg-red-100 text-red-700',
  yellow: 'border-yellow-200 bg-yellow-100 text-yellow-700',
  green: 'border-green-200 bg-green-100 text-green-700',
};

function formatDutyDelta(instructorDuties, average, status) {
  if (status === 'balanced') {
    return { text: 'On track', className: 'text-green-700' };
  }

  const delta = Math.round(Math.abs((Number(instructorDuties ?? 0) - average) * 10) / 10);
  const value = Number.isInteger(delta) ? String(delta) : delta.toFixed(1);

  if (status === 'overloaded') {
    return { text: `+${value} above avg`, className: 'text-red-700' };
  }

  return { text: `-${value} below avg`, className: 'text-yellow-700' };
}

export default function WorkloadPanel({
  instructors = [],
  loading = false,
  error = '',
  showOverviewTable = true,
  showLateFlags = true,
  showUnderutilized = true,
  lateThreshold = DEFAULT_LATE_ARRIVAL_THRESHOLD,
}) {
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const [flashByInstructorId, setFlashByInstructorId] = useState({});
  const previousStatusesRef = useRef(new Map());
  const average = useMemo(() => calculateAverage(instructors), [instructors]);

  const sortedByDuties = useMemo(() => {
    return [...instructors].sort((first, second) => Number(second.total_duties ?? 0) - Number(first.total_duties ?? 0));
  }, [instructors]);

  const lateFlagged = useMemo(() => flagLateInstructors(instructors, lateThreshold), [instructors, lateThreshold]);

  useEffect(() => {
    setPage(1);
  }, [instructors.length]);

  const underutilized = useMemo(() => {
    return instructors
      .filter((instructor) => getWorkloadStatus(instructor.total_duties, average) === 'underutilized')
      .sort((first, second) => Number(first.total_duties ?? 0) - Number(second.total_duties ?? 0));
  }, [instructors, average]);

  const paginatedRows = sortedByDuties.slice((page - 1) * 10, page * 10);

  useEffect(() => {
    const previousStatuses = previousStatusesRef.current;

    if (previousStatuses.size === 0) {
      const baseline = new Map();
      sortedByDuties.forEach((instructor) => {
        baseline.set(instructor.instructor_id, getWorkloadStatus(instructor.total_duties, average));
      });
      previousStatusesRef.current = baseline;
      return;
    }

    setFlashByInstructorId((previous) => {
      const next = { ...previous };

      sortedByDuties.forEach((instructor) => {
        const currentStatus = getWorkloadStatus(instructor.total_duties, average);
        const previousStatus = previousStatuses.get(instructor.instructor_id);

        if (previousStatus !== currentStatus && currentStatus === 'overloaded') {
          addToast({ type: 'warning', message: `${instructor.name} is now overloaded` });
          next[instructor.instructor_id] = 'red';
        }

        if (previousStatus !== currentStatus && currentStatus === 'balanced') {
          addToast({ type: 'success', message: `${instructor.name} is now balanced` });
          next[instructor.instructor_id] = 'green';
        }
      });

      return next;
    });

    const nextStatuses = new Map();
    sortedByDuties.forEach((instructor) => {
      nextStatuses.set(instructor.instructor_id, getWorkloadStatus(instructor.total_duties, average));
    });
    previousStatusesRef.current = nextStatuses;
  }, [addToast, average, sortedByDuties]);

  useEffect(() => {
    if (Object.keys(flashByInstructorId).length === 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setFlashByInstructorId({});
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [flashByInstructorId]);

  if (loading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="h-10 animate-pulse rounded-md bg-slate-100" />
        <div className="mt-3 h-10 animate-pulse rounded-md bg-slate-100" />
        <div className="mt-3 h-10 animate-pulse rounded-md bg-slate-100" />
      </section>
    );
  }

  return (
    <section className="app-card space-y-5 p-4">
      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {showOverviewTable ? (
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Workload Overview</h2>
          {sortedByDuties.length === 0 ? (
            <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              No instructor workload data available.
            </p>
          ) : (
            <div className="app-table-wrap mt-3">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Total Duties</th>
                    <th>vs Average</th>
                    <th>Status Badge</th>
                    <th>Late Arrivals</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((instructor) => {
                    const status = getWorkloadStatus(instructor.total_duties, average);
                    const color = getWorkloadBadgeColor(status);
                    const delta = formatDutyDelta(instructor.total_duties, average, status);
                    return (
                      <tr
                        key={instructor.instructor_id}
                        className={`transition-colors duration-500 ${
                          flashByInstructorId[instructor.instructor_id] === 'red'
                            ? 'bg-red-50'
                            : flashByInstructorId[instructor.instructor_id] === 'green'
                              ? 'bg-green-50'
                              : ''
                        }`}
                      >
                        <td className="font-medium text-gray-800">{instructor.name}</td>
                        <td>{instructor.department ?? '--'}</td>
                        <td>{instructor.total_duties ?? 0}</td>
                        <td className={delta.className}>{delta.text}</td>
                        <td>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                              BADGE_STYLES[color] ?? BADGE_STYLES.green
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td>{instructor.late_arrivals ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <TablePagination totalItems={sortedByDuties.length} page={page} onPageChange={setPage} />
            </div>
          )}
        </div>
      ) : null}

      {showLateFlags ? (
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Late Arrival Flags</h2>
          {lateFlagged.length === 0 ? (
            <p className="mt-3 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              No repeat offenders found ✅
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {lateFlagged.map((instructor) => (
                <article
                  key={instructor.instructor_id}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  <p className="font-semibold text-red-800">{instructor.name}</p>
                  <p className="mt-1 text-red-700">{instructor.department ?? '--'}</p>
                  <p className="mt-1">{instructor.late_arrivals ?? 0} late arrivals - Repeat offender</p>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {showUnderutilized ? (
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Underutilized Instructors</h2>
          {underutilized.length === 0 ? (
            <p className="mt-3 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              All instructors are well utilized ✅
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {underutilized.map((instructor) => (
                <article
                  key={instructor.instructor_id}
                  className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800"
                >
                  <p className="font-semibold text-yellow-900">{instructor.name}</p>
                  <p className="mt-1">{instructor.department ?? '--'}</p>
                  <p className="mt-1">Only {instructor.total_duties ?? 0} duties - Can take more</p>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
