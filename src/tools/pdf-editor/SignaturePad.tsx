import { Check, RotateCcw, X } from 'lucide-react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { NormalizedPoint } from './editModel';

interface SignaturePadProps {
  color: string;
  onApply: (strokes: NormalizedPoint[][]) => void;
  onClose: () => void;
}

const PAD_WIDTH = 720;
const PAD_HEIGHT = 220;

function drawStrokes(
  canvas: HTMLCanvasElement,
  strokes: readonly NormalizedPoint[][],
  activeStroke: readonly NormalizedPoint[],
  color: string,
): void {
  const context = canvas.getContext('2d');
  if (!context) return;

  context.clearRect(0, 0, PAD_WIDTH, PAD_HEIGHT);
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  for (const stroke of [...strokes, activeStroke]) {
    const firstPoint = stroke[0];
    if (!firstPoint) continue;
    context.beginPath();
    context.moveTo(firstPoint.x * PAD_WIDTH, firstPoint.y * PAD_HEIGHT);
    for (const point of stroke.slice(1)) {
      context.lineTo(point.x * PAD_WIDTH, point.y * PAD_HEIGHT);
    }
    context.stroke();
  }
}

export default function SignaturePad({
  color,
  onApply,
  onClose,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStrokeRef = useRef<NormalizedPoint[]>([]);
  const [strokes, setStrokes] = useState<NormalizedPoint[][]>([]);
  const [activeStroke, setActiveStroke] = useState<NormalizedPoint[]>([]);

  useEffect(() => {
    if (canvasRef.current) {
      drawStrokes(canvasRef.current, strokes, activeStroke, color);
    }
  }, [activeStroke, color, strokes]);

  const getPoint = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ): NormalizedPoint => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) / bounds.width,
      y: (event.clientY - bounds.top) / bounds.height,
    };
  };

  const startStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = getPoint(event);
    activeStrokeRef.current = [point];
    setActiveStroke([point]);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const continueStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activeStrokeRef.current.length === 0) return;
    const points = [...activeStrokeRef.current, getPoint(event)];
    activeStrokeRef.current = points;
    setActiveStroke(points);
  };

  const finishStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activeStrokeRef.current.length > 1) {
      setStrokes((current) => [...current, activeStrokeRef.current]);
    }
    activeStrokeRef.current = [];
    setActiveStroke([]);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const clear = () => {
    activeStrokeRef.current = [];
    setStrokes([]);
    setActiveStroke([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral/45 p-4 backdrop-blur-sm">
      <button
        aria-label="Close signature dialog"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="signature-dialog-title"
        aria-modal="true"
        className="card relative z-10 w-full max-w-2xl border border-base-300 bg-base-100 shadow-2xl"
        role="dialog"
      >
        <div className="card-body gap-5 p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/45">
                Signature
              </p>
              <h2
                className="mt-1 text-xl font-semibold tracking-tight"
                id="signature-dialog-title"
              >
                Draw your signature
              </h2>
              <p className="mt-1 text-sm text-base-content/55">
                It stays in this editing session only.
              </p>
            </div>
            <button
              aria-label="Close signature dialog"
              className="btn btn-sm btn-circle btn-ghost"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={17} />
            </button>
          </div>

          <div className="overflow-hidden rounded-box border border-base-300 bg-base-100">
            <canvas
              aria-label="Draw signature in this area"
              className="block h-auto w-full touch-none"
              height={PAD_HEIGHT}
              onPointerCancel={() => {
                activeStrokeRef.current = [];
                setActiveStroke([]);
              }}
              onPointerDown={startStroke}
              onPointerMove={continueStroke}
              onPointerUp={finishStroke}
              ref={canvasRef}
              width={PAD_WIDTH}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-5 text-base-content/45">
              This is a visual signature, not a cryptographic digital signature.
            </p>
            <div className="flex gap-2">
              <button
                className="btn btn-sm btn-ghost"
                onClick={clear}
                type="button"
              >
                <RotateCcw aria-hidden="true" size={15} />
                Clear
              </button>
              <button
                className="btn btn-sm"
                disabled={strokes.length === 0}
                onClick={() => onApply(strokes)}
                type="button"
              >
                <Check aria-hidden="true" size={15} />
                Use signature
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
