import { describe, expect, it } from '@rstest/core';
import {
  getPdfFilename,
  getSplitFilename,
} from '../src/tools/pdf-shared/pdfDownloads';

describe('PDF download names', () => {
  it('normalizes filenames and always adds one PDF extension', () => {
    expect(getPdfFilename('  my report.PDF  ', 'merged')).toBe('my report.pdf');
    expect(getPdfFilename('a/b:c.pdf', 'merged')).toBe('a-b-c.pdf');
    expect(getPdfFilename('', 'merged')).toBe('merged.pdf');
    expect(getPdfFilename('.pdf', 'merged')).toBe('merged.pdf');
  });
  it('names numbered range outputs uniquely', () => {
    expect(getSplitFilename('report.pdf', [1, 2, 3], 1)).toBe(
      'report-part-1-pages-1-3.pdf',
    );
    expect(getSplitFilename('report.pdf', [5], 2)).toBe(
      'report-part-2-pages-5.pdf',
    );
  });
});
