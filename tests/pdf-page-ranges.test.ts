import { describe, expect, it } from '@rstest/core';
import {
  parsePageSelection,
  parseSplitRanges,
} from '../src/tools/pdf-shared/pageRanges';

describe('PDF page selections', () => {
  it('keeps the requested page order using one-based numbers', () => {
    expect(parsePageSelection('3, 1-2, 5', 5)).toEqual([3, 1, 2, 5]);
  });

  it('rejects malformed, repeated, reversed, and out-of-bounds pages', () => {
    for (const value of [
      '',
      '0',
      '-1',
      '1.5',
      '2-1',
      '6',
      '1,',
      '1,,2',
      '1-2,2',
      '1e2',
      '1-999999999',
    ]) {
      expect(() => parsePageSelection(value, 5)).toThrow();
    }
  });

  it('supports overlapping outputs but only one range in each row', () => {
    expect(parseSplitRanges(['1-3', '3-4', '5'], 5)).toEqual([
      [1, 2, 3],
      [3, 4],
      [5],
    ]);
    expect(() => parseSplitRanges(['1,3'], 5)).toThrow(/one page or range/i);
    expect(() => parseSplitRanges([], 5)).toThrow();
    expect(() => parseSplitRanges(Array(21).fill('1'), 5)).toThrow(/20/);
    expect(() => parseSplitRanges(['1-300', '1-300'], 300)).toThrow(/500/);
  });
});
