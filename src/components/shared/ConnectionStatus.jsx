import { useEffect, useMemo, useState } from 'react';
import { useRealtime } from '../../lib/hooks/useRealtime';
import { useOnlineStatus } from '../../lib/hooks/useOnlineStatus';
import { flushOfflineQueue, subscribeOfflineQueue } from '../../lib/offlineQueue';
import { useToast } from './Toast';

const STATUS_STYLES = {
  connected: {
    dot: 'bg-green-400 animate-pulse',
    text: 'Live',
    wrapper: 'text-white/30',
  },
  connecting: {
    dot: 'bg-amber-400',
    text: 'Connecting...',
    wrapper: 'text-white/30',
  },
  disconnected: {
    dot: 'bg-red-400',
    text: 'Offline',
    wrapper: 'text-white/30',
  },
  error: {
    dot: 'bg-red-400',
    text: 'Offline',
    wrapper: 'text-white/30',
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
        <div className="fixed inset-x-0 top-0 z-[120] animate-[fade-in-up_220ms_ease-out] border-b border-red-500/30 bg-red-500/20 px-4 py-2 text-center text-sm font-medium text-red-200">
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
          className={`inline-flex items-center gap-2 rounded-xl px-0 py-1.5 text-xs transition-colors duration-200 ${styles.wrapper} ${canReconnect ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full transition-colors duration-200 ${styles.dot}`} />
          <span>{styles.text}</span>
          {queuedCount > 0 ? <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">{queuedCount}</span> : null}
        </button>

        {showTooltip ? (
          <div className="absolute right-0 top-full z-20 mt-2 whitespace-nowrap rounded-md border border-white/10 bg-[#16161F] px-2 py-1 text-[11px] font-medium text-white/70 shadow-sm">
            Click to reconnect
          </div>
        ) : null}
      </div>
    </>
  );
}
