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
    <div className="rounded-xl border border-white/10 bg-[#16161F] px-3 py-2 text-sm shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <p className="text-[11px] font-semibold text-white/85">{point.monthLabel}</p>
      <p className="mt-1 text-[11px] text-white/50">{point.punctuality.toFixed(2)}% on-time in {point.monthLabel}</p>
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
    <section className="app-card card-interactive fade-up p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-white/70">Punctuality Trend</h3>
          <p className="mt-0.5 text-xs text-white/30">Last 6 months on-time arrival rate</p>
        </div>
        <span className="rounded-lg border border-white/8 bg-white/5 px-2 py-1 text-xs text-white/40">
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
              <CartesianGrid strokeDasharray="1 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="monthLabel" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<TrendTooltip />} />
              <Legend verticalAlign="bottom" height={24} />
              <ReferenceLine
                y={TARGET_PUNCTUALITY}
                stroke="rgba(255,255,255,0.12)"
                strokeDasharray="3 4"
                label={{ value: 'Target', fill: 'rgba(255,255,255,0.25)', fontSize: 10, position: 'insideTopRight' }}
              />
              <Area type="monotone" dataKey="punctuality" fill="rgba(245,158,11,0.15)" fillOpacity={1} stroke="none" name="Punctuality Area" />
              <Line
                type="monotone"
                dataKey="punctuality"
                stroke="#F59E0B"
                strokeWidth={1.5}
                dot={{ fill: '#F59E0B', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: '#F59E0B', strokeWidth: 2, stroke: 'rgba(245,158,11,0.3)' }}
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
