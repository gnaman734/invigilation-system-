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
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-[#1A1A2E]">{point.name}</p>
      <p className="mt-1 text-gray-700">Total duties: {point.totalDuties}</p>
      <p className="mt-1 text-gray-700">vs average: {varianceText}</p>
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
    <section className="app-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#1A1A2E]">Duty Distribution by Instructor</h3>
          <p className="text-sm text-gray-500">Compared against team average</p>
        </div>
        <span className="rounded-full bg-[#F5A623]/15 px-3 py-1 text-sm font-semibold text-[#8f5d00]">
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
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="firstName" tick={{ fill: '#6B7280', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={24} />
              <ReferenceLine
                y={average}
                stroke="#F5A623"
                strokeDasharray="6 4"
                label={{ value: 'Avg', fill: '#8f5d00', position: 'insideTopRight' }}
              />
              <Bar dataKey="totalDuties" name="Total Duties" fill="#2E86AB" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <span className="rounded-full bg-red-100 px-3 py-2 text-center text-sm font-semibold text-red-700">
          {summary.overloaded} Overloaded
        </span>
        <span className="rounded-full bg-green-100 px-3 py-2 text-center text-sm font-semibold text-green-700">
          {summary.balanced} Balanced
        </span>
        <span className="rounded-full bg-yellow-100 px-3 py-2 text-center text-sm font-semibold text-yellow-700">
          {summary.underutilized} Underutilized
        </span>
      </div>
    </section>
  );
}

export default memo(DutyDistributionChart);
