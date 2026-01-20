import { useMemo } from 'react';
import { memo } from 'react';
import { BarChart2 } from 'lucide-react';
import { format, startOfWeek, subWeeks } from 'date-fns';

const WEEKS = 12;

function getCellClass(value) {
  if (value <= 0) return 'bg-gray-100';
  if (value === 1) return 'bg-blue-100';
  if (value === 2) return 'bg-blue-300';
  if (value === 3) return 'bg-blue-500';
  return 'bg-blue-700';
}

function EmptyChartState({ message }) {
  return (
    <div className="app-empty-state flex flex-col items-center gap-2 py-10 text-center">
      <BarChart2 className="h-8 w-8 text-slate-400" />
      <p className="font-semibold text-slate-700">Not enough data yet</p>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

function DutyHeatmap({ instructors = [], duties = [] }) {
  const weeks = useMemo(() => {
    return Array.from({ length: WEEKS }, (_, index) => startOfWeek(subWeeks(new Date(), WEEKS - 1 - index), { weekStartsOn: 1 }));
  }, []);

  const matrix = useMemo(() => {
    if (instructors.length === 0) {
      return [];
    }

    return instructors.map((instructor) => {
      const cells = weeks.map((weekStart) => {
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        const count = duties.filter((duty) => {
          if (duty.instructor_id !== instructor.instructor_id || !duty.exam_date) {
            return false;
          }

          const dutyWeek = startOfWeek(new Date(duty.exam_date), { weekStartsOn: 1 });
          return format(dutyWeek, 'yyyy-MM-dd') === weekKey;
        }).length;

        return {
          weekStart,
          weekKey,
          count,
        };
      });

      return {
        id: instructor.instructor_id,
        name: instructor.name ?? 'Unknown',
        cells,
      };
    });
  }, [instructors, duties, weeks]);

  return (
    <section className="app-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#1A1A2E]">Monthly Duty Heatmap</h3>
          <p className="text-sm text-gray-500">Duty load per instructor per week</p>
        </div>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">Last 12 Weeks</span>
      </div>

      {matrix.length === 0 ? (
        <div className="mt-4">
          <EmptyChartState message="Charts will populate as duties are added" />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="mb-2 grid grid-cols-[180px_repeat(12,minmax(0,1fr))] items-center gap-2">
              <p className="app-label">Instructor</p>
              {weeks.map((week) => (
                <p key={format(week, 'yyyy-MM-dd')} className="text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  {format(week, 'dd MMM')}
                </p>
              ))}
            </div>

            <div className="space-y-2">
              {matrix.map((row) => (
                <div key={row.id} className="grid grid-cols-[180px_repeat(12,minmax(0,1fr))] items-center gap-2">
                  <p className="truncate pr-2 text-sm font-medium text-gray-700">{row.name}</p>
                  {row.cells.map((cell) => (
                    <div
                      key={`${row.id}-${cell.weekKey}`}
                      className={`h-8 w-8 rounded-sm ${getCellClass(cell.count)} cursor-pointer justify-self-center`}
                      title={`${row.name} - Week of ${format(cell.weekStart, 'dd MMM yyyy')}: ${cell.count} duties`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-600">
        <span>Less</span>
        <span className="h-3 w-3 rounded-sm bg-gray-100" />
        <span className="h-3 w-3 rounded-sm bg-blue-100" />
        <span className="h-3 w-3 rounded-sm bg-blue-300" />
        <span className="h-3 w-3 rounded-sm bg-blue-500" />
        <span className="h-3 w-3 rounded-sm bg-blue-700" />
        <span>More</span>
      </div>
    </section>
  );
}

export default memo(DutyHeatmap);
