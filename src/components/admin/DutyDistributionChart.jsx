import { useMemo } from 'react';
import { memo } from 'react';
import { BarChart2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { calculateAverage, getWorkloadStatus } from '../../lib/utils/workload';

function EmptyChartState({ message }) {
  return (
    <div className="app-empty-state flex flex-col items-center gap-2 py-10 text-center">
      <BarChart2 className="h-8 w-8 text-slate-400" />
      <p className="font-semibold text-slate-700">Not enough data yet</p>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) {
    return null;
  }

  const varianceText = point.variance > 0 ? `+${point.variance}` : `${point.variance}`;

  return (
    <div className="rounded-xl border border-white/10 bg-[#16161F] px-3 py-2 text-sm shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <p className="text-[11px] font-semibold text-white/85">{point.name}</p>
      <p className="mt-1 text-[11px] text-white/50">Total duties: {point.totalDuties}</p>
      <p className="mt-1 text-[11px] text-white/50">vs average: {varianceText}</p>
    </div>
  );
}

function DutyDistributionChart({ instructors = [] }) {
  const average = useMemo(() => calculateAverage(instructors), [instructors]);

  const chartData = useMemo(() => {
    return instructors
      .map((instructor) => {
        const firstName = String(instructor.name ?? '').trim().split(' ')[0] || 'N/A';
        const totalDuties = Number(instructor.total_duties ?? 0);
        return {
          id: instructor.instructor_id,
          name: instructor.name ?? 'Unknown Instructor',
          firstName,
          totalDuties,
          variance: Math.round((totalDuties - average) * 10) / 10,
        };
      })
      .sort((first, second) => second.totalDuties - first.totalDuties);
  }, [instructors, average]);

  const summary = useMemo(() => {
    return instructors.reduce(
      (accumulator, instructor) => {
        const status = getWorkloadStatus(instructor.total_duties, average);
        if (status === 'overloaded') accumulator.overloaded += 1;
        if (status === 'balanced') accumulator.balanced += 1;
        if (status === 'underutilized') accumulator.underutilized += 1;
        return accumulator;
      },
      { overloaded: 0, balanced: 0, underutilized: 0 }
    );
  }, [instructors, average]);

  return (
    <section className="app-card card-interactive fade-up p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-white/70">Duty Distribution by Instructor</h3>
          <p className="mt-0.5 text-xs text-white/30">Compared against team average</p>
        </div>
        <span className="rounded-lg border border-white/8 bg-white/5 px-2 py-1 text-xs text-white/40">
          Team Avg: {average.toFixed(1)} duties
        </span>
      </div>

      {chartData.length === 0 ? (
        <div className="mt-4">
          <EmptyChartState message="Charts will populate as duties are added" />
        </div>
      ) : (
        <div className="mt-4 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="1 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="firstName" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={24} />
              <ReferenceLine
                y={average}
                stroke="rgba(255,255,255,0.12)"
                strokeDasharray="3 4"
                label={{ value: 'Target', fill: 'rgba(255,255,255,0.25)', fontSize: 10, position: 'insideTopRight' }}
              />
              <Bar dataKey="totalDuties" name="Total Duties" fill="rgba(245,158,11,0.7)" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <span className="rounded-full border border-red-500/20 bg-red-500/8 px-3 py-2 text-center text-sm font-semibold text-red-400/80">
          {summary.overloaded} Overloaded
        </span>
        <span className="rounded-full border border-green-500/20 bg-green-500/8 px-3 py-2 text-center text-sm font-semibold text-green-400/80">
          {summary.balanced} Balanced
        </span>
        <span className="rounded-full border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-center text-sm font-semibold text-amber-400/80">
          {summary.underutilized} Underutilized
        </span>
      </div>
    </section>
  );
}

export default memo(DutyDistributionChart);
