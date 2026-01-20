import { useEffect, useMemo, useRef, useState } from 'react';
import DutyCard from '../../components/instructor/DutyCard';
import { useDuties } from '../../lib/hooks/useDuties';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/shared/Toast';
import { useOnlineStatus } from '../../lib/hooks/useOnlineStatus';
import ErrorBoundary from '../../components/shared/ErrorBoundary';
import { sanitizeText } from '../../lib/utils/sanitize';

function DutySkeleton() {
  return <div className="h-48 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />;
}

export default function InstructorDashboard() {
  const { addToast } = useToast();
  const user = useAuthStore((state) => state.user);
  const { isOnline } = useOnlineStatus();
  const { upcomingDuties, pastDuties, loading, error, markArrival, processingDutyIds } = useDuties();
  const [newDutyIds, setNewDutyIds] = useState(new Set());
  const [statusChangedIds, setStatusChangedIds] = useState(new Set());
  const knownStatusesRef = useRef(new Map());

  const name = sanitizeText(user?.user_metadata?.name ?? user?.email ?? 'Instructor');

  const upcomingDutyCount = useMemo(
    () => upcomingDuties.reduce((sum, group) => sum + (group.duties?.length ?? 0), 0),
    [upcomingDuties]
  );

  useEffect(() => {
    const previousStatuses = knownStatusesRef.current;
    const currentIds = new Set();
    const nextStatuses = new Map();
    const nextNew = new Set();
    const nextStatusChanged = new Set();

    [...upcomingDuties, ...pastDuties].forEach((group) => {
      (group.duties ?? []).forEach((duty) => {
        currentIds.add(duty.duty_id);
        nextStatuses.set(duty.duty_id, duty.status);

        if (!previousStatuses.has(duty.duty_id)) {
          nextNew.add(duty.duty_id);
          if (duty.subject) {
            addToast({ type: 'info', message: `New duty assigned: ${duty.subject}` });
          }
        }

        if (previousStatuses.has(duty.duty_id) && previousStatuses.get(duty.duty_id) !== duty.status) {
          nextStatusChanged.add(duty.duty_id);
        }
      });
    });

    previousStatuses.forEach((_status, dutyId) => {
      if (!currentIds.has(dutyId)) {
        addToast({ type: 'warning', message: 'A duty has been removed' });
      }
    });

    knownStatusesRef.current = nextStatuses;
    setNewDutyIds(nextNew);
    setStatusChangedIds(nextStatusChanged);

    const timeoutId = window.setTimeout(() => {
      setNewDutyIds(new Set());
      setStatusChangedIds(new Set());
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [addToast, upcomingDuties, pastDuties]);

  const handleMarkArrival = async (dutyId) => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}:${seconds}`;

    const result = await markArrival(dutyId, currentTime);

    if (result?.error) {
      addToast({ type: 'error', message: `Unable to mark arrival: ${result.error}` });
      return;
    }

    addToast({ type: 'success', message: `Arrival marked successfully (${result.status}).` });
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-6 h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="space-y-3">
          <DutySkeleton />
          <DutySkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Welcome, {name}</h1>
        <p className="mt-1 text-sm text-gray-600">Upcoming duties: {upcomingDutyCount}</p>

        <div className="mt-8 space-y-10">
          <section>
            <h2 className="text-xl font-semibold text-slate-900">Upcoming Duties</h2>
            {upcomingDuties.length === 0 ? <p className="mt-3 text-sm text-slate-600">No upcoming duties assigned</p> : null}

            <div className="mt-4 space-y-6">
              {upcomingDuties.map((group) => (
                <div key={group.dateKey} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <h3 className="sticky top-16 z-10 mb-3 rounded-lg bg-[#F4F6F9] px-3 py-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
                    {group.dateLabel}
                  </h3>
                  <div className="space-y-3">
                    {group.duties.map((duty) => (
                      <DutyCard
                        key={duty.duty_id}
                        duty={duty}
                        onMarkArrival={handleMarkArrival}
                        isNew={newDutyIds.has(duty.duty_id)}
                        isProcessing={processingDutyIds.includes(duty.duty_id)}
                        statusJustChanged={statusChangedIds.has(duty.duty_id)}
                        disableActions={!isOnline}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">Past Duties</h2>
            {pastDuties.length === 0 ? <p className="mt-3 text-sm text-slate-600">No past duties found</p> : null}

            <div className="mt-4 space-y-6">
              {pastDuties.map((group) => (
                <div key={group.dateKey} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <h3 className="sticky top-16 z-10 mb-3 rounded-lg bg-[#F4F6F9] px-3 py-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
                    {group.dateLabel}
                  </h3>
                  <div className="space-y-3">
                    {group.duties.map((duty) => (
                      <DutyCard key={duty.duty_id} duty={duty} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </ErrorBoundary>
  );
}
