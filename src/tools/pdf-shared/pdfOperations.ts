import { PDFDocument } from 'pdf-lib';
import {
  MAX_MERGE_BYTES,
  MAX_OUTPUT_PAGES,
  MAX_SPLIT_OUTPUTS,
} from './pdfFiles';

export async function mergePdfs(
  inputs: readonly Uint8Array[],
): Promise<Uint8Array> {
  if (inputs.length < 2)
    throw new RangeError('Choose at least two PDFs to merge.');
  if (
    inputs.reduce((total, bytes) => total + bytes.byteLength, 0) >
    MAX_MERGE_BYTES
  ) {
    throw new RangeError('Choose PDFs totaling 100 MB or less.');
  }
  const output = await PDFDocument.create();
  for (const bytes of inputs) {
    const source = await PDFDocument.load(bytes);
    if (!source.getPageCount())
      throw new RangeError('One of these PDFs has no pages.');
    if (output.getPageCount() + source.getPageCount() > MAX_OUTPUT_PAGES) {
      throw new RangeError('Merge 500 pages or fewer.');
    }
    const pages = await output.copyPages(source, source.getPageIndices());
    for (const page of pages) output.addPage(page);
  }
  return output.save();
}

export async function splitPdf(
  bytes: Uint8Array,
  groups: readonly (readonly number[])[],
): Promise<Uint8Array[]> {
  if (!groups.length || groups.length > MAX_SPLIT_OUTPUTS) {
    throw new RangeError('Choose between 1 and 20 output ranges.');
  }
  if (
    groups.reduce((total, pages) => total + pages.length, 0) > MAX_OUTPUT_PAGES
  ) {
    throw new RangeError('Select 500 output pages or fewer across all ranges.');
  }
  const source = await PDFDocument.load(bytes);
  for (const group of groups) {
    if (!group.length || new Set(group).size !== group.length) {
      throw new RangeError(
        'Each output needs a non-empty selection without repeated pages.',
      );
    }
    if (
      group.some(
        (page) =>
          !Number.isSafeInteger(page) ||
          page < 1 ||
          page > source.getPageCount(),
      )
    ) {
      throw new RangeError(
        `Choose pages between 1 and ${source.getPageCount()}.`,
      );
    }
  }
  const outputs: Uint8Array[] = [];
  for (const group of groups) {
    const output = await PDFDocument.create();
    const pages = await output.copyPages(
      source,
      group.map((page) => page - 1),
    );
    for (const page of pages) output.addPage(page);
    outputs.push(await output.save());
  }
  return outputs;
}
