import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';

const RETRY_DELAY_MS = 3000;
const MAX_RETRIES = 5;

const manager = {
  consumers: 0,
  channel: null,
  reconnectTimer: null,
  retryCount: 0,
  status: 'disconnected',
  statusListeners: new Set(),
  dutyListeners: new Set(),
  instructorListeners: new Set(),
  analyticsListeners: new Set(),
};

function notifyStatus() {
  manager.statusListeners.forEach((listener) => {
    listener({ status: manager.status, retryCount: manager.retryCount });
  });
}

function setStatus(status) {
  manager.status = status;
  notifyStatus();
}

function clearReconnectTimer() {
  if (manager.reconnectTimer) {
    window.clearTimeout(manager.reconnectTimer);
    manager.reconnectTimer = null;
  }
}

function dispatchPayload(type, payload) {
  if (type === 'duty') {
    manager.dutyListeners.forEach((listener) => listener(payload));
    return;
  }

  if (type === 'instructor') {
    manager.instructorListeners.forEach((listener) => listener(payload));
    return;
  }

  if (type === 'analytics') {
    manager.analyticsListeners.forEach((listener) => listener(payload));
  }
}

function teardownChannel() {
  clearReconnectTimer();

  if (manager.channel) {
    const channelToRemove = manager.channel;
    manager.channel = null;
    supabase.removeChannel(channelToRemove);
  }
}

function scheduleReconnect() {
  clearReconnectTimer();

  if (manager.retryCount >= MAX_RETRIES) {
    setStatus('error');
    return;
  }

  manager.retryCount += 1;
  notifyStatus();
  setStatus('disconnected');

  manager.reconnectTimer = window.setTimeout(() => {
    connect();
  }, RETRY_DELAY_MS);
}

function handleSubscriptionState(state) {
  if (state === 'SUBSCRIBED') {
    manager.retryCount = 0;
    setStatus('connected');
    return;
  }

  if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') {
    scheduleReconnect();
  }
}

function connect() {
  if (manager.channel) {
    return;
  }

  setStatus('connecting');

  const channel = supabase
    .channel('global-realtime-sync')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'duties',
      },
      (payload) => dispatchPayload('duty', payload)
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'instructors',
      },
      (payload) => dispatchPayload('instructor', payload)
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'analytics_cache',
      },
      (payload) => dispatchPayload('analytics', payload)
    )
    .subscribe((state) => {
      if (manager.channel !== channel) {
        return;
      }

      handleSubscriptionState(state);

      if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') {
        teardownChannel();
      }
    });

  manager.channel = channel;
}

function initManagerIfNeeded() {
  if (!manager.channel) {
    connect();
  }
}

function subscribeStatus(listener) {
  manager.statusListeners.add(listener);
  listener({ status: manager.status, retryCount: manager.retryCount });

  return () => {
    manager.statusListeners.delete(listener);
  };
}

function registerCallbacks({ onDutyChange, onInstructorChange, onAnalyticsChange }) {
  if (typeof onDutyChange === 'function') {
    manager.dutyListeners.add(onDutyChange);
  }

  if (typeof onInstructorChange === 'function') {
    manager.instructorListeners.add(onInstructorChange);
  }

  if (typeof onAnalyticsChange === 'function') {
    manager.analyticsListeners.add(onAnalyticsChange);
  }

  return () => {
    if (typeof onDutyChange === 'function') {
      manager.dutyListeners.delete(onDutyChange);
    }

    if (typeof onInstructorChange === 'function') {
      manager.instructorListeners.delete(onInstructorChange);
    }

    if (typeof onAnalyticsChange === 'function') {
      manager.analyticsListeners.delete(onAnalyticsChange);
    }
  };
}

export function useRealtime({ onDutyChange, onInstructorChange, onAnalyticsChange } = {}) {
  const [connectionStatus, setConnectionStatus] = useState(manager.status);
  const [retryCount, setRetryCount] = useState(manager.retryCount);

  useEffect(() => {
    manager.consumers += 1;
    initManagerIfNeeded();

    const unregisterStatus = subscribeStatus(({ status, retryCount: nextRetryCount }) => {
      setConnectionStatus(status);
      setRetryCount(nextRetryCount);
    });

    const unregisterCallbacks = registerCallbacks({ onDutyChange, onInstructorChange, onAnalyticsChange });

    return () => {
      unregisterStatus();
      unregisterCallbacks();
      manager.consumers = Math.max(0, manager.consumers - 1);

      if (manager.consumers === 0) {
        teardownChannel();
        manager.retryCount = 0;
        setStatus('disconnected');
      }
    };
  }, [onDutyChange, onInstructorChange, onAnalyticsChange]);

  const manualReconnect = useCallback(() => {
    manager.retryCount = 0;
    clearReconnectTimer();
    teardownChannel();
    connect();
  }, []);

  const isConnected = useMemo(() => connectionStatus === 'connected', [connectionStatus]);

  return {
    connectionStatus,
    isConnected,
    retryCount,
    manualReconnect,
  };
}
