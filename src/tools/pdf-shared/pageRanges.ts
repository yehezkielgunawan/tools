import { MAX_OUTPUT_PAGES, MAX_SPLIT_OUTPUTS } from './pdfFiles';

export function parsePageSelection(value: string, pageCount: number): number[] {
  if (!value.trim()) throw new RangeError('Enter at least one page or range.');
  const pages: number[] = [];
  const seen = new Set<number>();
  for (const token of value.split(',')) {
    const match = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(token);
    if (!match)
      throw new RangeError('Use page numbers or ranges, such as 1-3, 5, 8-10.');
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 1 ||
      end > pageCount
    ) {
      throw new RangeError(`Choose pages between 1 and ${pageCount}.`);
    }
    if (start > end) throw new RangeError('A range must start before it ends.');
    if (pages.length + end - start + 1 > MAX_OUTPUT_PAGES) {
      throw new RangeError('Select 500 output pages or fewer.');
    }
    for (let page = start; page <= end; page += 1) {
      if (seen.has(page))
        throw new RangeError(`Page ${page} is selected more than once.`);
      seen.add(page);
      pages.push(page);
    }
  }
  return pages;
}

export function parseSplitRanges(
  values: readonly string[],
  pageCount: number,
): number[][] {
  if (!values.length || values.length > MAX_SPLIT_OUTPUTS) {
    throw new RangeError('Choose between 1 and 20 output ranges.');
  }
  const groups = values.map((value) => {
    if (value.includes(','))
      throw new RangeError('Use one page or range in each row.');
    return parsePageSelection(value, pageCount);
  });
  if (
    groups.reduce((total, pages) => total + pages.length, 0) > MAX_OUTPUT_PAGES
  ) {
    throw new RangeError('Select 500 output pages or fewer across all ranges.');
  }
  return groups;
}
