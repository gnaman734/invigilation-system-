import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';
import StatsCard from '../shared/StatsCard';
import { supabase } from '../../lib/supabase';
import {
  calculatePunctualityPercentage,
  getMinutesLate,
  getPunctualityTrend,
  RECENT_LATE_ARRIVALS_LIMIT,
} from '../../lib/utils/punctuality';
import TablePagination from '../shared/TablePagination';
import EmptyState from '../shared/EmptyState';

function sortByDateDescending(first, second) {
  const firstDate = first.exam_date ? new Date(first.exam_date).getTime() : 0;
  const secondDate = second.exam_date ? new Date(second.exam_date).getTime() : 0;
  return secondDate - firstDate;
}

export default function PunctualityPanel({
  instructors = [],
  duties = [],
  loading = false,
  error = '',
  showOverallStats = true,
  showTrendTable = true,
  showRecentLateArrivals = true,
  onRealtimeRefresh,
}) {
  const [page, setPage] = useState(1);
  const totals = useMemo(() => {
    return instructors.reduce(
      (accumulator, instructor) => {
        return {
          totalDuties: accumulator.totalDuties + Number(instructor.total_duties ?? 0),
          onTimeArrivals: accumulator.onTimeArrivals + Number(instructor.on_time_arrivals ?? 0),
          lateArrivals: accumulator.lateArrivals + Number(instructor.late_arrivals ?? 0),
        };
      },
      { totalDuties: 0, onTimeArrivals: 0, lateArrivals: 0 }
    );
  }, [instructors]);

  const overallPunctuality = useMemo(() => {
    return calculatePunctualityPercentage(totals.onTimeArrivals, totals.totalDuties);
  }, [totals]);

  const rankedInstructors = useMemo(() => {
    return [...instructors]
      .map((instructor) => {
        const percentage = calculatePunctualityPercentage(instructor.on_time_arrivals, instructor.total_duties);
        return {
          ...instructor,
          punctualityPercentage: percentage,
          trend: getPunctualityTrend(percentage),
        };
      })
      .sort((first, second) => first.punctualityPercentage - second.punctualityPercentage);
  }, [instructors]);

  const recentLateArrivals = useMemo(() => {
    return duties
      .filter((duty) => duty.status === 'late')
      .sort(sortByDateDescending)
      .slice(0, RECENT_LATE_ARRIVALS_LIMIT)
      .map((duty) => ({
        ...duty,
        lateByMinutes: getMinutesLate(duty.reporting_time, duty.arrival_time),
      }));
  }, [duties]);

  useEffect(() => {
    setPage(1);
  }, [rankedInstructors.length]);

  useEffect(() => {
    const channelName = `punctuality-realtime-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'duties',
        },
        () => {
          if (typeof onRealtimeRefresh === 'function') {
            onRealtimeRefresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onRealtimeRefresh]);

  const paginatedInstructors = rankedInstructors.slice((page - 1) * 10, page * 10);

  if (loading) {
    return (
      <section className="rounded-xl border border-white/8 bg-[#111118] p-4">
        <div className="skeleton h-10 rounded-md" />
        <div className="skeleton mt-3 h-10 rounded-md" />
        <div className="skeleton mt-3 h-10 rounded-md" />
      </section>
    );
  }

  return (
    <section className="app-card fade-up space-y-5 p-4">
      {error ? <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}

      {showOverallStats ? (
        <div>
          <h2 className="text-sm font-medium text-white/70">Overall Punctuality Stats</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard title="Total Duties" value={totals.totalDuties} subtitle="Tracked assignments" color="blue" />
            <StatsCard title="On-Time Arrivals" value={totals.onTimeArrivals} subtitle="Reached before deadline" color="green" />
            <StatsCard title="Late Arrivals" value={totals.lateArrivals} subtitle="Reported after deadline" color="red" />
            <StatsCard
              title="Overall Punctuality %"
              value={`${overallPunctuality.toFixed(2)}%`}
              subtitle="Institution-wide punctuality"
              color="purple"
            />
          </div>
        </div>
      ) : null}

      {showTrendTable ? (
        <div>
          <h2 className="text-sm font-medium text-white/70">Per Instructor Punctuality</h2>
          {rankedInstructors.length === 0 ? (
            <p className="mt-3 rounded-md border border-white/8 bg-[#16161F] px-4 py-3 text-sm text-white/45">
              No instructor punctuality data available.
            </p>
          ) : (
            <div className="app-table-wrap mt-3">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Total Duties</th>
                    <th>On Time</th>
                    <th>Late</th>
                    <th>Punctuality %</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInstructors.map((instructor) => (
                    <tr key={instructor.instructor_id}>
                      <td className="font-medium text-white/80">{instructor.name}</td>
                      <td>{instructor.total_duties ?? 0}</td>
                      <td>{instructor.on_time_arrivals ?? 0}</td>
                      <td>{instructor.late_arrivals ?? 0}</td>
                      <td>{instructor.punctualityPercentage.toFixed(2)}%</td>
                      <td>{instructor.trend}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <TablePagination totalItems={rankedInstructors.length} page={page} onPageChange={setPage} />
            </div>
          )}
        </div>
      ) : null}

      {showRecentLateArrivals ? (
        <div>
          <h2 className="text-sm font-medium text-white/70">Recent Late Arrivals</h2>
          {recentLateArrivals.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No late arrivals" subtitle="All instructors are punctual" />
          ) : (
            <div className="mt-3 space-y-3">
              {recentLateArrivals.map((duty) => (
                <article key={duty.duty_id} className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm">
                  <p className="font-semibold text-red-200">{duty.instructor_name ?? 'Unknown Instructor'}</p>
                  <p className="mt-1 text-red-300">
                    {duty.subject ?? '--'} • {duty.exam_date ? format(parseISO(duty.exam_date), 'dd MMM yyyy') : '--'} •{' '}
                    {duty.room_number ?? '--'}
                  </p>
                  <p className="mt-1 font-medium text-red-300">{duty.lateByMinutes} mins late</p>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
