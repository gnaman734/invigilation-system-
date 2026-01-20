const queue = [];
const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener(queue.length));
}

export function enqueueOfflineOperation(operation, label = 'Pending change') {
  if (typeof operation !== 'function') {
    return;
  }

  queue.push({ operation, label });
  notify();
}

export async function flushOfflineQueue() {
  if (queue.length === 0) {
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  while (queue.length > 0) {
    const item = queue.shift();

    try {
      await item.operation();
      processed += 1;
    } catch (_error) {
      failed += 1;
      queue.push(item);
      break;
    }
  }

  notify();
  return { processed, failed };
}

export function getOfflineQueueSize() {
  return queue.length;
}

export function subscribeOfflineQueue(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }

  listeners.add(listener);
  listener(queue.length);

  return () => {
    listeners.delete(listener);
  };
}
