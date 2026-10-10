import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PDFDocument } from 'pdf-lib';
import { MemoryRouter } from 'react-router';
import PdfSplitter from '../src/tools/pdf-splitter/PdfSplitter';

async function pdfFile() {
  const pdf = await PDFDocument.create();
  for (const width of [200, 210, 220, 230]) pdf.addPage([width, 400]);
  return new File([await pdf.save()], 'report.pdf', {
    type: 'application/pdf',
  });
}

describe('PDF Splitter', () => {
  let blobs: Blob[];
  beforeEach(() => {
    blobs = [];
    rs.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      blobs.push(blob as Blob);
      return `blob:pdf-${blobs.length}`;
    });
    rs.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });
  afterEach(() => rs.restoreAllMocks());

  async function open() {
    const view = render(
      <MemoryRouter>
        <PdfSplitter />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Choose a PDF'), {
      target: { files: [await pdfFile()] },
    });
    await screen.findByText('report.pdf');
    return view;
  }

  it('extracts selected pages in order and clears obsolete downloads', async () => {
    const view = await open();
    fireEvent.change(screen.getByLabelText('Pages to extract'), {
      target: { value: '3, 1-2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Extract pages' }));
    expect(
      await screen.findByRole('link', {
        name: 'Download report-extracted.pdf',
      }),
    ).toHaveAttribute('download', 'report-extracted.pdf');
    const output = await PDFDocument.load(await blobs[0].arrayBuffer());
    expect(output.getPages().map((page) => page.getWidth())).toEqual([
      220, 200, 210,
    ]);
    fireEvent.change(screen.getByLabelText('Pages to extract'), {
      target: { value: '2' },
    });
    expect(
      screen.queryByRole('link', { name: /Download report/ }),
    ).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pdf-1');
    fireEvent.click(screen.getByRole('button', { name: 'Extract pages' }));
    await screen.findByRole('link', { name: 'Download report-extracted.pdf' });
    view.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pdf-2');
  });

  it('creates a PDF for every range, including overlapping ranges', async () => {
    await open();
    fireEvent.click(screen.getByRole('radio', { name: /Split into ranges/i }));
    fireEvent.change(screen.getByLabelText('Range 1'), {
      target: { value: '1-3' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add range' }));
    fireEvent.change(screen.getByLabelText('Range 2'), {
      target: { value: '3-4' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Split PDF' }));
    await screen.findByRole('link', {
      name: 'Download report-part-2-pages-3-4.pdf',
    });
    expect(
      screen.getAllByRole('link', { name: /Download report-part/ }),
    ).toHaveLength(2);
    const documents = await Promise.all(
      blobs.map(async (blob) => PDFDocument.load(await blob.arrayBuffer())),
    );
    expect(
      documents.map((pdf) => pdf.getPages().map((page) => page.getWidth())),
    ).toEqual([
      [200, 210, 220],
      [220, 230],
    ]);
  });

  it('validates page numbers and rejects lists in individual range rows', async () => {
    await open();
    fireEvent.change(screen.getByLabelText('Pages to extract'), {
      target: { value: '5' },
    });
    expect(
      screen.getByText('Choose pages between 1 and 4.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Extract pages' }),
    ).toBeDisabled();
    expect(screen.getByLabelText('Pages to extract')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    fireEvent.click(screen.getByRole('radio', { name: /Split into ranges/i }));
    fireEvent.change(screen.getByLabelText('Range 1'), {
      target: { value: '1,3' },
    });
    expect(
      screen.getByText('Use one page or range in each row.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Split PDF' })).toBeDisabled();
  });

  it('ignores a late upload after reset and rejects multiple dropped PDFs', async () => {
    render(
      <MemoryRouter>
        <PdfSplitter />
      </MemoryRouter>,
    );
    fireEvent.drop(screen.getByRole('region', { name: 'PDF upload' }), {
      dataTransfer: { files: [await pdfFile(), await pdfFile()] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(/one PDF/i);
    const file = await pdfFile();
    const bytes = await file.arrayBuffer();
    let resolveRead: (bytes: ArrayBuffer) => void = () => undefined;
    rs.spyOn(file, 'arrayBuffer').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRead = resolve;
        }),
    );
    fireEvent.change(screen.getByLabelText('Choose a PDF'), {
      target: { files: [file] },
    });
    await waitFor(() => expect(file.arrayBuffer).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    resolveRead(bytes);
    await waitFor(() =>
      expect(screen.getByLabelText('Choose a PDF')).not.toBeDisabled(),
    );
    expect(screen.queryByText('report.pdf')).not.toBeInTheDocument();
  });
});
