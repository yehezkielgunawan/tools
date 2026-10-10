import { afterEach, describe, expect, it, rs } from '@rstest/core';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { PDFDocument } from 'pdf-lib';
import { MemoryRouter } from 'react-router';

rs.mock('../src/tools/pdf-shared/PdfPreview', () => ({
  default: ({
    source,
    onClose,
    description,
    describePage,
  }: {
    source: { filename: string; kind: string; originalPages?: number[] };
    onClose: () => void;
    description?: string;
    describePage?: (page: number) => string;
  }) => (
    <section aria-label="PDF preview">
      <h2>Preview: {source.filename}</h2>
      <p>{description}</p>
      <p>{describePage?.(1)}</p>
      <p>{source.originalPages?.join(',')}</p>
      <button onClick={onClose} type="button">
        Close preview
      </button>
    </section>
  ),
}));

import PdfMerger from '../src/tools/pdf-merger/PdfMerger';
import PdfSplitter from '../src/tools/pdf-splitter/PdfSplitter';

async function fixture(name: string) {
  const pdf = await PDFDocument.create();
  for (let page = 0; page < 4; page += 1) pdf.addPage([200, 300]);
  return new File([await pdf.save()], name, { type: 'application/pdf' });
}
afterEach(() => rs.restoreAllMocks());

describe('PDF previews in tool workflows', () => {
  it('keeps a merger source preview across reordering and restores focus on close', async () => {
    render(
      <MemoryRouter>
        <PdfMerger />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Choose PDFs'), {
      target: {
        files: [await fixture('first.pdf'), await fixture('second.pdf')],
      },
    });
    const opener = await screen.findByRole('button', {
      name: 'Preview second.pdf',
    });
    fireEvent.click(opener);
    await screen.findByRole('heading', { name: 'Preview: second.pdf' });
    expect(
      screen.getByText('Document 2 of 2 in merge order.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Move second.pdf up' }));
    expect(
      screen.getByText('Document 1 of 2 in merge order.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }));
    await waitFor(() => expect(opener).toHaveFocus());
    fireEvent.click(opener);
    await screen.findByRole('heading', { name: 'Preview: second.pdf' });
    fireEvent.click(screen.getByRole('button', { name: 'Remove second.pdf' }));
    expect(
      screen.queryByRole('region', { name: 'PDF preview' }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText('Choose PDFs')).toHaveFocus(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Preview first.pdf' }));
    await screen.findByRole('heading', { name: 'Preview: first.pdf' });
    const clear = screen.getByRole('button', { name: 'Clear all' });
    clear.focus();
    fireEvent.click(clear);
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    expect(clear).toHaveFocus();
  });

  it('previews merged output and closes obsolete output after inputs change', async () => {
    rs.spyOn(URL, 'createObjectURL').mockReturnValue('blob:merged');
    rs.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    render(
      <MemoryRouter>
        <PdfMerger />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Choose PDFs'), {
      target: {
        files: [await fixture('first.pdf'), await fixture('second.pdf')],
      },
    });
    await screen.findByText('second.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Merge PDFs' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Preview merged.pdf' }),
    );
    await screen.findByRole('heading', { name: 'Preview: merged.pdf' });
    fireEvent.change(screen.getByLabelText('Output filename'), {
      target: { value: 'new.pdf' },
    });
    expect(
      screen.queryByRole('region', { name: 'PDF preview' }),
    ).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:merged');
  });

  it('opens splitter source automatically and preserves extraction mappings in output preview', async () => {
    rs.spyOn(URL, 'createObjectURL').mockReturnValue('blob:extracted');
    rs.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    render(
      <MemoryRouter>
        <PdfSplitter />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Choose a PDF'), {
      target: { files: [await fixture('report.pdf')] },
    });
    await screen.findByRole('heading', { name: 'Preview: report.pdf' });
    fireEvent.change(screen.getByLabelText('Pages to extract'), {
      target: { value: '3,1-2' },
    });
    expect(screen.getByText('Included in extraction.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Extract pages' }));
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Preview report-extracted.pdf',
      }),
    );
    await screen.findByRole('heading', {
      name: 'Preview: report-extracted.pdf',
    });
    expect(screen.getByText('3,1,2')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Pages to extract'), {
      target: { value: '2' },
    });
    expect(
      screen.queryByRole('region', { name: 'PDF preview' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preview report.pdf' }));
    await screen.findByRole('heading', { name: 'Preview: report.pdf' });
    expect(screen.getByText('Not included in extraction.')).toBeInTheDocument();
  });

  it('shows membership of the chosen splitter range and marks invalid selection honestly', async () => {
    render(
      <MemoryRouter>
        <PdfSplitter />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Choose a PDF'), {
      target: { files: [await fixture('report.pdf')] },
    });
    await screen.findByRole('heading', { name: 'Preview: report.pdf' });
    fireEvent.click(screen.getByRole('radio', { name: /Split into ranges/ }));
    fireEvent.change(screen.getByLabelText('Range 1'), {
      target: { value: '1-2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add range' }));
    fireEvent.change(screen.getByLabelText('Range 2'), {
      target: { value: '3-4' },
    });
    fireEvent.change(screen.getByLabelText('Range to inspect'), {
      target: { value: '1' },
    });
    expect(screen.getByText('Not included in range 2.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Range 2'), {
      target: { value: '0' },
    });
    expect(screen.getByText('Selection is invalid.')).toBeInTheDocument();
  });
});
