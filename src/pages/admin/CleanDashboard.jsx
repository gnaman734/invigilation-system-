import { lazy, Suspense, useMemo, useState } from 'react';
import {
  BarChart2,
  ClipboardList,
  Clock,
  DoorOpen,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Scale,
  UserPlus,
  Users,
} from 'lucide-react';
import { useInstructors } from '../../lib/hooks/useInstructors';
import { useDuties } from '../../lib/hooks/useDuties';
import ExamWizard from '../../components/admin/ExamWizard';

const AnalyticsDashboard = lazy(() => import('../../components/admin/AnalyticsDashboard'));
const PendingRequests = lazy(() => import('../../components/admin/PendingRequests'));
const WorkloadPanel = lazy(() => import('../../components/admin/WorkloadPanel'));
const PunctualityPanel = lazy(() => import('../../components/admin/PunctualityPanel'));
const ExamManagement = lazy(() => import('./ExamManagement'));
const FloorsManager = lazy(() => import('../../components/admin/FloorsManager'));
const RoomsManager = lazy(() => import('../../components/admin/RoomsManager'));
const DutiesEditorManager = lazy(() => import('../../components/admin/DutiesEditorManager'));
const InstructorSetupManager = lazy(() => import('../../components/admin/InstructorSetupManager'));

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'exams', label: 'Exams', icon: GraduationCap },
  { id: 'duties', label: 'Duties', icon: ClipboardList },
  { id: 'rooms', label: 'Rooms', icon: DoorOpen, setup: true },
  { id: 'floors', label: 'Floors', icon: Layers },
  { id: 'instructors', label: 'Instructors', icon: Users },
  { id: 'workload', label: 'Workload', icon: Scale },
  { id: 'punctuality', label: 'Punctuality', icon: Clock },
  { id: 'requests', label: 'Requests', icon: UserPlus, request: true },
];

export default function CleanDashboard() {
  const [active, setActive] = useState('overview');
  const [wizardOpen, setWizardOpen] = useState(false);
  const { instructors, pendingRequests } = useInstructors();
  const { allDuties } = useDuties();

  const fallback = <div className="skeleton h-40" />;

  const overdueCount = useMemo(() => (allDuties ?? []).filter((item) => item.status === 'pending').length, [allDuties]);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[230px,1fr]">
      <aside className="rounded-2xl border border-white/8 bg-[#111118] p-3">
        <nav className="space-y-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            const showSetupDivider = item.id === 'rooms';
            const showBottomDivider = item.id === 'requests';

            return (
              <div key={item.id}>
                {showSetupDivider ? (
                  <div className="mb-2 mt-3 border-t border-white/8 pt-2 text-[10px] uppercase tracking-[0.2em] text-white/20">Setup</div>
                ) : null}

                <button
                  type="button"
                  onClick={() => setActive(item.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm ${isActive ? 'bg-white/8 text-white/85' : 'text-white/45 hover:bg-white/4 hover:text-white/70'}`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-amber-400' : ''}`} />
                    {item.label}
                  </span>
                  {item.id === 'requests' && pendingRequests.length > 0 ? <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] text-red-300">{pendingRequests.length}</span> : null}
                  {item.id === 'duties' && overdueCount > 0 ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/45">{overdueCount}</span> : null}
                </button>

                {showBottomDivider && index !== navItems.length - 1 ? <div className="my-2 border-t border-white/8" /> : null}
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0 space-y-4">
        {active === 'overview' ? (
          <section className="space-y-4 rounded-2xl border border-white/8 bg-[#111118] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl text-white/85">Overview</h1>
                <p className="text-xs text-white/35">Quick actions</p>
              </div>
              <button type="button" className="app-btn-primary" onClick={() => setWizardOpen(true)}>
                Create Exam + Duties
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" className="app-btn-ghost" onClick={() => setActive('rooms')}>Manage Rooms</button>
              <button type="button" className="app-btn-ghost" onClick={() => setActive('floors')}>Manage Floors</button>
              <button type="button" className="app-btn-ghost" onClick={() => setActive('requests')}>View Requests</button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-xl border border-white/8 bg-white/3 p-3">
                <p className="text-xs text-white/35">Approved instructors</p>
                <p className="text-lg text-white/85">{(instructors ?? []).length}</p>
              </article>
              <article className="rounded-xl border border-white/8 bg-white/3 p-3">
                <p className="text-xs text-white/35">Pending requests</p>
                <p className="text-lg text-white/85">{(pendingRequests ?? []).length}</p>
              </article>
              <article className="rounded-xl border border-white/8 bg-white/3 p-3">
                <p className="text-xs text-white/35">Total duties</p>
                <p className="text-lg text-white/85">{(allDuties ?? []).length}</p>
              </article>
              <article className="rounded-xl border border-white/8 bg-white/3 p-3">
                <p className="text-xs text-white/35">Pending duties</p>
                <p className="text-lg text-white/85">{overdueCount}</p>
              </article>
            </div>
          </section>
        ) : null}

        {active === 'analytics' ? (
          <Suspense fallback={fallback}>
            <AnalyticsDashboard instructors={instructors} duties={allDuties} />
          </Suspense>
        ) : null}

        {active === 'exams' ? (
          <Suspense fallback={fallback}>
            <ExamManagement embedded onCreateExamClick={() => setWizardOpen(true)} />
          </Suspense>
        ) : null}

        {active === 'duties' ? (
          <Suspense fallback={fallback}>
            <DutiesEditorManager />
          </Suspense>
        ) : null}

        {active === 'rooms' ? (
          <Suspense fallback={fallback}>
            <RoomsManager />
          </Suspense>
        ) : null}

        {active === 'floors' ? (
          <Suspense fallback={fallback}>
            <FloorsManager />
          </Suspense>
        ) : null}

        {active === 'instructors' ? (
          <Suspense fallback={fallback}>
            <InstructorSetupManager />
          </Suspense>
        ) : null}

        {active === 'workload' ? (
          <Suspense fallback={fallback}>
            <WorkloadPanel instructors={instructors} loading={false} error="" showOverviewTable showLateFlags showUnderutilized />
          </Suspense>
        ) : null}

        {active === 'punctuality' ? (
          <Suspense fallback={fallback}>
            <PunctualityPanel instructors={instructors} duties={allDuties} loading={false} error="" showOverallStats showTrendTable showRecentLateArrivals />
          </Suspense>
        ) : null}

        {active === 'requests' ? (
          <Suspense fallback={fallback}>
            <PendingRequests />
          </Suspense>
        ) : null}
      </main>

      <ExamWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
}
