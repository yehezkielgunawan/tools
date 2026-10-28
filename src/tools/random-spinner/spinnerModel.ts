export interface SpinnerEntry {
  label: string;
  lineIndex: number;
}

export const MAX_SPINNER_ENTRIES = 100;
export const MAX_SPINNER_LABEL_LENGTH = 80;
export const SPIN_DURATION_MS = 4000;

export function parseSpinnerEntries(text: string): {
  entries: SpinnerEntry[];
  error: string;
} {
  const entries = text.split(/\r\n?|\n/).flatMap((line, lineIndex) => {
    const label = line.trim();
    return label ? [{ label, lineIndex }] : [];
  });
  let error = '';
  if (entries.length < 2) error = 'Add at least two entries to spin.';
  else if (entries.length > MAX_SPINNER_ENTRIES)
    error = 'Use 100 entries or fewer.';
  else if (
    entries.some(
      ({ label }) => Array.from(label).length > MAX_SPINNER_LABEL_LENGTH,
    )
  )
    error = 'Keep each entry to 80 characters or fewer.';
  return { entries, error };
}

export function removeSpinnerEntry(text: string, lineIndex: number): string {
  return text
    .split(/\r\n?|\n/)
    .filter((_, index) => index !== lineIndex)
    .join('\n');
}

export function selectWinnerIndex(
  count: number,
  readUint32 = () => crypto.getRandomValues(new Uint32Array(1))[0],
): number {
  if (!Number.isInteger(count) || count < 2 || count > MAX_SPINNER_ENTRIES)
    throw new RangeError('Choose between 2 and 100 entries.');
  const range = 2 ** 32;
  const limit = range - (range % count);
  let sample: number;
  do {
    sample = readUint32();
  } while (sample >= limit);
  return sample % count;
}

export function getSpinRotation(
  currentRotation: number,
  winnerIndex: number,
  count: number,
): number {
  const center = (winnerIndex + 0.5) * (360 / count);
  const target = (360 - center) % 360;
  const extra = (target - (currentRotation % 360) + 360) % 360;
  return currentRotation + 5 * 360 + extra;
}
