import type { PDFPageProxy, RenderTask } from 'pdfjs-dist';
import { TextLayer } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getCanvasScale } from './pdfPreviewModel';
import './pdfPreview.css';

interface PdfPreviewPageProps {
  page: PDFPageProxy | null;
  filename: string;
  width: number;
  zoom: number | 'fit';
}

export default function PdfPreviewPage({
  page,
  filename,
  width,
  zoom,
}: PdfPreviewPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [textReady, setTextReady] = useState(false);
  const [textError, setTextError] = useState('');
  const [renderError, setRenderError] = useState('');
  const [rendering, setRendering] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const viewport = useMemo(() => {
    if (!page) return null;
    const natural = page.getViewport({ scale: 1 });
    return page.getViewport({
      scale:
        zoom === 'fit' ? Math.max(0.05, (width - 24) / natural.width) : zoom,
    });
  }, [page, width, zoom]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: The retry counter intentionally restarts canvas and text rendering.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = textRef.current;
    setText('');
    setTextReady(false);
    setTextError('');
    setRenderError('');
    setRendering(true);
    if (!page || !viewport || !canvas || !container) return;
    let cancelled = false;
    let textLayer: TextLayer | null = null;
    const context = canvas.getContext('2d');
    if (!context) {
      setRenderError(
        'Your browser could not render this page. You can still use Page text or download the PDF.',
      );
      setRendering(false);
    }
    const outputScale = getCanvasScale(
      viewport.width,
      viewport.height,
      window.devicePixelRatio,
    );
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    let task: RenderTask | null = null;
    try {
      task = context
        ? page.render({
            canvas,
            canvasContext: context,
            viewport,
            transform: [outputScale, 0, 0, outputScale, 0, 0],
          })
        : null;
    } catch {
      setRenderError(
        'This page could not be rendered. Your file and downloads are still available.',
      );
      setRendering(false);
    }
    void task?.promise
      .then(() => {
        if (!cancelled) setRendering(false);
      })
      .catch((error: unknown) => {
        if (
          !cancelled &&
          !(
            error instanceof Error &&
            error.name === 'RenderingCancelledException'
          )
        ) {
          setRenderError(
            'This page could not be rendered. Your file and downloads are still available.',
          );
          setRendering(false);
        }
      });
    void page
      .getTextContent()
      .then(async (content) => {
        if (cancelled) return;
        setText(
          content.items
            .map((item) =>
              'str' in item ? `${item.str}${item.hasEOL ? '\n' : ' '}` : '',
            )
            .join('')
            .trim(),
        );
        setTextReady(true);
        textLayer = new TextLayer({
          textContentSource: content,
          container,
          viewport,
        });
        await textLayer.render();
      })
      .catch(() => {
        if (!cancelled) {
          setTextReady(true);
          setTextError('Selectable text could not be loaded for this page.');
        }
      });
    return () => {
      cancelled = true;
      task?.cancel();
      textLayer?.cancel();
      container.replaceChildren();
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [page, viewport, attempt]);

  return (
    <div className="space-y-3">
      {renderError ? (
        <div className="alert alert-error text-sm" role="alert">
          <span>{renderError}</span>
          <button
            className="btn btn-sm"
            onClick={() => setAttempt((value) => value + 1)}
            type="button"
          >
            Retry page
          </button>
        </div>
      ) : null}
      <section
        aria-label="Scrollable PDF page"
        className="max-h-[70vh] overflow-auto rounded-box border border-base-300 bg-base-200 p-3 focus-visible:outline-2 focus-visible:outline-offset-2"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll zoomed pages.
        tabIndex={0}
      >
        {rendering ? (
          <p className="mb-2 text-xs text-base-content/70" role="status">
            Rendering page…
          </p>
        ) : null}
        <div
          className="relative mx-auto bg-white shadow-sm"
          style={
            viewport
              ? { width: viewport.width, height: viewport.height }
              : { minHeight: 160 }
          }
        >
          <canvas
            aria-hidden={!page || Boolean(renderError)}
            aria-label={`Visual preview of ${filename}, page ${page?.pageNumber ?? 1}. Read its contents in Page text.`}
            className="block"
            ref={canvasRef}
            role="img"
            style={
              viewport
                ? { width: viewport.width, height: viewport.height }
                : undefined
            }
          />
          <div
            aria-hidden="true"
            className="pdf-preview-text"
            ref={textRef}
            style={
              {
                '--total-scale-factor':
                  (viewport?.scale ?? 1) * (viewport?.userUnit ?? 1),
              } as CSSProperties
            }
          />
        </div>
      </section>
      <details className="rounded-box border border-base-300 px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium">
          Page text
        </summary>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">
          {!textReady
            ? 'Loading page text…'
            : text || textError || 'No selectable text was found on this page.'}
        </p>
        {text && textError ? (
          <p className="mt-2 text-xs text-base-content/70">{textError}</p>
        ) : null}
      </details>
    </div>
  );
}
