import { useEffect, useMemo, useState } from 'react';
import { useRealtime } from '../../lib/hooks/useRealtime';
import { useOnlineStatus } from '../../lib/hooks/useOnlineStatus';
import { flushOfflineQueue, subscribeOfflineQueue } from '../../lib/offlineQueue';
import { useToast } from './Toast';

const STATUS_STYLES = {
  connected: {
    dot: 'bg-green-500 animate-pulse',
    text: 'Live',
    wrapper: 'border-green-200 bg-green-50 text-green-700',
  },
  connecting: {
    dot: 'bg-yellow-500',
    text: 'Connecting...',
    wrapper: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  },
  disconnected: {
    dot: 'bg-red-500',
    text: 'Offline',
    wrapper: 'border-red-200 bg-red-50 text-red-700',
  },
  error: {
    dot: 'bg-red-600',
    text: 'Offline',
    wrapper: 'border-red-200 bg-red-50 text-red-700',
  },
};

export default function ConnectionStatus() {
  const { addToast } = useToast();
  const { isOnline } = useOnlineStatus();
  const [showTooltip, setShowTooltip] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const { connectionStatus, manualReconnect } = useRealtime();

  useEffect(() => {
    const unsubscribe = subscribeOfflineQueue((nextSize) => setQueuedCount(nextSize));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isOnline) {
      return;
    }

    const syncQueuedOperations = async () => {
      const sizeBefore = queuedCount;
      const { processed } = await flushOfflineQueue();

      if (sizeBefore > 0 || processed > 0) {
        addToast({ type: 'info', message: 'Back online. Syncing...' });
      }
    };

    syncQueuedOperations();
  }, [isOnline, queuedCount, addToast]);

  const status = useMemo(() => {
    if (!isOnline) {
      return 'disconnected';
    }

    return connectionStatus;
  }, [isOnline, connectionStatus]);

  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.disconnected;
  const canReconnect = status === 'disconnected' || status === 'error';

  return (
    <>
      {!isOnline ? (
        <div className="fixed inset-x-0 top-0 z-[120] animate-[fade-in-up_220ms_ease-out] border-b border-red-300 bg-red-600 px-4 py-2 text-center text-sm font-medium text-white">
          You are offline. Changes will sync when connection is restored.
        </div>
      ) : null}

      <div className="relative">
        <button
          type="button"
          disabled={!canReconnect}
          onClick={() => {
            if (!canReconnect) {
              return;
            }
            manualReconnect();
            setShowTooltip(false);
          }}
          onMouseEnter={() => setShowTooltip(canReconnect)}
          onMouseLeave={() => setShowTooltip(false)}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${styles.wrapper} ${canReconnect ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <span className={`h-2.5 w-2.5 rounded-full transition-colors duration-200 ${styles.dot}`} />
          <span>{styles.text}</span>
          {queuedCount > 0 ? <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]">{queuedCount}</span> : null}
        </button>

        {showTooltip ? (
          <div className="absolute right-0 top-full z-20 mt-2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
            Click to reconnect
          </div>
        ) : null}
      </div>
    </>
  );
}
