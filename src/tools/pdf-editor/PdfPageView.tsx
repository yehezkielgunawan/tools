import type { PDFPageProxy } from 'pdfjs-dist';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  movePdfEdit,
  type NormalizedPoint,
  type PdfEdit,
  type PdfSignatureEdit,
  resizePdfSignature,
} from './editModel';

export type PdfToolMode = 'select' | 'text' | 'pen' | 'signature';

interface PdfPageViewProps {
  color: string;
  edits: readonly PdfEdit[];
  onCreatePen: (points: NormalizedPoint[]) => void;
  onCreateText: (point: NormalizedPoint) => void;
  onMoveEdit: (edit: PdfEdit) => void;
  onPlaceSignature: (point: NormalizedPoint) => void;
  onRenderError: (error: unknown) => void;
  onSelectEdit: (id: string | null) => void;
  page: PDFPageProxy;
  selectedEditId: string | null;
  signature: Omit<PdfSignatureEdit, 'id' | 'pageIndex' | 'x' | 'y'> | null;
  toolMode: PdfToolMode;
  zoom: number;
}

function getNormalizedPoint(
  event: ReactPointerEvent<HTMLDivElement>,
): NormalizedPoint {
  const bounds = event.currentTarget.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) / bounds.width,
    y: (event.clientY - bounds.top) / bounds.height,
  };
}

function getEditId(target: EventTarget): string | null {
  return target instanceof Element
    ? (target.closest<HTMLElement>('[data-edit-id]')?.dataset.editId ?? null)
    : null;
}

function getSignaturePath(stroke: readonly NormalizedPoint[]): string {
  return stroke
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
}

export default function PdfPageView({
  color,
  edits,
  onCreatePen,
  onCreateText,
  onMoveEdit,
  onPlaceSignature,
  onRenderError,
  onSelectEdit,
  page,
  selectedEditId,
  signature,
  toolMode,
  zoom,
}: PdfPageViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef<NormalizedPoint[] | null>(null);
  const dragRef = useRef<{
    action: 'move' | 'resize';
    edit: PdfEdit;
    start: NormalizedPoint;
  } | null>(null);
  const [drawing, setDrawing] = useState<NormalizedPoint[]>([]);
  const [movingEdit, setMovingEdit] = useState<PdfEdit | null>(null);
  const viewport = useMemo(
    () => page.getViewport({ scale: zoom }),
    [page, zoom],
  );
  const visibleEdits = edits.map((edit) =>
    movingEdit?.id === edit.id ? movingEdit : edit,
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const outputScale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    const renderTask = page.render({
      canvas,
      canvasContext: context,
      transform:
        outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
      viewport,
    });

    void renderTask.promise.catch((error: unknown) => {
      if (
        error instanceof Error &&
        error.name === 'RenderingCancelledException'
      ) {
        return;
      }
      onRenderError(error);
    });

    return () => renderTask.cancel();
  }, [onRenderError, page, viewport]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (toolMode === 'select') {
      const editId = getEditId(event.target);
      const edit = edits.find((candidate) => candidate.id === editId);
      onSelectEdit(editId);
      if (edit) {
        const isResizeHandle =
          event.target instanceof Element &&
          event.target.closest('[data-resize-handle]') !== null;
        dragRef.current = {
          action:
            isResizeHandle && edit.kind === 'signature' ? 'resize' : 'move',
          edit,
          start: getNormalizedPoint(event),
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      return;
    }

    const point = getNormalizedPoint(event);
    if (toolMode === 'text') {
      onCreateText(point);
    } else if (toolMode === 'signature' && signature) {
      onPlaceSignature(point);
    } else if (toolMode === 'pen') {
      drawingRef.current = [point];
      setDrawing([point]);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = getNormalizedPoint(event);
    if (drawingRef.current) {
      const next = [...drawingRef.current, point];
      drawingRef.current = next;
      setDrawing(next);
    }

    if (dragRef.current) {
      const { action, edit, start } = dragRef.current;
      const deltaX = point.x - start.x;
      const deltaY = point.y - start.y;
      setMovingEdit(
        action === 'resize' && edit.kind === 'signature'
          ? resizePdfSignature(edit, deltaX, deltaY)
          : movePdfEdit(edit, deltaX, deltaY),
      );
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drawingRef.current) {
      const points = drawingRef.current;
      drawingRef.current = null;
      setDrawing([]);
      if (points.length > 1) onCreatePen(points);
    }

    if (dragRef.current) {
      const edit = movingEdit;
      dragRef.current = null;
      setMovingEdit(null);
      if (edit) onMoveEdit(edit);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerCancel = () => {
    drawingRef.current = null;
    dragRef.current = null;
    setDrawing([]);
    setMovingEdit(null);
  };

  return (
    <div
      className="relative mx-auto shrink-0 overflow-hidden bg-white shadow-[0_18px_50px_-24px_rgba(20,28,40,0.5)] ring-1 ring-base-content/10"
      style={{ height: viewport.height, width: viewport.width }}
    >
      <canvas aria-label={`PDF page ${page.pageNumber}`} ref={canvasRef} />
      <div
        className={`absolute inset-0 touch-none ${toolMode === 'pen' ? 'cursor-crosshair' : toolMode === 'text' || toolMode === 'signature' ? 'cursor-copy' : toolMode === 'select' ? 'cursor-default' : ''}`}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <svg
          aria-label="PDF annotations"
          className="pointer-events-none absolute inset-0 overflow-visible"
          height={viewport.height}
          viewBox={`0 0 ${viewport.width} ${viewport.height}`}
          width={viewport.width}
        >
          {visibleEdits.map((edit) => {
            if (edit.kind === 'text' || edit.kind === 'signature') return null;
            const points = edit.points
              .map(
                (point) =>
                  `${point.x * viewport.width},${point.y * viewport.height}`,
              )
              .join(' ');

            return (
              <polyline
                className={
                  toolMode === 'select' ? 'pointer-events-[stroke]' : ''
                }
                data-edit-id={edit.id}
                fill="none"
                key={edit.id}
                points={points}
                stroke={edit.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={edit.width * zoom}
              />
            );
          })}
          {drawing.length > 1 ? (
            <polyline
              fill="none"
              points={drawing
                .map(
                  (point) =>
                    `${point.x * viewport.width},${point.y * viewport.height}`,
                )
                .join(' ')}
              stroke={color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5 * zoom}
            />
          ) : null}
        </svg>

        {visibleEdits.map((edit) => {
          if (edit.kind === 'text') {
            return (
              <div
                className={`absolute min-w-4 whitespace-pre-wrap leading-tight ${edit.id === selectedEditId ? 'outline outline-1 outline-primary outline-offset-2' : ''}`}
                data-edit-id={edit.id}
                key={edit.id}
                style={{
                  color: edit.color,
                  fontSize: edit.fontSize * zoom,
                  left: edit.x * viewport.width,
                  top: edit.y * viewport.height,
                }}
              >
                {edit.text}
              </div>
            );
          }

          if (edit.kind === 'signature') {
            return (
              <div
                className={`absolute ${edit.id === selectedEditId ? 'outline outline-1 outline-primary outline-offset-2' : ''}`}
                data-edit-id={edit.id}
                key={edit.id}
                style={{
                  height: edit.height * viewport.height,
                  left: edit.x * viewport.width,
                  top: edit.y * viewport.height,
                  width: edit.width * viewport.width,
                }}
              >
                <svg
                  aria-label="Signature"
                  className="size-full overflow-visible"
                  preserveAspectRatio="none"
                  viewBox="0 0 1 1"
                >
                  {edit.strokes.map((stroke) => (
                    <path
                      d={getSignaturePath(stroke)}
                      fill="none"
                      key={getSignaturePath(stroke)}
                      stroke={edit.color}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={
                        (edit.strokeWidth * zoom) /
                        (edit.width * viewport.width)
                      }
                    />
                  ))}
                </svg>
                {edit.id === selectedEditId ? (
                  <button
                    aria-label="Resize signature"
                    className="absolute -bottom-2 -right-2 size-4 cursor-nwse-resize rounded-full border border-primary bg-base-100 shadow-sm"
                    data-resize-handle
                    title="Resize signature"
                    type="button"
                  />
                ) : null}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
