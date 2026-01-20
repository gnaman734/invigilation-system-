import { useCallback, useMemo, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useInstructors } from '../../lib/hooks/useInstructors';
import { useToast } from '../shared/Toast';
import ConfirmDialog from '../shared/ConfirmDialog';
import { useRealtime } from '../../lib/hooks/useRealtime';

function getInitials(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return 'NA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function PendingRequests() {
  const { addToast } = useToast();
  const { pendingRequests, loading, error, fetchPendingRequests, approveInstructor, rejectInstructor } = useInstructors();
  const [processingId, setProcessingId] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);

  const handleRealtimeInstructorChange = useCallback(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  useRealtime({
    onInstructorChange: handleRealtimeInstructorChange,
  });

  const count = pendingRequests.length;

  const sortedRequests = useMemo(() => {
    return [...pendingRequests].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [pendingRequests]);

  const handleApprove = async (request) => {
    setProcessingId(request.id);
    const result = await approveInstructor(request.id, request.auth_id);

    if (result?.error) {
      addToast({ type: 'error', message: result.error });
      setProcessingId('');
      return;
    }

    addToast({ type: 'success', message: `✅ ${request.name} has been approved` });
    setProcessingId('');
  };

  const handleRejectConfirmed = async () => {
    if (!rejectTarget) {
      return;
    }

    setProcessingId(rejectTarget.id);
    const result = await rejectInstructor(rejectTarget.id, rejectTarget.auth_id);

    if (result?.error) {
      addToast({ type: 'error', message: result.error });
      setProcessingId('');
      setRejectTarget(null);
      return;
    }

    addToast({ type: 'warning', message: `${rejectTarget.name}'s request rejected` });
    setProcessingId('');
    setRejectTarget(null);
  };

  return (
    <section className="rounded-2xl border border-gray-100 bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Pending Access Requests</h2>
        <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
          {count}
        </span>
      </div>

      {error ? <p className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {loading ? <div className="p-6 text-sm text-gray-500">Loading requests...</div> : null}

      {!loading && count === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
          <p className="text-base font-semibold text-gray-900">No pending requests</p>
          <p className="text-sm text-gray-500">All instructor requests have been reviewed</p>
        </div>
      ) : null}

      {!loading && count > 0 ? (
        <div>
          {sortedRequests.map((request) => {
            const isProcessing = processingId === request.id;

            return (
              <article key={request.id} className="flex flex-col gap-3 border-b border-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                    {getInitials(request.name)}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{request.name}</p>
                    <p className="truncate text-sm text-gray-500">
                      {request.department} • {request.email}
                    </p>
                    <p className="text-xs text-gray-400">
                      Requested {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleApprove(request)}
                    className="inline-flex items-center gap-1 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setRejectTarget(request)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirmed}
        message={`Are you sure you want to reject ${rejectTarget?.name ?? 'this request'}'s request? This cannot be undone.`}
      />
    </section>
  );
}
