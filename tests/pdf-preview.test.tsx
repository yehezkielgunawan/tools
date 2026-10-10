import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

const mocks = rs.hoisted(() => ({ load: rs.fn() }));
rs.mock('../src/tools/pdf-shared/pdfjsClient', () => ({
  loadPdfDocument: mocks.load,
}));
rs.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  TextLayer: class {
    render() {
      return Promise.resolve();
    }
    cancel() {}
  },
}));

import PdfPreview from '../src/tools/pdf-shared/PdfPreview';

function page(number: number) {
  return {
    pageNumber: number,
    getViewport: ({ scale }: { scale: number }) => ({
      width: 600 * scale,
      height: 800 * scale,
      scale,
      userUnit: 1,
      rotation: 0,
    }),
    render: () => ({ promise: Promise.resolve(), cancel: rs.fn() }),
    getTextContent: () =>
      Promise.resolve({
        items: [{ str: `Readable page ${number}`, hasEOL: true }],
        styles: {},
      }),
    cleanup: rs.fn(),
  };
}

beforeEach(() => {
  rs.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    {} as CanvasRenderingContext2D,
  );
  mocks.load.mockReturnValue({
    promise: Promise.resolve({
      numPages: 8,
      getPage: rs
        .fn()
        .mockImplementation((number) => Promise.resolve(page(number))),
    }),
    destroy: rs.fn().mockResolvedValue(undefined),
  });
});
afterEach(() => {
  cleanup();
  rs.restoreAllMocks();
  mocks.load.mockReset();
});

describe('accessible PDF preview', () => {
  it('keeps readable text available when canvas rendering throws synchronously', async () => {
    const brokenPage = {
      ...page(1),
      render: () => {
        throw new Error('canvas unavailable');
      },
    };
    mocks.load.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: () => Promise.resolve(brokenPage),
      }),
      destroy: rs.fn().mockResolvedValue(undefined),
    });
    render(
      <PdfPreview
        source={{
          id: 'broken-render',
          filename: 'report.pdf',
          kind: 'source',
          data: new Uint8Array([1]),
        }}
        onClose={() => undefined}
      />,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /could not be rendered/i,
    );
    await screen.findByText('Readable page 1');
  });
  it('navigates, validates page input, exposes readable text and limits thumbnails', async () => {
    render(
      <PdfPreview
        source={{
          id: 'source',
          filename: 'report.pdf',
          kind: 'source',
          data: new Uint8Array([1]),
        }}
        onClose={() => undefined}
      />,
    );
    await screen.findByText('Readable page 1');
    expect(
      screen.getByRole('button', { name: 'Previous page' }),
    ).toBeDisabled();
    expect(
      screen.getAllByRole('button', { name: /Show page \d+ of report.pdf/ }),
    ).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByText('Readable page 2');
    const input = screen.getByLabelText('Preview page number');
    fireEvent.change(input, { target: { value: '9' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(input, { target: { value: '8' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await screen.findByText('Readable page 8');
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Show page 8 of report.pdf' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('distinguishes output pages from original pages and retains focus on close', async () => {
    const close = rs.fn();
    render(
      <PdfPreview
        source={{
          id: 'output',
          filename: 'extracted.pdf',
          kind: 'output',
          data: new Uint8Array([1]),
          originalPages: [3, 1],
        }}
        onClose={close}
        autoFocus
      />,
    );
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Preview: extracted.pdf' }),
      ).toHaveFocus(),
    );
    await screen.findByText(/Output page 1 of 8 · Original page 3/);
    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }));
    expect(close).toHaveBeenCalled();
  });

  it('supports retry when preview loading fails', async () => {
    mocks.load.mockReturnValueOnce({
      promise: Promise.reject(new Error('broken')),
      destroy: rs.fn().mockResolvedValue(undefined),
    });
    render(
      <PdfPreview
        source={{
          id: 'pdf',
          filename: 'report.pdf',
          kind: 'source',
          data: new Uint8Array([1]),
        }}
        onClose={() => undefined}
      />,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Could not preview/i,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry preview' }));
    await screen.findByText('Readable page 1');
  });
  it('refocuses an already-open preview without reloading the document', async () => {
    const data = new Uint8Array([1]);
    const source = {
      id: 'same',
      filename: 'report.pdf',
      kind: 'source' as const,
      data,
    };
    const view = render(
      <PdfPreview source={source} onClose={() => undefined} autoFocus />,
    );
    await screen.findByText('Readable page 1');
    screen.getByRole('button', { name: 'Next page' }).focus();
    view.rerender(
      <PdfPreview source={{ ...source }} onClose={() => undefined} autoFocus />,
    );
    expect(
      screen.getByRole('heading', { name: 'Preview: report.pdf' }),
    ).toHaveFocus();
    expect(mocks.load).toHaveBeenCalledTimes(1);
  });
});
