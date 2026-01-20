import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  BarChart2,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  Menu,
  Scale,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import StatsCard from '../../components/shared/StatsCard';
import { useAuthStore } from '../../store/authStore';
import { useDuties } from '../../lib/hooks/useDuties';
import { useInstructors } from '../../lib/hooks/useInstructors';
import {
  calculateAverage,
  DEFAULT_LATE_ARRIVAL_THRESHOLD,
  flagLateInstructors,
  getWorkloadStatus,
} from '../../lib/utils/workload';
import { calculatePunctualityPercentage } from '../../lib/utils/punctuality';
import ErrorBoundary from '../../components/shared/ErrorBoundary';
import { sanitizeText } from '../../lib/utils/sanitize';

const DutyManager = lazy(() => import('../../components/admin/DutyManager'));
const InstructorManager = lazy(() => import('../../components/admin/InstructorManager'));
const WorkloadPanel = lazy(() => import('../../components/admin/WorkloadPanel'));
const PunctualityPanel = lazy(() => import('../../components/admin/PunctualityPanel'));
const AnalyticsDashboard = lazy(() => import('../../components/admin/AnalyticsDashboard'));
const PendingRequests = lazy(() => import('../../components/admin/PendingRequests'));

const sections = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'requests', label: 'Requests', icon: UserPlus },
  { id: 'duties', label: 'Duties', icon: ClipboardList },
  { id: 'instructors', label: 'Instructors', icon: Users },
  { id: 'workload', label: 'Workload', icon: Scale },
  { id: 'punctuality', label: 'Punctuality', icon: Clock3 },
];

function isCurrentMonthDuty(dutyDate) {
  if (!dutyDate) {
    return false;
  }

  const parsed = new Date(dutyDate);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const now = new Date();
  return parsed.getMonth() === now.getMonth() && parsed.getFullYear() === now.getFullYear();
}

function TabBadge({ value }) {
  if (!value || value <= 0) {
    return null;
  }

  return (
    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
      {value}
    </span>
  );
}

export default function AdminDashboard() {
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openDutyCreateTrigger, setOpenDutyCreateTrigger] = useState(0);
  const [openInstructorCreateTrigger, setOpenInstructorCreateTrigger] = useState(0);
  const { allDuties, loading: dutiesLoading, error: dutiesError, fetchAllDuties } = useDuties();
  const {
    instructors,
    pendingRequests,
    loading: instructorsLoading,
    error: instructorsError,
    fetchAllInstructors,
    fetchPendingRequests,
  } = useInstructors();

  const adminName = useMemo(() => {
    return sanitizeText(user?.user_metadata?.name ?? user?.email ?? 'Admin');
  }, [user]);

  useEffect(() => {
    fetchAllDuties();
    fetchAllInstructors();
    fetchPendingRequests();
  }, [fetchAllDuties, fetchAllInstructors, fetchPendingRequests]);

  const panelLoading = dutiesLoading || instructorsLoading;
  const panelError = dutiesError || instructorsError;

  const averageWorkload = useMemo(() => calculateAverage(instructors), [instructors]);

  const pendingDutiesCount = useMemo(() => {
    return allDuties.filter((duty) => duty.status === 'pending').length;
  }, [allDuties]);

  const overloadedInstructors = useMemo(() => {
    return instructors.filter((instructor) => getWorkloadStatus(instructor.total_duties, averageWorkload) === 'overloaded');
  }, [instructors, averageWorkload]);

  const flaggedLateInstructors = useMemo(() => {
    return flagLateInstructors(instructors, DEFAULT_LATE_ARRIVAL_THRESHOLD);
  }, [instructors]);

  const flaggedInstructorCount = useMemo(() => {
    const ids = new Set();
    overloadedInstructors.forEach((instructor) => ids.add(instructor.instructor_id));
    flaggedLateInstructors.forEach((instructor) => ids.add(instructor.instructor_id));
    return ids.size;
  }, [overloadedInstructors, flaggedLateInstructors]);

  const totalDutiesThisMonth = useMemo(() => {
    return allDuties.filter((duty) => isCurrentMonthDuty(duty.exam_date)).length;
  }, [allDuties]);

  const overallPunctuality = useMemo(() => {
    const totalOnTime = instructors.reduce((sum, instructor) => sum + Number(instructor.on_time_arrivals ?? 0), 0);
    const totalDuties = instructors.reduce((sum, instructor) => sum + Number(instructor.total_duties ?? 0), 0);
    return calculatePunctualityPercentage(totalOnTime, totalDuties);
  }, [instructors]);

  const openCreateDutyModal = () => {
    setActiveSection('duties');
    setOpenDutyCreateTrigger((previous) => previous + 1);
    setSidebarOpen(false);
  };

  const openCreateInstructorModal = () => {
    setActiveSection('instructors');
    setOpenInstructorCreateTrigger((previous) => previous + 1);
    setSidebarOpen(false);
  };

  const navigateTab = (tabId) => {
    setActiveSection(tabId);
    setSidebarOpen(false);
  };

  const refreshAdminData = () => {
    fetchAllDuties();
    fetchAllInstructors();
  };

  const sectionFallback = <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <header className="app-card mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="app-label">Admin Panel</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#1A1A2E]">{adminName}</h1>
            <p className="mt-1 text-sm text-gray-600">Role: {role === 'admin' ? 'Admin' : role ?? '--'}</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A5F] px-3 py-2 text-sm font-medium text-white lg:hidden"
            onClick={() => setSidebarOpen((previous) => !previous)}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            Menu
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
        <aside className={`${sidebarOpen ? 'block' : 'hidden'} rounded-2xl bg-[#1E3A5F] p-4 text-white shadow-sm lg:block`}>
          <div className="mb-4 flex items-center gap-3 border-b border-white/20 pb-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Invigilation</p>
              <p className="text-xs text-blue-100">Operations Suite</p>
            </div>
          </div>

          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => navigateTab(section.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors duration-150 ease-in-out ${
                    activeSection === section.id ? 'bg-[#2E86AB] text-white' : 'text-blue-50 hover:bg-white/10'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </span>

                  {section.id === 'duties' ? <TabBadge value={pendingDutiesCount} /> : null}
                  {section.id === 'requests' ? <TabBadge value={pendingRequests.length} /> : null}
                  {section.id === 'workload' ? <TabBadge value={overloadedInstructors.length} /> : null}
                  {section.id === 'punctuality' ? <TabBadge value={flaggedLateInstructors.length} /> : null}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0">
          <div key={activeSection} className="animate-[fade-in-up_220ms_ease-out]">
          {activeSection === 'overview' ? (
            <ErrorBoundary>
              <Suspense fallback={sectionFallback}>
                <section className="space-y-6">
              <div className="app-card flex flex-wrap items-center gap-2 p-4">
                <button type="button" onClick={openCreateDutyModal} className="app-btn-primary">
                  Create Duty
                </button>
                <button type="button" onClick={openCreateInstructorModal} className="app-btn-ghost">
                  Add Instructor
                </button>
                <button type="button" onClick={() => navigateTab('requests')} className="app-btn-ghost">
                  Review Requests
                </button>
                <button type="button" onClick={() => navigateTab('workload')} className="app-btn-ghost">
                  View Full Workload
                </button>
                <button type="button" onClick={() => navigateTab('punctuality')} className="app-btn-ghost">
                  View Punctuality
                </button>
                <button type="button" onClick={() => navigateTab('analytics')} className="app-btn-ghost">
                  Open Analytics
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatsCard
                  title="Total Instructors"
                  value={instructors.length}
                  subtitle="Active faculty members"
                  color="blue"
                  onClick={() => navigateTab('instructors')}
                />
                <StatsCard
                  title="Total Duties This Month"
                  value={totalDutiesThisMonth}
                  subtitle="Scheduled in current month"
                  color="purple"
                  onClick={() => navigateTab('duties')}
                />
                <StatsCard
                  title="Overall Punctuality %"
                  value={`${overallPunctuality.toFixed(2)}%`}
                  subtitle="Across all instructors"
                  color="green"
                  onClick={() => navigateTab('punctuality')}
                />
                <StatsCard
                  title="Pending Requests"
                  value={pendingRequests.length}
                  subtitle="Awaiting admin review"
                  color="yellow"
                  icon={UserPlus}
                  onClick={() => navigateTab('requests')}
                />
                <StatsCard
                  title="Flagged Instructors"
                  value={flaggedInstructorCount}
                  subtitle="Overloaded + repeat late"
                  color="red"
                  onClick={() => navigateTab('workload')}
                />
              </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <WorkloadPanel
                      instructors={instructors}
                      loading={panelLoading}
                      error={panelError}
                      showOverviewTable
                      showLateFlags={false}
                      showUnderutilized={false}
                      lateThreshold={DEFAULT_LATE_ARRIVAL_THRESHOLD}
                    />
                    <PunctualityPanel
                      instructors={instructors}
                      duties={allDuties}
                      loading={panelLoading}
                      error={panelError}
                      showOverallStats
                      showTrendTable
                      showRecentLateArrivals={false}
                    />
                  </div>

                  <WorkloadPanel
                    instructors={instructors}
                    loading={panelLoading}
                    error={panelError}
                    showOverviewTable={false}
                    showLateFlags
                    showUnderutilized={false}
                    lateThreshold={DEFAULT_LATE_ARRIVAL_THRESHOLD}
                  />
                </section>
              </Suspense>
            </ErrorBoundary>
          ) : null}

          {activeSection === 'analytics' ? (
            <ErrorBoundary>
              <Suspense fallback={sectionFallback}>
                <AnalyticsDashboard instructors={instructors} duties={allDuties} onRefresh={refreshAdminData} />
              </Suspense>
            </ErrorBoundary>
          ) : null}
          {activeSection === 'requests' ? (
            <ErrorBoundary>
              <Suspense fallback={sectionFallback}>
                <PendingRequests />
              </Suspense>
            </ErrorBoundary>
          ) : null}
          {activeSection === 'duties' ? (
            <ErrorBoundary>
              <Suspense fallback={sectionFallback}>
                <DutyManager openCreateTrigger={openDutyCreateTrigger} />
              </Suspense>
            </ErrorBoundary>
          ) : null}
          {activeSection === 'instructors' ? (
            <ErrorBoundary>
              <Suspense fallback={sectionFallback}>
                <InstructorManager openCreateTrigger={openInstructorCreateTrigger} />
              </Suspense>
            </ErrorBoundary>
          ) : null}
          {activeSection === 'workload' ? (
            <ErrorBoundary>
              <Suspense fallback={sectionFallback}>
                <WorkloadPanel
                  instructors={instructors}
                  loading={panelLoading}
                  error={panelError}
                  showOverviewTable
                  showLateFlags
                  showUnderutilized
                  lateThreshold={DEFAULT_LATE_ARRIVAL_THRESHOLD}
                />
              </Suspense>
            </ErrorBoundary>
          ) : null}
          {activeSection === 'punctuality' ? (
            <ErrorBoundary>
              <Suspense fallback={sectionFallback}>
                <PunctualityPanel
                  instructors={instructors}
                  duties={allDuties}
                  loading={panelLoading}
                  error={panelError}
                  showOverallStats
                  showTrendTable
                  showRecentLateArrivals
                />
              </Suspense>
            </ErrorBoundary>
          ) : null}
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-7 border-t border-slate-200 bg-white p-2 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] lg:hidden">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => navigateTab(section.id)}
              className={`flex flex-col items-center gap-1 rounded-lg py-1 text-[11px] font-medium transition-colors duration-150 ease-in-out ${
                isActive ? 'bg-[#2E86AB]/15 text-[#1E3A5F]' : 'text-slate-500'
              }`}
            >
              <Icon className="h-4 w-4" />
              {section.label}
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={openCreateDutyModal}
        className="fixed bottom-20 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#1E3A5F] text-white shadow-lg transition-all duration-150 ease-in-out active:scale-95 lg:hidden"
        aria-label="Create duty"
      >
        <ClipboardList className="h-5 w-5" />
      </button>
    </div>
  );
}
