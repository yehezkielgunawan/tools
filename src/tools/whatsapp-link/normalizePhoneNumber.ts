export type PhoneNormalizationResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

const ALLOWED_FORMATTING = /^[+\d\s().-]+$/;
const INDONESIAN_MOBILE = /^628\d{7,11}$/;

export function normalizePhoneNumber(input: string): PhoneNormalizationResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { ok: false, error: 'Phone number is required.' };
  }

  if (
    !ALLOWED_FORMATTING.test(trimmed) ||
    (trimmed.includes('+') && !trimmed.startsWith('+')) ||
    trimmed.slice(1).includes('+')
  ) {
    return {
      ok: false,
      error: 'Use only numbers, a leading +, spaces, hyphens, or parentheses.',
    };
  }

  const compact = trimmed.replace(/[\s().-]/g, '');
  const digits = compact.startsWith('+') ? compact.slice(1) : compact;

  if (!/^\d+$/.test(digits)) {
    return {
      ok: false,
      error: 'Use only numbers, a leading +, spaces, hyphens, or parentheses.',
    };
  }

  const normalized = digits.startsWith('0')
    ? `62${digits.slice(1)}`
    : digits.startsWith('62')
      ? digits
      : null;

  if (!normalized) {
    return {
      ok: false,
      error: 'Use an Indonesian mobile number beginning with 08 or 628.',
    };
  }

  if (!INDONESIAN_MOBILE.test(normalized)) {
    return { ok: false, error: 'Enter a valid Indonesian mobile number.' };
  }

  return { ok: true, value: normalized };
}
