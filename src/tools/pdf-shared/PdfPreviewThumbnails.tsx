import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getThumbnailPages } from './pdfPreviewModel';

interface PdfPreviewThumbnailsProps {
  document: PDFDocumentProxy;
  filename: string;
  pageNumber: number;
  onPage: (page: number) => void;
}

export default function PdfPreviewThumbnails({
  document,
  filename,
  pageNumber,
  onPage,
}: PdfPreviewThumbnailsProps) {
  const pages = getThumbnailPages(pageNumber, document.numPages);
  const windowKey = pages.join(',');
  const visiblePages = useMemo(
    () => windowKey.split(',').map(Number),
    [windowKey],
  );
  const canvases = useRef(new Map<number, HTMLCanvasElement>());
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    let renderTask: RenderTask | null = null;
    const targets = visiblePages.map((number) => canvases.current.get(number));
    setError('');
    const render = async () => {
      for (const number of visiblePages) {
        if (cancelled) return;
        try {
          const page = await document.getPage(number);
          if (cancelled) return;
          const canvas = canvases.current.get(number);
          const context = canvas?.getContext('2d');
          if (!canvas || !context) continue;
          const natural = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({
            scale: Math.min(160 / natural.width, 200 / natural.height),
          });
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          renderTask = page.render({
            canvas,
            canvasContext: context,
            viewport,
          });
          await renderTask.promise;
          renderTask = null;
        } catch {
          if (!cancelled)
            setError(
              'Some thumbnails could not be rendered. Use the page navigation controls instead.',
            );
        }
      }
    };
    void render();
    return () => {
      cancelled = true;
      renderTask?.cancel();
      for (const canvas of targets)
        if (canvas) {
          canvas.width = 0;
          canvas.height = 0;
        }
    };
  }, [document, visiblePages]);

  return (
    <nav aria-label="Preview page thumbnails" className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {visiblePages.map((number) => (
          <button
            aria-current={number === pageNumber ? 'page' : undefined}
            aria-label={`Show page ${number} of ${filename}`}
            className={`flex w-24 shrink-0 flex-col items-center gap-2 rounded-box border p-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 ${number === pageNumber ? 'border-base-content bg-base-200' : 'border-base-300'}`}
            key={number}
            onClick={() => onPage(number)}
            type="button"
          >
            <canvas
              aria-hidden="true"
              tabIndex={-1}
              className="max-h-24 max-w-full bg-white"
              ref={(canvas) => {
                if (canvas) canvases.current.set(number, canvas);
                else canvases.current.delete(number);
              }}
            />
            <span>Page {number}</span>
          </button>
        ))}
      </div>
      {error ? <p className="text-xs text-base-content/70">{error}</p> : null}
    </nav>
  );
}
