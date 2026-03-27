const TEXT_SAFE_PATTERN = /[^a-zA-Z0-9\s.,'\-()&/@_:+]/g;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sanitizeText(input) {
  const value = typeof input === 'string' ? input.trim() : '';
  return value.replace(TEXT_SAFE_PATTERN, '');
}

export function sanitizeEmail(input) {
  const value = typeof input === 'string' ? input.trim().toLowerCase() : '';

  if (!EMAIL_PATTERN.test(value)) {
    return '';
  }

  return value;
}

export function sanitizeTime(input) {
  const value = typeof input === 'string' ? input.trim() : '';

  if (!TIME_PATTERN.test(value)) {
    return '';
  }

  return value;
}

export function sanitizeUUID(input) {
  const value = typeof input === 'string' ? input.trim() : '';

  if (!UUID_PATTERN.test(value)) {
    return '';
  }

  return value;
}
