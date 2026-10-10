import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PDFDocument } from 'pdf-lib';
import { MemoryRouter } from 'react-router';
import PdfMerger from '../src/tools/pdf-merger/PdfMerger';

async function pdfFile(name: string, width: number) {
  const pdf = await PDFDocument.create();
  pdf.addPage([width, 400]);
  return new File([await pdf.save()], name, { type: 'application/pdf' });
}

describe('PDF Merger', () => {
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

  it('reorders real PDFs, merges, and invalidates downloads after a queue change', async () => {
    const view = render(
      <MemoryRouter>
        <PdfMerger />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Merge PDFs' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Choose PDFs'), {
      target: {
        files: [
          await pdfFile('first.pdf', 200),
          await pdfFile('second.pdf', 300),
        ],
      },
    });
    await screen.findByText('second.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Move second.pdf up' }));
    fireEvent.change(screen.getByLabelText('Output filename'), {
      target: { value: 'combined' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Merge PDFs' }));
    const link = await screen.findByRole('link', {
      name: /Download combined.pdf/i,
    });
    expect(link).toHaveAttribute('download', 'combined.pdf');
    const output = await PDFDocument.load(await blobs[0].arrayBuffer());
    expect(output.getPages().map((page) => page.getWidth())).toEqual([
      300, 200,
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove first.pdf' }));
    expect(
      screen.queryByRole('link', { name: /Download combined.pdf/i }),
    ).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pdf-1');
    view.unmount();
  });

  it('retains valid files when another file is invalid and supports drop uploads', async () => {
    render(
      <MemoryRouter>
        <PdfMerger />
      </MemoryRouter>,
    );
    fireEvent.drop(screen.getByRole('region', { name: 'PDF upload' }), {
      dataTransfer: {
        files: [
          new File(['no'], 'broken.pdf'),
          await pdfFile('valid.pdf', 200),
        ],
      },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /broken.pdf.*not a valid PDF/i,
    );
    await screen.findByText('valid.pdf');
    expect(screen.getByRole('button', { name: 'Merge PDFs' })).toBeDisabled();
  });

  it('does not repopulate the queue when a cleared upload finishes late', async () => {
    render(
      <MemoryRouter>
        <PdfMerger />
      </MemoryRouter>,
    );
    const file = await pdfFile('late.pdf', 200);
    const bytes = await file.arrayBuffer();
    let resolveRead: (value: ArrayBuffer) => void = () => undefined;
    rs.spyOn(file, 'arrayBuffer').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRead = resolve;
        }),
    );
    fireEvent.change(screen.getByLabelText('Choose PDFs'), {
      target: { files: [file] },
    });
    await waitFor(() => expect(file.arrayBuffer).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    resolveRead(bytes);
    await waitFor(() =>
      expect(screen.getByLabelText('Choose PDFs')).not.toBeDisabled(),
    );
    expect(screen.queryByText('late.pdf')).not.toBeInTheDocument();
  });
});
