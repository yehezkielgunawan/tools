export const SPINNER_STORAGE_KEY = 'yehezgun-tools:random-spinner:v1';

export function loadSpinnerEntries(): string {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(SPINNER_STORAGE_KEY) ?? 'null',
    );
    if (
      saved &&
      typeof saved === 'object' &&
      'version' in saved &&
      saved.version === 1 &&
      'entries' in saved &&
      typeof saved.entries === 'string'
    )
      return saved.entries;
  } catch {
    // A blocked storage API or malformed draft must not prevent spinning.
  }
  return '';
}

export function saveSpinnerEntries(entries: string): void {
  try {
    localStorage.setItem(
      SPINNER_STORAGE_KEY,
      JSON.stringify({ version: 1, entries }),
    );
  } catch {
    // Keep the current draft in memory when storage is unavailable or full.
  }
}

export function clearSpinnerEntries(): void {
  try {
    localStorage.removeItem(SPINNER_STORAGE_KEY);
  } catch {
    // Reset still clears the in-memory draft.
  }
}
