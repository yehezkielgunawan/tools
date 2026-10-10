import { describe, expect, it } from '@rstest/core';
import { degrees, PDFDocument } from 'pdf-lib';
import {
  loadPdfFile,
  MAX_PDF_FILE_BYTES,
} from '../src/tools/pdf-shared/pdfFiles';
import { mergePdfs, splitPdf } from '../src/tools/pdf-shared/pdfOperations';

async function makePdf(widths: number[]) {
  const pdf = await PDFDocument.create();
  for (const width of widths) {
    const page = pdf.addPage([width, 400]);
    page.setRotation(degrees(90));
    page.drawText(`Page ${width}`);
  }
  return pdf.save();
}

describe('local PDF operations', () => {
  it('merges real pages in input order and preserves geometry and contents', async () => {
    const bytes = await mergePdfs([
      await makePdf([200, 210]),
      await makePdf([300]),
    ]);
    const output = await PDFDocument.load(bytes);
    expect(output.getPages().map((page) => page.getWidth())).toEqual([
      200, 210, 300,
    ]);
    expect(output.getPages().map((page) => page.getRotation().angle)).toEqual([
      90, 90, 90,
    ]);
    expect(
      output.getPages().every((page) => page.node.Contents()),
    ).toBeTruthy();
  });

  it('extracts in selected order and permits overlapping separate outputs', async () => {
    const outputs = await splitPdf(await makePdf([200, 210, 220]), [
      [3, 1],
      [1, 2],
    ]);
    const documents = await Promise.all(
      outputs.map((bytes) => PDFDocument.load(bytes)),
    );
    expect(
      documents.map((pdf) => pdf.getPages().map((page) => page.getWidth())),
    ).toEqual([
      [220, 200],
      [200, 210],
    ]);
  });

  it('rejects empty, invalid, and excessive operations', async () => {
    const bytes = await makePdf([200]);
    await expect(mergePdfs([bytes])).rejects.toThrow(/two/i);
    await expect(splitPdf(bytes, [[]])).rejects.toThrow();
    await expect(splitPdf(bytes, [[0]])).rejects.toThrow();
    await expect(splitPdf(bytes, [[2]])).rejects.toThrow();
    await expect(splitPdf(bytes, [[1, 1]])).rejects.toThrow();
    await expect(splitPdf(bytes, Array(21).fill([1]))).rejects.toThrow(/20/);
    await expect(
      mergePdfs([await makePdf(Array(501).fill(200)), bytes]),
    ).rejects.toThrow(/500/);
  });

  it('validates actual PDFs and rejects size limits before reading', async () => {
    const bytes = await makePdf([200, 210]);
    const result = await loadPdfFile(
      new File([bytes], 'report.pdf', { type: 'application/pdf' }),
    );
    expect(result.pageCount).toBe(2);
    await expect(
      loadPdfFile(new File(['%PDF-1.7 invalid'], 'broken.pdf')),
    ).rejects.toThrow(/damaged|unsupported/i);
    const large = new File(['%PDF-1.7'], 'large.pdf');
    Object.defineProperty(large, 'size', { value: MAX_PDF_FILE_BYTES + 1 });
    await expect(loadPdfFile(large)).rejects.toThrow(/25 MB/);
    const emptyPdf = await PDFDocument.create();
    await expect(
      loadPdfFile(
        new File([await emptyPdf.save({ addDefaultPage: false })], 'empty.pdf'),
      ),
    ).rejects.toThrow(/no pages/i);
  });
});
