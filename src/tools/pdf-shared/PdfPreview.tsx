import { ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import PdfPreviewPage from './PdfPreviewPage';
import PdfPreviewThumbnails from './PdfPreviewThumbnails';
import { type PdfPreviewSource, parsePreviewPage } from './pdfPreviewModel';
import { usePdfPreview } from './usePdfPreview';

export interface PdfPreviewProps {
  source: PdfPreviewSource;
  onClose: () => void;
  autoFocus?: boolean;
  description?: string;
  describePage?: (page: number) => string;
}

export default function PdfPreview({
  source,
  onClose,
  autoFocus = false,
  description,
  describePage,
}: PdfPreviewProps) {
  const { document, page, pageNumber, setPageNumber, error, retry } =
    usePdfPreview(source);
  const [draft, setDraft] = useState('1');
  const [pageError, setPageError] = useState('');
  const [zoom, setZoom] = useState<number | 'fit'>('fit');
  const [width, setWidth] = useState(600);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const pageCount = document?.numPages ?? 0;
  useEffect(() => {
    if (autoFocus && source.id) headingRef.current?.focus();
  }, [autoFocus, source]);
  useEffect(() => {
    setDraft(String(pageNumber));
    setPageError('');
  }, [pageNumber]);
  useEffect(() => {
    const container = surfaceRef.current;
    if (!container) return;
    const update = () => setWidth(container.clientWidth || 600);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  function navigate(number: number) {
    if (number >= 1 && number <= pageCount) setPageNumber(number);
    setDraft(String(number));
    setPageError('');
  }
  function commitPage() {
    const number = parsePreviewPage(draft, pageCount);
    if (number === null)
      setPageError(`Enter a whole page number between 1 and ${pageCount}.`);
    else navigate(number);
  }

  const originalPage = source.originalPages?.[pageNumber - 1];
  const pageStatus =
    source.kind === 'output'
      ? `Output page ${pageNumber} of ${pageCount}${originalPage ? ` · Original page ${originalPage}` : ''}`
      : `Source page ${pageNumber} of ${pageCount}`;

  return (
    <section
      aria-label="PDF preview"
      className="min-w-0 space-y-4 rounded-box border border-base-300 p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-base-content/65">
            {source.kind === 'source' ? 'Source document' : 'Generated output'}
          </p>
          <h2
            className="mt-1 break-all text-base font-semibold focus-visible:outline-2"
            ref={headingRef}
            tabIndex={-1}
          >
            Preview: {source.filename}
          </h2>
          {description ? (
            <p className="mt-1 text-xs text-base-content/70">{description}</p>
          ) : null}
        </div>
        <button
          aria-label="Close preview"
          className="btn btn-ghost btn-square btn-sm shrink-0"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={16} />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          aria-label="Previous page"
          className="btn btn-square btn-sm"
          disabled={!document || pageNumber <= 1}
          onClick={() => navigate(pageNumber - 1)}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={16} />
        </button>
        <label className="sr-only" htmlFor={`${id}-page`}>
          Preview page number
        </label>
        <input
          aria-describedby={pageError ? `${id}-error` : undefined}
          aria-invalid={Boolean(pageError)}
          className="input input-sm w-16 text-center tabular-nums"
          disabled={!document}
          id={`${id}-page`}
          inputMode="numeric"
          onBlur={commitPage}
          onChange={(event) => {
            setDraft(event.currentTarget.value);
            setPageError('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitPage();
          }}
          value={draft}
        />
        <span className="text-xs text-base-content/70">
          of {pageCount || '…'}
        </span>
        <button
          aria-label="Next page"
          className="btn btn-square btn-sm"
          disabled={!document || pageNumber >= pageCount}
          onClick={() => navigate(pageNumber + 1)}
          type="button"
        >
          <ChevronRight aria-hidden="true" size={16} />
        </button>
        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            aria-label="Zoom out"
            className="btn btn-square btn-sm"
            disabled={!document || zoom === 0.5}
            onClick={() =>
              setZoom(Math.max(0.5, (zoom === 'fit' ? 1 : zoom) - 0.25))
            }
            type="button"
          >
            <Minus aria-hidden="true" size={15} />
          </button>
          <span className="min-w-12 text-center text-xs tabular-nums">
            {zoom === 'fit' ? 'Fit' : `${Math.round(zoom * 100)}%`}
          </span>
          <button
            aria-label="Zoom in"
            className="btn btn-square btn-sm"
            disabled={!document || zoom === 2}
            onClick={() =>
              setZoom(Math.min(2, (zoom === 'fit' ? 1 : zoom) + 0.25))
            }
            type="button"
          >
            <Plus aria-hidden="true" size={15} />
          </button>
          <button
            aria-pressed={zoom === 'fit'}
            className="btn btn-sm"
            disabled={!document}
            onClick={() => setZoom('fit')}
            type="button"
          >
            Fit to width
          </button>
        </div>
      </div>
      {pageError ? (
        <p className="text-xs text-error" id={`${id}-error`}>
          {pageError}
        </p>
      ) : null}
      <p
        aria-live="polite"
        aria-atomic="true"
        className="text-xs text-base-content/70"
      >
        {error
          ? 'Preview unavailable.'
          : page
            ? pageStatus
            : 'Loading preview…'}{' '}
        {document && describePage ? describePage(pageNumber) : ''}
      </p>
      {error ? (
        <div className="alert alert-error text-sm" role="alert">
          <span>{error}</span>
          <button className="btn btn-sm" onClick={retry} type="button">
            Retry preview
          </button>
        </div>
      ) : null}
      <div className="min-w-0" ref={surfaceRef}>
        {document ? (
          <div className="space-y-4">
            <PdfPreviewPage
              filename={source.filename}
              page={page}
              width={width}
              zoom={zoom}
            />
            <PdfPreviewThumbnails
              document={document}
              filename={source.filename}
              onPage={navigate}
              pageNumber={pageNumber}
            />
          </div>
        ) : !error ? (
          <p className="flex min-h-40 items-center justify-center gap-2 text-sm text-base-content/70">
            <span
              aria-hidden="true"
              className="loading loading-spinner loading-sm"
            />
            Loading document…
          </p>
        ) : null}
      </div>
    </section>
  );
}
