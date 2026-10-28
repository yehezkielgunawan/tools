import { afterEach, describe, expect, it, rs } from '@rstest/core';
import {
  clearSpinnerEntries,
  loadSpinnerEntries,
  SPINNER_STORAGE_KEY,
  saveSpinnerEntries,
} from '../src/tools/random-spinner/spinnerStorage';

afterEach(() => {
  rs.restoreAllMocks();
  localStorage.clear();
});

describe('spinner saved entries', () => {
  it('restores raw drafts, including incomplete entries, and resets storage', () => {
    expect(loadSpinnerEntries()).toBe('');
    saveSpinnerEntries('  Ada\n\n');
    expect(loadSpinnerEntries()).toBe('  Ada\n\n');
    expect(
      JSON.parse(localStorage.getItem(SPINNER_STORAGE_KEY) ?? 'null'),
    ).toEqual({
      version: 1,
      entries: '  Ada\n\n',
    });
    clearSpinnerEntries();
    expect(localStorage.getItem(SPINNER_STORAGE_KEY)).toBeNull();
  });

  it('ignores corrupted data and unsupported schemas', () => {
    for (const value of [
      'broken',
      'null',
      '[]',
      '{"version":2,"entries":"Ada"}',
      '{"version":1,"entries":42}',
    ]) {
      localStorage.setItem(SPINNER_STORAGE_KEY, value);
      expect(loadSpinnerEntries()).toBe('');
    }
  });

  it('works when browser storage throws', () => {
    rs.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    rs.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    rs.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadSpinnerEntries()).toBe('');
    expect(() => saveSpinnerEntries('Ada\nGrace')).not.toThrow();
    expect(() => clearSpinnerEntries()).not.toThrow();
  });
});
