import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarX,
  ChevronDown,
  ClipboardList,
  Clock3,
  Filter,
  Lightbulb,
  MapPin,
  Shield,
} from 'lucide-react';
import { addDays, format, isSameDay, isSameMonth, isTomorrow, isWithinInterval, parseISO, startOfDay, subMonths } from 'date-fns';
import DutyCard from '../../components/instructor/DutyCard';
import { useDuties } from '../../lib/hooks/useDuties';
import { useInstructors } from '../../lib/hooks/useInstructors';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/shared/Toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { formatTimeDisplay, getDeadline, getMinutesLate, getStatus } from '../../lib/utils/punctuality';
import { sanitizeText } from '../../lib/utils/sanitize';
import { supabase } from '../../lib/supabase';

function flattenDutyGroups(groups = []) {
  return groups.flatMap((group) => group.duties ?? []);
}

function isDateInMonth(value, monthDate) {
  if (!value) {
    return false;
  }

  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return isSameMonth(parsed, monthDate);
}

function formatClockTime(dateValue) {
  const hours = String(dateValue.getHours()).padStart(2, '0');
  const minutes = String(dateValue.getMinutes()).padStart(2, '0');
  const seconds = String(dateValue.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function buildDeadlineDate(duty) {
  const deadlineTime = getDeadline(duty.reporting_time);
  if (!deadlineTime || !duty.exam_date) {
    return null;
  }

  const parsed = new Date(`${duty.exam_date}T${deadlineTime}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildReportingDate(duty) {
  if (!duty?.exam_date || !duty?.reporting_time) {
    return null;
  }

  const parsed = new Date(`${duty.exam_date}T${duty.reporting_time}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildDutyInterval(duty) {
  if (!duty?.exam_date) {
    return null;
  }

  const startRaw = duty.start_time || duty.reporting_time;
  if (!startRaw) {
    return null;
  }

  const start = new Date(`${duty.exam_date}T${startRaw}`);
  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const endRaw = duty.end_time;
  let end = endRaw ? new Date(`${duty.exam_date}T${endRaw}`) : new Date(start.getTime() + 3 * 60 * 60 * 1000);
  if (Number.isNaN(end.getTime()) || end <= start) {
    end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  }

  return { start, end };
}

function DutyCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#111118] p-5">
      <div className="skeleton h-4 w-40" />
      <div className="skeleton mt-2 h-3 w-52" />
      <div className="mt-4 h-px bg-white/5" />
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="skeleton h-10" />
        <div className="skeleton h-10" />
        <div className="skeleton h-10" />
      </div>
      <div className="skeleton mt-4 h-9" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="rounded-2xl border border-white/8 bg-[#111118] p-6">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton mt-2 h-8 w-48" />
        <div className="skeleton mt-3 h-6 w-36" />
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="skeleton h-16" />
          <div className="skeleton h-16" />
          <div className="skeleton h-16" />
        </div>
      </div>
      <div className="mt-8 space-y-3">
        <DutyCardSkeleton />
        <DutyCardSkeleton />
        <DutyCardSkeleton />
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="py-16 text-center">
      <Icon className="mx-auto h-10 w-10 text-white/10" />
      <p className="mt-3 text-sm text-white/30">{title}</p>
      <p className="mt-1 text-xs text-white/20">{subtitle}</p>
    </div>
  );
}

const FILTER_OPTIONS = ['All', 'This Month', 'Last Month', 'On Time', 'Late', 'Pending'];
const UPCOMING_FILTER_OPTIONS = ['All', 'Today', 'Tomorrow', 'This Week'];

export default function InstructorDashboard() {
  const { addToast } = useToast();
  const user = useAuthStore((state) => state.user);
  const { upcomingDuties, pastDuties, loading, error, markArrival, processingDutyIds, fetchDutyWithExamContext } = useDuties();
  const { instructor, stats, punctualityPercentage, loading: profileLoading } = useInstructors();

  const [isPastOpen, setIsPastOpen] = useState(false);
  const [activeUpcomingFilter, setActiveUpcomingFilter] = useState('All');
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedDuty, setSelectedDuty] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [liveNow, setLiveNow] = useState(new Date());
  const [dashboardNow, setDashboardNow] = useState(new Date());
  const [submittingArrival, setSubmittingArrival] = useState(false);
  const [arrivalError, setArrivalError] = useState('');
  const [highlightedDutyId, setHighlightedDutyId] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState('unsupported');
  const sentReminderKeysRef = useRef(new Set());
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [recentRequests, setRecentRequests] = useState([]);
  const [requestTablesReady, setRequestTablesReady] = useState(true);
  const [swapForm, setSwapForm] = useState({ duty_id: '', reason: '', preferred_date: '' });
  const [issueForm, setIssueForm] = useState({ duty_id: '', category: 'room_issue', message: '' });
  const [showSkeleton, setShowSkeleton] = useState(true);

  const loadRecentRequests = useCallback(async () => {
    if (!instructor?.instructor_id || !supabase) {
      return;
    }

    const [swapRes, issueRes] = await Promise.all([
      supabase
        .from('duty_change_requests')
        .select('id, duty_id, request_type, status, reason, created_at')
        .eq('instructor_id', instructor.instructor_id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('duty_issue_reports')
        .select('id, duty_id, category, status, message, created_at')
        .eq('instructor_id', instructor.instructor_id)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    if (swapRes.error || issueRes.error) {
      setRequestTablesReady(false);
      return;
    }

    const combined = [
      ...(swapRes.data ?? []).map((row) => ({ ...row, kind: 'swap' })),
      ...(issueRes.data ?? []).map((row) => ({ ...row, kind: 'issue' })),
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);

    setRequestTablesReady(true);
    setRecentRequests(combined);
  }, [instructor?.instructor_id]);

  const name = sanitizeText(instructor?.name ?? user?.user_metadata?.name ?? user?.email ?? 'Instructor');
  const department = sanitizeText(instructor?.department ?? user?.user_metadata?.department ?? 'Department');

  const upcomingFlat = useMemo(() => flattenDutyGroups(upcomingDuties), [upcomingDuties]);
  const pastFlat = useMemo(() => flattenDutyGroups(pastDuties), [pastDuties]);
  const allDuties = useMemo(() => [...upcomingFlat, ...pastFlat], [upcomingFlat, pastFlat]);

  const totalDuties = Number(stats?.total_duties ?? 0);
  const onTime = Number(stats?.on_time_arrivals ?? 0);
  const greeting = useMemo(() => {
    const hour = dashboardNow.getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  }, [dashboardNow]);
  const todayDutyCount = useMemo(() => allDuties.filter((duty) => {
    const parsed = duty.exam_date ? parseISO(duty.exam_date) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? isSameDay(parsed, dashboardNow) : false;
  }).length, [allDuties, dashboardNow]);

  const pendingTodayCount = useMemo(
    () => allDuties.filter((duty) => duty.status === 'pending' && (() => {
      const parsed = duty.exam_date ? parseISO(duty.exam_date) : null;
      return parsed && !Number.isNaN(parsed.getTime()) ? isSameDay(parsed, dashboardNow) : false;
    })()).length,
    [allDuties, dashboardNow]
  );

  const pendingUpcomingOptions = useMemo(
    () => upcomingFlat.filter((duty) => duty.status === 'pending'),
    [upcomingFlat]
  );

  const nextDuty = useMemo(() => {
    return [...upcomingFlat]
      .filter((duty) => duty.status === 'pending')
      .map((duty) => ({ duty, at: buildReportingDate(duty) }))
      .filter((item) => item.at)
      .sort((a, b) => a.at.getTime() - b.at.getTime())[0] ?? null;
  }, [upcomingFlat]);

  const filteredUpcomingGroups = useMemo(() => {
    if (activeUpcomingFilter === 'All') {
      return upcomingDuties;
    }

    const now = new Date();
    const weekEnd = addDays(startOfDay(now), 6);

    return upcomingDuties
      .map((group) => {
        const duties = (group.duties ?? []).filter((duty) => {
          const parsed = duty.exam_date ? parseISO(duty.exam_date) : null;
          if (!parsed || Number.isNaN(parsed.getTime())) {
            return false;
          }

          if (activeUpcomingFilter === 'Today') {
            return isSameDay(parsed, now);
          }

          if (activeUpcomingFilter === 'Tomorrow') {
            return isTomorrow(parsed);
          }

          if (activeUpcomingFilter === 'This Week') {
            return isWithinInterval(parsed, { start: startOfDay(now), end: weekEnd });
          }

          return true;
        });

        return { ...group, duties };
      })
      .filter((group) => (group.duties ?? []).length > 0);
  }, [upcomingDuties, activeUpcomingFilter]);

  const filteredUpcomingCount = useMemo(
    () => filteredUpcomingGroups.reduce((sum, group) => sum + (group.duties?.length ?? 0), 0),
    [filteredUpcomingGroups]
  );

  const nextDutyMinutes = useMemo(() => {
    if (!nextDuty?.at) return null;
    return Math.round((nextDuty.at.getTime() - dashboardNow.getTime()) / 60000);
  }, [nextDuty, dashboardNow]);

  const monthlyAnalytics = useMemo(() => {
    const thisMonthDate = dashboardNow;
    const lastMonthDate = subMonths(dashboardNow, 1);

    const thisMonthRows = allDuties.filter((duty) => isDateInMonth(duty.exam_date, thisMonthDate));
    const lastMonthRows = allDuties.filter((duty) => isDateInMonth(duty.exam_date, lastMonthDate));

    const thisMonthOnTime = thisMonthRows.filter((duty) => duty.status === 'on-time').length;
    const lastMonthOnTime = lastMonthRows.filter((duty) => duty.status === 'on-time').length;

    const thisMonthRate = thisMonthRows.length ? Math.round((thisMonthOnTime / thisMonthRows.length) * 100) : 0;
    const lastMonthRate = lastMonthRows.length ? Math.round((lastMonthOnTime / lastMonthRows.length) * 100) : 0;

    return {
      thisMonthCount: thisMonthRows.length,
      thisMonthRate,
      lastMonthRate,
      trend: thisMonthRate - lastMonthRate,
    };
  }, [allDuties, dashboardNow]);

  const operationalAlerts = useMemo(() => {
    const pendingUpcoming = upcomingFlat.filter((duty) => duty.status === 'pending');
    const intervalRows = pendingUpcoming
      .map((duty) => ({ duty, interval: buildDutyInterval(duty) }))
      .filter((item) => item.interval)
      .sort((a, b) => a.interval.start.getTime() - b.interval.start.getTime());

    const conflicts = [];
    for (let i = 1; i < intervalRows.length; i += 1) {
      const previous = intervalRows[i - 1];
      const current = intervalRows[i];
      if (current.interval.start < previous.interval.end) {
        conflicts.push({ a: previous.duty, b: current.duty });
      }
    }

    const next7DayPendingCount = pendingUpcoming.filter((duty) => {
      const parsed = duty.exam_date ? parseISO(duty.exam_date) : null;
      if (!parsed || Number.isNaN(parsed.getTime())) {
        return false;
      }
      return isWithinInterval(parsed, { start: startOfDay(dashboardNow), end: addDays(startOfDay(dashboardNow), 6) });
    }).length;

    return {
      conflicts,
      next7DayPendingCount,
      hasOverload: next7DayPendingCount > 6,
    };
  }, [upcomingFlat, dashboardNow]);

  const reliability = useMemo(() => {
    const total = Number(stats.total_duties ?? 0);
    const onTimeArrivals = Number(stats.on_time_arrivals ?? 0);
    const lateArrivals = Number(stats.late_arrivals ?? 0);
    const punctuality = Number.isFinite(Number(punctualityPercentage)) ? Number(punctualityPercentage) : 0;

    const experienceScore = Math.min(100, total * 5);
    const punctualityScore = Math.max(0, Math.min(100, punctuality));
    const penalty = Math.min(35, lateArrivals * 2);
    const weighted = Math.round((0.65 * punctualityScore) + (0.35 * experienceScore) - penalty);
    const score = Math.max(0, Math.min(100, weighted));

    let grade = 'C';
    if (score >= 85) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 55) grade = 'C';
    else grade = 'D';

    return {
      score,
      grade,
      onTimeArrivals,
      lateArrivals,
    };
  }, [stats.total_duties, stats.on_time_arrivals, stats.late_arrivals, punctualityPercentage]);

  const smartRecommendations = useMemo(() => {
    const items = [];

    if (operationalAlerts.conflicts.length > 0) {
      items.push('You have overlapping upcoming duties. Submit a swap request for one overlapping slot.');
    }

    if (operationalAlerts.hasOverload) {
      items.push(`High upcoming workload (${operationalAlerts.next7DayPendingCount} duties/7 days). Consider requesting one redistribution.`);
    }

    if (pendingTodayCount > 0) {
      items.push(`You have ${pendingTodayCount} pending duty${pendingTodayCount > 1 ? 'ies' : ''} today. Mark arrival on time to avoid late status.`);
    }

    if (reliability.score < 70) {
      items.push('Reliability score can improve by reducing late arrivals this week. Use reminder notifications and early check-ins.');
    }

    if (items.length === 0) {
      items.push('Great consistency. Keep your current schedule discipline and on-time check-ins.');
    }

    return items.slice(0, 3);
  }, [operationalAlerts, pendingTodayCount, reliability.score]);

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }

    const result = await window.Notification.requestPermission();
    setNotificationPermission(result);
    if (result === 'granted') {
      addToast({ type: 'success', message: 'Desktop reminders enabled.' });
      return;
    }
    addToast({ type: 'warning', message: 'Desktop reminders are blocked. You can still get in-app reminder toasts.' });
  };

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase();
    const thisMonth = new Date();
    const lastMonth = subMonths(new Date(), 1);

    return allDuties.filter((duty) => {
      if (activeFilter === 'This Month' && !isDateInMonth(duty.exam_date, thisMonth)) {
        return false;
      }

      if (activeFilter === 'Last Month' && !isDateInMonth(duty.exam_date, lastMonth)) {
        return false;
      }

      if (activeFilter === 'On Time' && duty.status !== 'on-time') {
        return false;
      }

      if (activeFilter === 'Late' && duty.status !== 'late') {
        return false;
      }

      if (activeFilter === 'Pending' && duty.status !== 'pending') {
        return false;
      }

      if (query && !String(duty.subject ?? '').toLowerCase().includes(query)) {
        return false;
      }

      return true;
    });
  }, [activeFilter, allDuties, search]);

  useEffect(() => {
    if (!modalOpen) {
      return undefined;
    }

    const timer = window.setInterval(() => setLiveNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [modalOpen]);

  useEffect(() => {
    const timer = window.setInterval(() => setDashboardNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (loading || profileLoading) {
      setShowSkeleton(true);
      return undefined;
    }

    const timer = window.setTimeout(() => setShowSkeleton(false), 400);
    return () => window.clearTimeout(timer);
  }, [loading, profileLoading]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }

    setNotificationPermission(window.Notification.permission);
  }, []);

  useEffect(() => {
    const pendingUpcoming = upcomingFlat.filter((duty) => duty.status === 'pending');

    pendingUpcoming.forEach((duty) => {
      const reportingDate = buildReportingDate(duty);
      if (!reportingDate) {
        return;
      }

      const minutesToReporting = Math.round((reportingDate.getTime() - dashboardNow.getTime()) / 60000);
      if (minutesToReporting <= 0) {
        return;
      }

      let bucket = null;
      let label = '';
      if (minutesToReporting <= 30) {
        bucket = '30m';
        label = 'T-30m';
      } else if (minutesToReporting <= 120) {
        bucket = '2h';
        label = 'T-2h';
      } else if (minutesToReporting <= 1440) {
        bucket = '24h';
        label = 'T-24h';
      }

      if (!bucket) {
        return;
      }

      const uniqueKey = `${duty.duty_id}:${bucket}`;
      if (sentReminderKeysRef.current.has(uniqueKey)) {
        return;
      }

      sentReminderKeysRef.current.add(uniqueKey);

      const roomLabel = sanitizeText(duty.room_number || '--');
      addToast({ type: 'info', message: `${label} reminder: ${sanitizeText(duty.subject || 'Duty')} in room ${roomLabel}` });

      if (notificationPermission === 'granted' && typeof window !== 'undefined' && 'Notification' in window) {
        // eslint-disable-next-line no-new
        new window.Notification('Duty Reminder', {
          body: `${label}: ${sanitizeText(duty.subject || 'Duty')} at ${formatTimeDisplay(duty.reporting_time)} in room ${roomLabel}`,
          tag: `duty-reminder-${uniqueKey}`,
        });
      }
    });
  }, [upcomingFlat, dashboardNow, addToast, notificationPermission]);

  useEffect(() => {
    loadRecentRequests();
  }, [loadRecentRequests]);

  useEffect(() => {
    const handleJump = (event) => {
      const dutyId = event.detail?.dutyId;
      if (!dutyId) {
        return;
      }

      setHighlightedDutyId(dutyId);
      const target = document.getElementById(`duty-${dutyId}`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      window.setTimeout(() => setHighlightedDutyId(null), 2000);
    };

    window.addEventListener('instructor:jump-to-duty', handleJump);
    return () => window.removeEventListener('instructor:jump-to-duty', handleJump);
  }, []);

  const openMarkArrivalModal = (duty) => {
    setArrivalError('');
    setSelectedDuty(duty);
    setLiveNow(new Date());
    setModalOpen(true);
  };

  const submitSwapRequest = async () => {
    if (!swapForm.duty_id || !swapForm.reason.trim()) {
      setRequestError('Select a duty and provide a reason.');
      return;
    }

    if (!instructor?.instructor_id || !supabase) {
      setRequestError('Unable to submit request right now.');
      return;
    }

    setRequestLoading(true);
    setRequestError('');

    const { error: insertError } = await supabase.from('duty_change_requests').insert({
      duty_id: swapForm.duty_id,
      instructor_id: instructor.instructor_id,
      request_type: 'swap',
      reason: sanitizeText(swapForm.reason),
      preferred_duty_date: swapForm.preferred_date || null,
      status: 'pending',
    });

    if (insertError) {
      setRequestLoading(false);
      setRequestError('Failed to submit swap request.');
      return;
    }

    addToast({ type: 'success', message: 'Swap request submitted.' });
    setRequestLoading(false);
    setSwapModalOpen(false);
    setRequestError('');
    setSwapForm({ duty_id: '', reason: '', preferred_date: '' });
    await loadRecentRequests();
  };

  const submitIssueReport = async () => {
    if (!issueForm.duty_id || !issueForm.message.trim()) {
      setRequestError('Select a duty and enter issue details.');
      return;
    }

    if (!instructor?.instructor_id || !supabase) {
      setRequestError('Unable to submit issue right now.');
      return;
    }

    setRequestLoading(true);
    setRequestError('');

    const { error: insertError } = await supabase.from('duty_issue_reports').insert({
      duty_id: issueForm.duty_id,
      instructor_id: instructor.instructor_id,
      category: issueForm.category,
      message: sanitizeText(issueForm.message),
      status: 'open',
    });

    if (insertError) {
      setRequestLoading(false);
      setRequestError('Failed to submit issue report.');
      return;
    }

    addToast({ type: 'success', message: 'Issue report submitted.' });
    setRequestLoading(false);
    setIssueModalOpen(false);
    setRequestError('');
    setIssueForm({ duty_id: '', category: 'room_issue', message: '' });
    await loadRecentRequests();
  };

  const closeMarkArrivalModal = () => {
    if (submittingArrival) {
      return;
    }

    setModalOpen(false);
    setSelectedDuty(null);
    setArrivalError('');
  };

  const handleConfirmArrival = async () => {
    if (!selectedDuty) {
      return;
    }

    setSubmittingArrival(true);
    setArrivalError('');

    const arrivalRaw = formatClockTime(new Date());
    const result = await markArrival(selectedDuty.duty_id, arrivalRaw);

    if (result?.error) {
      setArrivalError(result.error);
      setSubmittingArrival(false);
      return;
    }

    const predictedStatus = getStatus(selectedDuty.reporting_time, arrivalRaw);
    const lateMinutes = getMinutesLate(selectedDuty.reporting_time, arrivalRaw);

    if (predictedStatus === 'on-time') {
      addToast({ type: 'success', message: 'Marked on time' });
    } else {
      addToast({ type: 'warning', message: `Marked late — ${lateMinutes} mins after deadline` });
    }

    setSubmittingArrival(false);
    setModalOpen(false);
    setSelectedDuty(null);
  };

  const modalDeadline = selectedDuty ? buildDeadlineDate(selectedDuty) : null;
  const minutesToDeadline = modalDeadline ? Math.round((modalDeadline.getTime() - liveNow.getTime()) / 60000) : 0;
  const isLatePreview = Boolean(modalDeadline) && minutesToDeadline < 0;

  const clockClass = isLatePreview
    ? 'text-red-400'
    : minutesToDeadline <= 5
      ? 'text-amber-400'
      : 'text-green-400';

  if (showSkeleton || loading || profileLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <section className="card-interactive rounded-2xl border border-white/8 bg-[#111118] p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/35">{greeting}</p>
              <h1 className="mt-0.5 font-serif text-2xl text-white/90">{name}</h1>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-white/40">
                <Building2 className="h-3 w-3" />
                {department}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-3">
              <div className="rounded-xl border border-white/8 bg-white/4 px-2 py-2 text-center transition-all duration-200 hover:border-white/12 hover:bg-white/6 sm:px-4 sm:py-3">
                <p className="font-serif text-xl font-bold text-white/85">{totalDuties}</p>
                <p className="mt-0.5 text-xs text-white/30">Total Duties</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/4 px-2 py-2 text-center transition-all duration-200 hover:border-white/12 hover:bg-white/6 sm:px-4 sm:py-3">
                <p className="font-serif text-xl font-bold text-green-400">{onTime}</p>
                <p className="mt-0.5 text-xs text-white/30">On Time</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/4 px-2 py-2 text-center transition-all duration-200 hover:border-white/12 hover:bg-white/6 sm:px-4 sm:py-3">
                <p className="font-serif text-xl font-bold text-amber-400">{punctualityPercentage}%</p>
                <p className="mt-0.5 text-xs text-white/30">Punctuality %</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-3 lg:grid-cols-[1.5fr,1fr,1fr]">
          <div className="rounded-2xl border border-white/8 bg-[#111118] p-4">
            <p className="text-xs text-white/35">Next Duty</p>
            {nextDuty?.duty ? (
              <>
                <p className="mt-1 text-sm font-semibold text-white/85">{sanitizeText(nextDuty.duty.subject)}</p>
                <p className="mt-1 text-xs text-white/40">{nextDuty.duty.exam_date ? format(parseISO(nextDuty.duty.exam_date), 'EEE, dd MMM') : '--'} • {formatTimeDisplay(nextDuty.duty.reporting_time)}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-white/40"><MapPin className="h-3 w-3" />{sanitizeText(nextDuty.duty.room_number)}{nextDuty.duty.building ? `, ${sanitizeText(nextDuty.duty.building)}` : ''}</p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-300">
                  <Clock3 className="h-3.5 w-3.5" />
                  {nextDutyMinutes === null ? '--' : nextDutyMinutes >= 0 ? `${nextDutyMinutes} min remaining` : `${Math.abs(nextDutyMinutes)} min overdue`}
                </div>
                <button
                  type="button"
                  className="btn-press mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:border-amber-500/30 hover:text-amber-300"
                  onClick={() => openMarkArrivalModal(nextDuty.duty)}
                  disabled={processingDutyIds.includes(nextDuty.duty.duty_id)}
                >
                  {processingDutyIds.includes(nextDuty.duty.duty_id) ? 'Processing...' : 'Mark Arrival'}
                </button>
              </>
            ) : (
              <p className="mt-2 text-xs text-white/35">No pending upcoming duty.</p>
            )}
            <div className="mt-3 flex items-center justify-between rounded-xl border border-white/8 bg-white/5 px-2.5 py-2 text-xs">
              <span className="text-white/45">
                Desktop reminders: {notificationPermission === 'granted' ? 'On' : notificationPermission === 'denied' ? 'Blocked' : notificationPermission === 'default' ? 'Off' : 'Unsupported'}
              </span>
              {notificationPermission === 'default' ? (
                <button type="button" onClick={requestNotificationPermission} className="text-amber-300 hover:text-amber-200">Enable</button>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#111118] p-4">
            <p className="text-xs text-white/35">Today</p>
            <p className="mt-1 text-2xl font-bold text-white/85">{todayDutyCount}</p>
            <p className="text-xs text-white/30">Assigned duties today</p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#111118] p-4">
            <p className="text-xs text-white/35">Pending Today</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">{pendingTodayCount}</p>
            <p className="text-xs text-white/30">Need arrival mark</p>
          </div>
        </section>

        <section className="mt-6 grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-[#111118] p-4">
            <p className="text-xs text-white/35">This Month Duties</p>
            <p className="mt-1 text-2xl font-bold text-white/85">{monthlyAnalytics.thisMonthCount}</p>
            <p className="text-xs text-white/30">Assignments this month</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-[#111118] p-4">
            <p className="text-xs text-white/35">This Month On-time</p>
            <p className="mt-1 text-2xl font-bold text-green-400">{monthlyAnalytics.thisMonthRate}%</p>
            <p className="text-xs text-white/30">On-time rate</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-[#111118] p-4">
            <p className="text-xs text-white/35">Month Trend</p>
            <p className={`mt-1 text-2xl font-bold ${monthlyAnalytics.trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {monthlyAnalytics.trend >= 0 ? '+' : ''}{monthlyAnalytics.trend}%
            </p>
            <p className="text-xs text-white/30">vs last month</p>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/8 bg-[#111118] p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-medium text-white/70">Operational Alerts</p>
          </div>

          {operationalAlerts.conflicts.length === 0 && !operationalAlerts.hasOverload ? (
            <p className="text-xs text-white/35">No conflicts or overload risks detected.</p>
          ) : (
            <div className="space-y-2">
              {operationalAlerts.conflicts.slice(0, 3).map((item, index) => (
                <div key={`${item.a.duty_id}-${item.b.duty_id}-${index}`} className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  Possible conflict: {sanitizeText(item.a.subject || 'Duty')} and {sanitizeText(item.b.subject || 'Duty')} overlap on {item.a.exam_date || '--'}.
                </div>
              ))}

              {operationalAlerts.hasOverload ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  Workload alert: {operationalAlerts.next7DayPendingCount} pending duties in next 7 days.
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-3 lg:grid-cols-[1fr,1.4fr]">
          <div className="rounded-2xl border border-white/8 bg-[#111118] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-400" />
              <p className="text-sm font-medium text-white/70">Reliability Score</p>
            </div>
            <p className="text-3xl font-bold text-white/90">{reliability.score}</p>
            <p className="mt-1 text-xs text-white/35">Grade {reliability.grade} • On-time {reliability.onTimeArrivals} • Late {reliability.lateArrivals}</p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#111118] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-300" />
              <p className="text-sm font-medium text-white/70">Smart Recommendations</p>
            </div>
            <div className="space-y-2">
              {smartRecommendations.map((tip, index) => (
                <p key={`${tip}-${index}`} className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs text-white/60">{tip}</p>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/8 bg-[#111118] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-white/70">Duty Requests</p>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-press rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/65 hover:border-amber-500/30 hover:text-amber-300" onClick={() => { setRequestError(''); setSwapModalOpen(true); }}>Request Swap</button>
              <button type="button" className="btn-press rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/65 hover:border-amber-500/30 hover:text-amber-300" onClick={() => { setRequestError(''); setIssueModalOpen(true); }}>Report Issue</button>
            </div>
          </div>

          {!requestTablesReady ? (
            <p className="text-xs text-amber-300">Request tables are not configured yet. Ask admin to run setup SQL for Task 3.</p>
          ) : recentRequests.length === 0 ? (
            <p className="text-xs text-white/35">No recent requests.</p>
          ) : (
            <div className="space-y-2">
              {recentRequests.map((row) => (
                <div key={`${row.kind}-${row.id}`} className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs text-white/65">
                  <p className="text-white/75">{row.kind === 'swap' ? 'Swap request' : 'Issue report'} • {row.status}</p>
                  <p className="mt-0.5 text-white/40">{row.reason || row.message || 'No details'}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white/60">Upcoming Duties</h2>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
              {filteredUpcomingCount}
            </span>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {UPCOMING_FILTER_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setActiveUpcomingFilter(option)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-all duration-200 ${
                  activeUpcomingFilter === option
                    ? 'border-amber-500/30 bg-amber-500/8 text-amber-400'
                    : 'border-white/8 text-white/40 hover:border-white/15 hover:text-white/60'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          {filteredUpcomingCount === 0 ? (
            <EmptyState icon={CalendarX} title="No upcoming duties" subtitle="You'll be notified when assigned" />
          ) : (
            filteredUpcomingGroups.map((group) => (
              <div key={group.dateKey} className="mt-6">
                <div className="mb-3 mt-6 flex items-center gap-3">
                  <p className="text-xs font-medium uppercase tracking-widest text-white/25">{group.dateLabel}</p>
                  <div className="h-px flex-1 bg-white/5" />
                </div>

                <div>
                  {(group.duties ?? []).map((duty) => (
                    <DutyCard
                      key={duty.duty_id}
                      duty={duty}
                      onOpenMarkArrival={openMarkArrivalModal}
                      isProcessing={processingDutyIds.includes(duty.duty_id)}
                      highlight={highlightedDutyId === duty.duty_id}
                      now={dashboardNow}
                      showReminderHints
                      onLoadExamContext={fetchDutyWithExamContext}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

        <section className="mt-8">
          <button
            type="button"
            onClick={() => setIsPastOpen((previous) => !previous)}
            className="btn-press flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#111118] px-4 py-3 text-left transition-all duration-200 hover:border-white/14"
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium text-white/60">
              Past Duties
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/35">{pastFlat.length}</span>
            </span>
            <ChevronDown className={`h-4 w-4 text-white/35 transition-all duration-200 ${isPastOpen ? 'rotate-180' : ''}`} />
          </button>

          <div className={`overflow-hidden transition-all duration-500 ${isPastOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            {pastDuties.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No duty history yet" subtitle="Past duties will appear here" />
            ) : (
              <div>
                {pastDuties.map((group) => (
                  <div key={group.dateKey} className="mt-6">
                    <div className="mb-3 mt-6 flex items-center gap-3">
                      <p className="text-xs font-medium uppercase tracking-widest text-white/25">{group.dateLabel}</p>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>

                    <div>
                      {(group.duties ?? []).map((duty) => (
                        <DutyCard key={duty.duty_id} duty={duty} isPast highlight={highlightedDutyId === duty.duty_id} now={dashboardNow} onLoadExamContext={fetchDutyWithExamContext} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-8">
          <h3 className="mb-4 text-sm font-medium text-white/60">Duty History with Filters</h3>

          <div className="mb-4 flex flex-wrap items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setActiveFilter(option)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-all duration-200 ${
                  activeFilter === option
                    ? 'border-amber-500/30 bg-amber-500/8 text-amber-400'
                    : 'border-white/8 text-white/40 hover:border-white/15 hover:text-white/60'
                }`}
              >
                {option}
              </button>
            ))}

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search subject"
              className="w-48 rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-xs text-white/60 outline-none transition-all duration-200 placeholder:text-white/20 focus:border-white/15"
            />

            <p className="ml-auto text-xs text-white/25">Showing {filteredHistory.length} duties</p>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-[#111118] py-12 text-center">
              <Filter className="mx-auto h-8 w-8 text-white/10" />
              <p className="mt-2 text-sm text-white/30">No duties match your filters</p>
            </div>
          ) : (
            <div key={`${activeFilter}-${search}`} className="fade-up">
              {filteredHistory.map((duty) => (
                <DutyCard
                  key={`history-${duty.duty_id}`}
                  duty={duty}
                  isPast={duty.status !== 'pending'}
                  onOpenMarkArrival={duty.status === 'pending' ? openMarkArrivalModal : undefined}
                  isProcessing={processingDutyIds.includes(duty.duty_id)}
                  highlight={highlightedDutyId === duty.duty_id}
                  now={dashboardNow}
                  showReminderHints={duty.status === 'pending'}
                  onLoadExamContext={fetchDutyWithExamContext}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog open={modalOpen} onOpenChange={closeMarkArrivalModal}>
        <DialogContent className="origin-bottom sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mark Arrival</DialogTitle>
          </DialogHeader>

          {selectedDuty ? (
            <div className="space-y-3 px-6 py-5">
              <p className="text-sm text-white/75">{sanitizeText(selectedDuty.subject)}</p>
              <p className="text-xs text-white/35">Reporting time: {formatTimeDisplay(selectedDuty.reporting_time)}</p>
              <p className="text-xs text-white/35">Deadline: {formatTimeDisplay(getDeadline(selectedDuty.reporting_time))}</p>

              <div className={`my-6 text-center font-semibold ${clockClass}`}>
                <p className="text-3xl">{format(liveNow, 'hh:mm:ss a')}</p>
                {!isLatePreview && modalDeadline ? <p className="mt-2 text-xs text-white/35">{minutesToDeadline} minutes remaining</p> : null}
              </div>

              {!isLatePreview ? (
                <div className="rounded-xl border border-green-500/15 bg-green-500/8 p-3 text-center">
                  <p className="text-sm text-green-400">You will be marked ON TIME</p>
                </div>
              ) : (
                <div className="rounded-xl border border-red-500/15 bg-red-500/8 p-3 text-center">
                  <p className="text-sm text-red-400">You will be marked LATE</p>
                  <p className="mt-1 text-xs text-red-400/60">{Math.abs(minutesToDeadline)} minutes after deadline</p>
                </div>
              )}

              {arrivalError ? <p className="text-center text-xs text-red-400">{arrivalError}</p> : null}
            </div>
          ) : null}

          <DialogFooter>
            <button
              type="button"
              onClick={closeMarkArrivalModal}
              className="btn-press rounded-xl border border-white/8 px-4 py-2 text-xs text-white/45 transition-all duration-200 hover:border-white/15 hover:text-white/65"
              disabled={submittingArrival}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmArrival}
              disabled={submittingArrival}
              className="btn-press inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-[#0A0A0F] transition-all duration-200 hover:bg-amber-400 disabled:opacity-70"
            >
              {submittingArrival ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/30 border-t-black" /> : null}
              {submittingArrival ? 'Marking...' : 'Confirm Arrival'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={swapModalOpen} onOpenChange={(open) => {
        setSwapModalOpen(open);
        if (!open) {
          setRequestError('');
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Duty Swap</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 px-6 py-4">
            <select className="app-input" value={swapForm.duty_id} onChange={(event) => setSwapForm((prev) => ({ ...prev, duty_id: event.target.value }))}>
              <option value="">Select duty</option>
              {pendingUpcomingOptions.map((duty) => (
                <option key={duty.duty_id} value={duty.duty_id}>{sanitizeText(duty.subject)} — {duty.exam_date}</option>
              ))}
            </select>
            <input className="app-input" type="date" value={swapForm.preferred_date} onChange={(event) => setSwapForm((prev) => ({ ...prev, preferred_date: event.target.value }))} />
            <textarea className="app-input min-h-24" placeholder="Reason for swap request" value={swapForm.reason} onChange={(event) => setSwapForm((prev) => ({ ...prev, reason: event.target.value }))} />
            {requestError ? <p className="text-xs text-red-400">{requestError}</p> : null}
          </div>
          <DialogFooter>
            <button type="button" className="btn-press rounded-xl border border-white/8 px-4 py-2 text-xs text-white/45" onClick={() => { setSwapModalOpen(false); setRequestError(''); }}>Cancel</button>
            <button type="button" className="btn-press rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-black" disabled={requestLoading} onClick={submitSwapRequest}>{requestLoading ? 'Submitting...' : 'Submit'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={issueModalOpen} onOpenChange={(open) => {
        setIssueModalOpen(open);
        if (!open) {
          setRequestError('');
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Report Duty Issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 px-6 py-4">
            <select className="app-input" value={issueForm.duty_id} onChange={(event) => setIssueForm((prev) => ({ ...prev, duty_id: event.target.value }))}>
              <option value="">Select duty</option>
              {pendingUpcomingOptions.map((duty) => (
                <option key={duty.duty_id} value={duty.duty_id}>{sanitizeText(duty.subject)} — {duty.exam_date}</option>
              ))}
            </select>
            <select className="app-input" value={issueForm.category} onChange={(event) => setIssueForm((prev) => ({ ...prev, category: event.target.value }))}>
              <option value="room_issue">Room issue</option>
              <option value="timing_issue">Timing issue</option>
              <option value="attendance_issue">Attendance issue</option>
              <option value="other">Other</option>
            </select>
            <textarea className="app-input min-h-24" placeholder="Describe the issue" value={issueForm.message} onChange={(event) => setIssueForm((prev) => ({ ...prev, message: event.target.value }))} />
            {requestError ? <p className="text-xs text-red-400">{requestError}</p> : null}
          </div>
          <DialogFooter>
            <button type="button" className="btn-press rounded-xl border border-white/8 px-4 py-2 text-xs text-white/45" onClick={() => { setIssueModalOpen(false); setRequestError(''); }}>Cancel</button>
            <button type="button" className="btn-press rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-black" disabled={requestLoading} onClick={submitIssueReport}>{requestLoading ? 'Submitting...' : 'Submit'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/*
FIXES APPLIED:
- Kept existing modal/open/clock/submit behavior as-is (already wired correctly).
- Updated mark-arrival failure path to display the actual returned error message.
- Updated modal error text binding to render `arrivalError` directly.

VERIFIED WORKING:
- Mark Arrival button still opens the same modal flow.
- Confirm action still calls `markArrival(selectedDuty.duty_id, arrivalRaw)`.
- Success/warning toasts still depend on computed punctuality.

REMAINING ISSUES:
- None identified in dashboard wiring; backend permission/data errors now surface clearly.
*/
