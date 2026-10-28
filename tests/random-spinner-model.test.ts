import { describe, expect, it } from '@rstest/core';
import {
  getSpinRotation,
  parseSpinnerEntries,
  removeSpinnerEntry,
  selectWinnerIndex,
} from '../src/tools/random-spinner/spinnerModel';

describe('spinner entries', () => {
  it('trims entries, ignores blank lines, and preserves duplicate occurrences', () => {
    const parsed = parseSpinnerEntries('  Ada \r\n\r\nGrace\r\n Ada  ');
    expect(parsed.error).toBe('');
    expect(parsed.entries).toEqual([
      { label: 'Ada', lineIndex: 0 },
      { label: 'Grace', lineIndex: 2 },
      { label: 'Ada', lineIndex: 3 },
    ]);
    expect(removeSpinnerEntry('  Ada \r\n\r\nGrace\r\n Ada  ', 3)).toBe(
      '  Ada \n\nGrace',
    );
  });

  it('validates counts and Unicode code-point label lengths', () => {
    expect(parseSpinnerEntries(' ').error).toMatch(/at least two/i);
    expect(parseSpinnerEntries('Ada').error).toMatch(/at least two/i);
    expect(parseSpinnerEntries(Array(100).fill('Ada').join('\n')).error).toBe(
      '',
    );
    expect(
      parseSpinnerEntries(Array(101).fill('Ada').join('\n')).error,
    ).toMatch(/100/);
    expect(parseSpinnerEntries(`${'🎯'.repeat(80)}\nAda`).error).toBe('');
    expect(parseSpinnerEntries(`${'🎯'.repeat(81)}\nAda`).error).toMatch(/80/);
  });
});

describe('fair selection and wheel geometry', () => {
  it('selects boundary entries and rejects samples outside the unbiased range', () => {
    expect(selectWinnerIndex(3, () => 0)).toBe(0);
    expect(selectWinnerIndex(3, () => 4_294_967_294)).toBe(2);
    const samples = [4_294_967_295, 1];
    expect(selectWinnerIndex(3, () => samples.shift() ?? 0)).toBe(1);
    expect(samples).toEqual([]);
    expect(selectWinnerIndex(100, () => 99)).toBe(99);
    expect(() => selectWinnerIndex(0)).toThrow();
    expect(() => selectWinnerIndex(101)).toThrow();
  });

  it('lands the pointer in the selected segment over consecutive spins', () => {
    for (const count of [2, 3, 100]) {
      let rotation = 0;
      for (let index = 0; index < count; index++) {
        const next = getSpinRotation(rotation, index, count);
        expect(next - rotation).toBeGreaterThanOrEqual(360 * 5);
        const pointerAngle = (360 - (next % 360)) % 360;
        expect(Math.floor(pointerAngle / (360 / count))).toBe(index);
        rotation = next;
      }
    }
  });
});
