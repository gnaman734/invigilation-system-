import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ClipboardList, Clock, Download, User } from 'lucide-react';
import { isSameMonth, startOfMonth, subMonths } from 'date-fns';
import StatsCard from '../shared/StatsCard';
import { calculatePunctualityPercentage } from '../../lib/utils/punctuality';
import { calculateAverage, DEFAULT_LATE_ARRIVAL_THRESHOLD, flagLateInstructors, getWorkloadStatus } from '../../lib/utils/workload';
import { supabase } from '../../lib/supabase';
import { useToast } from '../shared/Toast';
import ErrorBoundary from '../shared/ErrorBoundary';
import { useRealtime } from '../../lib/hooks/useRealtime';
import { useDebouncedValue } from '../../lib/hooks/useDebouncedValue';

const DutyDistributionChart = lazy(() => import('./DutyDistributionChart'));
const PunctualityTrendChart = lazy(() => import('./PunctualityTrendChart'));
const InstructorPerformanceChart = lazy(() => import('./InstructorPerformanceChart'));
const DutyHeatmap = lazy(() => import('./DutyHeatmap'));

function matchesMonth(dateValue, monthDate) {
  if (!dateValue) {
    return false;
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return isSameMonth(parsed, monthDate);
}

function toCsvValue(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

function ChartSkeleton() {
  return <div className="skeleton h-[300px] rounded-xl" />;
}

function animateNumber(from, to, onFrame) {
  const start = performance.now();
  const duration = 500;

  const tick = (time) => {
    const progress = Math.min(1, (time - start) / duration);
    const value = from + (to - from) * progress;
    onFrame(progress < 1 ? value : to);

    if (progress < 1) {
      window.requestAnimationFrame(tick);
    }
  };

  window.requestAnimationFrame(tick);
}

export default function AnalyticsDashboard({ instructors = [], duties = [], onRefresh = null }) {
  const { addToast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [animatedMetrics, setAnimatedMetrics] = useState({ dutiesCurrent: 0, punctualityCurrent: 0, flaggedCount: 0 });
  const [highlightedCards, setHighlightedCards] = useState({});
  const previousMetricsRef = useRef({ dutiesCurrent: 0, punctualityCurrent: 0, flaggedCount: 0 });
  const debouncedRefreshTick = useDebouncedValue(refreshTick, 200);

  const metrics = useMemo(() => {
    const currentMonth = startOfMonth(new Date());
    const previousMonth = startOfMonth(subMonths(new Date(), 1));

    const currentMonthDuties = duties.filter((duty) => matchesMonth(duty.exam_date, currentMonth));
    const previousMonthDuties = duties.filter((duty) => matchesMonth(duty.exam_date, previousMonth));

    const currentOnTime = currentMonthDuties.filter((duty) => duty.status === 'on-time').length;
    const previousOnTime = previousMonthDuties.filter((duty) => duty.status === 'on-time').length;

    const currentPunctuality = calculatePunctualityPercentage(currentOnTime, currentMonthDuties.length);
    const previousPunctuality = calculatePunctualityPercentage(previousOnTime, previousMonthDuties.length);

    const currentActivityMap = currentMonthDuties.reduce((accumulator, duty) => {
      const key = duty.instructor_id;
      if (!key) {
        return accumulator;
      }

      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});

    const previousActivityMap = previousMonthDuties.reduce((accumulator, duty) => {
      const key = duty.instructor_id;
      if (!key) {
        return accumulator;
      }

      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});

    const mostActive = instructors
      .map((instructor) => ({
        ...instructor,
        monthDuties: currentActivityMap[instructor.instructor_id] ?? 0,
        previousMonthDuties: previousActivityMap[instructor.instructor_id] ?? 0,
      }))
      .sort((first, second) => second.monthDuties - first.monthDuties)[0];

    const average = calculateAverage(instructors);
    const overloaded = instructors.filter((instructor) => getWorkloadStatus(instructor.total_duties, average) === 'overloaded');
    const flaggedLate = flagLateInstructors(instructors, DEFAULT_LATE_ARRIVAL_THRESHOLD);
    const flaggedIds = new Set([...overloaded, ...flaggedLate].map((instructor) => instructor.instructor_id));

    return {
      dutiesCurrent: currentMonthDuties.length,
      dutiesPrevious: previousMonthDuties.length,
      punctualityCurrent: currentPunctuality,
      punctualityPrevious: previousPunctuality,
      mostActive,
      flaggedCount: flaggedIds.size,
    };
  }, [duties, instructors]);

  useEffect(() => {
    const previous = previousMetricsRef.current;
    const nextHighlights = {};

    ['dutiesCurrent', 'punctualityCurrent', 'flaggedCount'].forEach((key) => {
      if (previous[key] !== metrics[key]) {
        nextHighlights[key] = true;
        animateNumber(previous[key], metrics[key], (value) => {
          setAnimatedMetrics((state) => ({ ...state, [key]: value }));
        });
      }
    });

    if (Object.keys(nextHighlights).length > 0) {
      setHighlightedCards((state) => ({ ...state, ...nextHighlights }));
      const timeoutId = window.setTimeout(() => setHighlightedCards({}), 700);
      previousMetricsRef.current = {
        dutiesCurrent: metrics.dutiesCurrent,
        punctualityCurrent: metrics.punctualityCurrent,
        flaggedCount: metrics.flaggedCount,
      };
      return () => window.clearTimeout(timeoutId);
    }

    previousMetricsRef.current = {
      dutiesCurrent: metrics.dutiesCurrent,
      punctualityCurrent: metrics.punctualityCurrent,
      flaggedCount: metrics.flaggedCount,
    };

    return undefined;
  }, [metrics]);

  useEffect(() => {
    if (typeof onRefresh === 'function' && debouncedRefreshTick > 0) {
      onRefresh();
    }
  }, [debouncedRefreshTick, onRefresh]);

  const handleDutyChange = () => {
    setRefreshTick((previous) => previous + 1);
  };

  const handleInstructorChange = () => {
    setRefreshTick((previous) => previous + 1);
  };

  const handleAnalyticsChange = () => {
    setRefreshTick((previous) => previous + 1);
  };

  useRealtime({
    onDutyChange: handleDutyChange,
    onInstructorChange: handleInstructorChange,
    onAnalyticsChange: handleAnalyticsChange,
  });

  const handleExportCsv = async () => {
    setExporting(true);

    try {
      const { data, error } = await supabase
        .from('duties_detailed')
        .select('*')
        .order('exam_date', { ascending: true })
        .order('reporting_time', { ascending: true });

      if (error) {
        throw error;
      }

      const headers = ['Instructor', 'Department', 'Subject', 'Date', 'Room', 'Reporting Time', 'Arrival Time', 'Status'];
      const rows = (data ?? []).map((duty) => [
        duty.instructor_name ?? '',
        duty.department ?? '',
        duty.subject ?? '',
        duty.exam_date ?? '',
        [duty.room_number, duty.building].filter(Boolean).join(' '),
        duty.reporting_time ?? '',
        duty.arrival_time ?? '',
        duty.status ?? '',
      ]);

      const csvLines = [headers.map(toCsvValue).join(','), ...rows.map((row) => row.map(toCsvValue).join(','))];
      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const datePart = new Date().toISOString().slice(0, 10);

      anchor.href = url;
      anchor.download = `invigilation-report-${datePart}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      addToast({ type: 'success', message: 'Report exported successfully' });
    } catch (caughtError) {
      addToast({ type: 'error', message: caughtError?.message ?? 'Failed to export report' });
    } finally {
      setExporting(false);
    }
  };

  const dutiesTrendDirection = metrics.dutiesCurrent >= metrics.dutiesPrevious ? 'up' : 'down';
  const punctualityTrendDirection = metrics.punctualityCurrent >= metrics.punctualityPrevious ? 'up' : 'down';
  const activeTrendDirection =
    (metrics.mostActive?.monthDuties ?? 0) >= (metrics.mostActive?.previousMonthDuties ?? 0) ? 'up' : 'down';

  return (
    <section className="fade-up space-y-6">
      <div className="app-card card-interactive flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl text-white/85">Analytics & Insights</h2>
          <p className="text-sm text-white/30">Real-time performance overview</p>
        </div>
        <button type="button" onClick={handleExportCsv} className="app-btn-ghost inline-flex items-center gap-2" disabled={exporting}>
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className={`transition-colors duration-500 ${highlightedCards.dutiesCurrent ? 'ring-1 ring-amber-500/20 rounded-2xl' : ''}`}>
          <StatsCard
            title="Total Duties This Month"
            value={Math.round(animatedMetrics.dutiesCurrent)}
            subtitle="Scheduled this month"
            color="blue"
            icon={ClipboardList}
            trend={`${Math.abs(metrics.dutiesCurrent - metrics.dutiesPrevious)} vs last month`}
            trendDirection={dutiesTrendDirection}
          />
        </div>
        <div className={`transition-colors duration-500 ${highlightedCards.punctualityCurrent ? 'ring-1 ring-amber-500/20 rounded-2xl' : ''}`}>
          <StatsCard
            title="Overall Punctuality %"
            value={`${Number(animatedMetrics.punctualityCurrent).toFixed(2)}%`}
            subtitle="On-time arrival rate"
            color="green"
            icon={Clock}
            trend={`${Math.abs(metrics.punctualityCurrent - metrics.punctualityPrevious).toFixed(2)}% vs last month`}
            trendDirection={punctualityTrendDirection}
          />
        </div>
        <StatsCard
          title="Most Active Instructor"
          value={metrics.mostActive?.name ?? '--'}
          subtitle={`${metrics.mostActive?.monthDuties ?? 0} duties this month`}
          color="purple"
          icon={User}
          trend={`${Math.abs((metrics.mostActive?.monthDuties ?? 0) - (metrics.mostActive?.previousMonthDuties ?? 0))} vs last month`}
          trendDirection={activeTrendDirection}
        />
        <div className={`transition-colors duration-500 ${highlightedCards.flaggedCount ? 'ring-1 ring-amber-500/20 rounded-2xl' : ''}`}>
          <StatsCard
            title="Flagged Instructors"
            value={Math.round(animatedMetrics.flaggedCount)}
            subtitle="Overloaded + repeat late"
            color="red"
            icon={AlertTriangle}
            trend={`${metrics.flaggedCount} currently flagged`}
            trendDirection={metrics.flaggedCount > 0 ? 'down' : 'up'}
          />
        </div>
      </div>

      <ErrorBoundary>
        <Suspense fallback={<ChartSkeleton />}>
          <div className="grid gap-6 xl:grid-cols-2">
            <DutyDistributionChart instructors={instructors} />
            <PunctualityTrendChart duties={duties} />
          </div>
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary>
        <Suspense fallback={<ChartSkeleton />}>
          <InstructorPerformanceChart instructors={instructors} />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary>
        <Suspense fallback={<ChartSkeleton />}>
          <DutyHeatmap instructors={instructors} duties={duties} />
        </Suspense>
      </ErrorBoundary>
    </section>
  );
}
