import { useMemo, useState } from 'react';
import { memo } from 'react';
import { BarChart2 } from 'lucide-react';
import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import { calculatePunctualityPercentage } from '../../lib/utils/punctuality';

const RADAR_COLORS = ['rgba(245,158,11,0.7)', 'rgba(255,255,255,0.35)', 'rgba(99,102,241,0.55)', 'rgba(16,185,129,0.55)', 'rgba(239,68,68,0.55)'];

function EmptyChartState({ message }) {
  return (
    <div className="app-empty-state flex flex-col items-center gap-2 py-10 text-center">
      <BarChart2 className="h-8 w-8 text-slate-400" />
      <p className="font-semibold text-slate-700">Not enough data yet</p>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

function normalize(value, maxValue) {
  if (!maxValue || maxValue <= 0) {
    return 0;
  }

  return Math.round((value / maxValue) * 10000) / 100;
}

function InstructorPerformanceChart({ instructors = [] }) {
  const [department, setDepartment] = useState('');

  const departmentOptions = useMemo(() => {
    const values = instructors
      .map((instructor) => String(instructor.department ?? '').trim())
      .filter((item) => item.length > 0);

    return [...new Set(values)].sort((first, second) => first.localeCompare(second));
  }, [instructors]);

  const filtered = useMemo(() => {
    if (!department) {
      return instructors;
    }

    return instructors.filter((instructor) => String(instructor.department ?? '').trim() === department);
  }, [instructors, department]);

  const topInstructors = useMemo(() => {
    return [...filtered]
      .sort((first, second) => Number(second.total_duties ?? 0) - Number(first.total_duties ?? 0))
      .slice(0, 5)
      .map((instructor) => {
        const totalDuties = Number(instructor.total_duties ?? 0);
        const onTime = Number(instructor.on_time_arrivals ?? 0);
        const late = Number(instructor.late_arrivals ?? 0);
        const punctuality = calculatePunctualityPercentage(onTime, totalDuties);
        const latePercentage = totalDuties > 0 ? (late / totalDuties) * 100 : 0;

        return {
          key: instructor.instructor_id,
          name: instructor.name ?? 'Unknown',
          totalDuties,
          onTime,
          punctuality,
          consistency: Math.max(0, Math.round((100 - latePercentage) * 100) / 100),
        };
      });
  }, [filtered]);

  const radarData = useMemo(() => {
    if (topInstructors.length === 0) {
      return [];
    }

    const maxDutyLoad = Math.max(...topInstructors.map((instructor) => instructor.totalDuties), 0);
    const maxOnTime = Math.max(...topInstructors.map((instructor) => instructor.onTime), 0);
    const metrics = [
      { metric: 'Duty Load', key: 'dutyLoad' },
      { metric: 'Punctuality Rate', key: 'punctuality' },
      { metric: 'On-Time Count', key: 'onTime' },
      { metric: 'Consistency Score', key: 'consistency' },
    ];

    return metrics.map((metric) => {
      const row = { metric: metric.metric };

      topInstructors.forEach((instructor) => {
        let value = 0;

        if (metric.key === 'dutyLoad') {
          value = normalize(instructor.totalDuties, maxDutyLoad);
        } else if (metric.key === 'punctuality') {
          value = instructor.punctuality;
        } else if (metric.key === 'onTime') {
          value = normalize(instructor.onTime, maxOnTime);
        } else if (metric.key === 'consistency') {
          value = instructor.consistency;
        }

        row[instructor.name] = value;
      });

      return row;
    });
  }, [topInstructors]);

  return (
    <section className="app-card card-interactive fade-up p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-white/70">Instructor Performance Overview</h3>
          <p className="mt-0.5 text-xs text-white/30">Multi-metric comparison</p>
        </div>

        <div className="w-full sm:w-auto">
          <label htmlFor="radar-department" className="app-label">
            Department
          </label>
          <select
            id="radar-department"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className="app-input mt-1 min-w-[220px]"
          >
            <option value="">All departments</option>
            {departmentOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {radarData.length === 0 ? (
        <div className="mt-4">
          <EmptyChartState message="Charts will populate as duties are added" />
        </div>
      ) : (
        <div className="mt-4 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.22)', fontSize: 10 }} />
              {topInstructors.map((instructor, index) => (
                <Radar
                  key={instructor.key}
                  name={instructor.name}
                  dataKey={instructor.name}
                  stroke={RADAR_COLORS[index % RADAR_COLORS.length]}
                  fill={RADAR_COLORS[index % RADAR_COLORS.length]}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              ))}
              <Legend verticalAlign="bottom" height={28} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export default memo(InstructorPerformanceChart);
