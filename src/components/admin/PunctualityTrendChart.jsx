import { useMemo } from 'react';
import { memo } from 'react';
import { BarChart2 } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, isSameMonth, startOfMonth, subMonths } from 'date-fns';

const MONTH_WINDOW = 6;
const TARGET_PUNCTUALITY = 80;

function EmptyChartState({ message }) {
  return (
    <div className="app-empty-state flex flex-col items-center gap-2 py-10 text-center">
      <BarChart2 className="h-8 w-8 text-slate-400" />
      <p className="font-semibold text-slate-700">Not enough data yet</p>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-[#1A1A2E]">{point.monthLabel}</p>
      <p className="mt-1 text-gray-700">{point.punctuality.toFixed(2)}% on-time in {point.monthLabel}</p>
    </div>
  );
}

function PunctualityTrendChart({ duties = [] }) {
  const chartData = useMemo(() => {
    const monthBuckets = Array.from({ length: MONTH_WINDOW }, (_, index) => startOfMonth(subMonths(new Date(), MONTH_WINDOW - 1 - index)));

    return monthBuckets.map((monthDate) => {
      const monthDuties = duties.filter((duty) => {
        if (!duty.exam_date) {
          return false;
        }
        return isSameMonth(new Date(duty.exam_date), monthDate);
      });

      const total = monthDuties.length;
      const onTime = monthDuties.filter((duty) => duty.status === 'on-time').length;
      const punctuality = total > 0 ? (onTime / total) * 100 : 0;

      return {
        monthKey: format(monthDate, 'yyyy-MM'),
        monthLabel: format(monthDate, 'MMM'),
        punctuality: Math.round(punctuality * 100) / 100,
      };
    });
  }, [duties]);

  const currentMonthPoint = chartData[chartData.length - 1];

  return (
    <section className="app-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#1A1A2E]">Punctuality Trend</h3>
          <p className="text-sm text-gray-500">Last 6 months on-time arrival rate</p>
        </div>
        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
          {currentMonthPoint?.monthLabel ?? 'Current'}: {currentMonthPoint?.punctuality?.toFixed(2) ?? '0.00'}%
        </span>
      </div>

      {chartData.length === 0 ? (
        <div className="mt-4">
          <EmptyChartState message="Charts will populate as duties are added" />
        </div>
      ) : (
        <div className="mt-4 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="monthLabel" tick={{ fill: '#6B7280', fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#6B7280', fontSize: 12 }} />
              <Tooltip content={<TrendTooltip />} />
              <Legend verticalAlign="bottom" height={24} />
              <ReferenceLine
                y={TARGET_PUNCTUALITY}
                stroke="#F5A623"
                strokeDasharray="6 4"
                label={{ value: 'Target', fill: '#8f5d00', position: 'insideTopRight' }}
              />
              <Area type="monotone" dataKey="punctuality" fill="#27AE60" fillOpacity={0.1} stroke="none" name="Punctuality Area" />
              <Line
                type="monotone"
                dataKey="punctuality"
                stroke="#27AE60"
                strokeWidth={3}
                dot={{ r: 4, fill: '#27AE60' }}
                name="On-time %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export default memo(PunctualityTrendChart);
