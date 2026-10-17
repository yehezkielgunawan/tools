import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { RasterDocument } from './conversionTypes';

export default function SourcePreview({
  source,
  unit,
}: {
  source: RasterDocument;
  unit: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(1);
  const [state, setState] = useState('Rendering preview…');
  useEffect(() => {
    const controller = new AbortController();
    // A detached canvas keeps late, non-interruptible PPTX renders away from the next preview.
    const target = document.createElement('canvas');
    setState('Rendering preview…');
    void source
      .render(page, target, 800, controller.signal)
      .then(() => {
        if (controller.signal.aborted || !canvas.current) return;
        canvas.current.width = target.width;
        canvas.current.height = target.height;
        canvas.current.getContext('2d')?.drawImage(target, 0, 0);
        setState('');
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState(
            'This preview could not be rendered. Try exporting this page, or choose another file.',
          );
      })
      .finally(() => {
        target.width = 0;
        target.height = 0;
      });
    return () => controller.abort();
  }, [source, page]);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          className="btn btn-sm btn-square"
          type="button"
          aria-label={`Previous ${unit}`}
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <span className="text-sm">
          {unit === 'page' ? 'Page' : 'Slide'} {page} of {source.count}
        </span>
        <button
          className="btn btn-sm btn-square"
          type="button"
          aria-label={`Next ${unit}`}
          disabled={page === source.count}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-box border border-base-300 bg-base-200 p-3">
        {state ? (
          <p className="text-sm text-base-content/65" role="status">
            {state}
          </p>
        ) : null}
        <canvas
          ref={canvas}
          role="img"
          aria-label={`Preview of ${unit} ${page}`}
          className={
            state
              ? 'hidden'
              : 'max-h-96 max-w-full bg-white object-contain shadow-sm'
          }
        />
      </div>
    </div>
  );
}
