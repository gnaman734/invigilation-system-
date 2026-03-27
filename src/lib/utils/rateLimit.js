const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000;
const LOCK_MS = 60 * 1000;

const memoryState = {
  failedAttempts: [],
  lockedUntil: 0,
};

function now() {
  return Date.now();
}

function pruneWindow() {
  const cutoff = now() - WINDOW_MS;
  memoryState.failedAttempts = memoryState.failedAttempts.filter((timestamp) => timestamp >= cutoff);
}

export function registerFailedLoginAttempt() {
  pruneWindow();
  memoryState.failedAttempts.push(now());

  if (memoryState.failedAttempts.length >= MAX_ATTEMPTS) {
    memoryState.lockedUntil = now() + LOCK_MS;
  }

  return getLoginRateLimitState();
}

export function clearLoginAttemptWindow() {
  memoryState.failedAttempts = [];
  memoryState.lockedUntil = 0;
}

export function getLoginRateLimitState() {
  pruneWindow();
  const remainingMs = Math.max(0, memoryState.lockedUntil - now());

  return {
    isLocked: remainingMs > 0,
    remainingMs,
    attemptCount: memoryState.failedAttempts.length,
    maxAttempts: MAX_ATTEMPTS,
  };
}
