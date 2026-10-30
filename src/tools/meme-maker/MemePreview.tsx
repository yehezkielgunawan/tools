import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  type CaptionPosition,
  clampCaptionPosition,
  pointerToCaptionPosition,
} from './memeGeometry';
import { getCaptionLayout, renderMeme } from './memeRenderer';
import type { MemeCaption, PreparedMemeImage } from './memeTypes';

interface MemePreviewProps {
  image: PreparedMemeImage;
  templateName: string;
  captions: readonly MemeCaption[];
  activeIndex: number;
  onActivate: (index: number) => void;
  onMove: (index: number, position: CaptionPosition) => void;
}

export default function MemePreview({
  image,
  templateName,
  captions,
  activeIndex,
  onActivate,
  onMove,
}: MemePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    index: number;
    x: number;
    y: number;
  } | null>(null);
  const layouts = useMemo(() => {
    const context = image.canvas.getContext('2d');
    return context
      ? captions.map((caption) =>
          getCaptionLayout(context, caption, image.width, image.height),
        )
      : [];
  }, [image, captions]);

  useEffect(() => {
    if (canvasRef.current)
      renderMeme(image.canvas, canvasRef.current, captions);
  }, [image, captions]);

  const move = (index: number, position: CaptionPosition): void => {
    const layout = layouts[index];
    onMove(
      index,
      clampCaptionPosition(position, {
        width: layout.width / image.width,
        height: layout.height / image.height,
      }),
    );
  };

  const startDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    index: number,
  ): void => {
    if (event.button !== 0 || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const point = pointerToCaptionPosition(event, rect);
    drag.current = {
      id: event.pointerId,
      index,
      x: layouts[index].x / image.width - point.x,
      y: layouts[index].y / image.height - point.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onActivate(index);
  };

  return (
    <div className="rounded-box border border-base-300 bg-base-200/60 p-3 sm:p-5">
      <div
        ref={previewRef}
        className="relative mx-auto w-full"
        style={{ maxWidth: `${(image.width / image.height) * 58}vh` }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${templateName} meme preview`}
          className="block h-auto w-full"
        />
        {layouts.map((layout, index) => (
          <button
            key={captions[index].id}
            type="button"
            aria-label={`Move caption ${index + 1}. Drag or use arrow keys; hold Shift for larger steps.`}
            aria-pressed={activeIndex === index}
            className={`absolute min-h-6 touch-none cursor-move rounded border-2 border-dashed outline-offset-2 focus-visible:outline-2 focus-visible:outline-white ${activeIndex === index ? 'border-white/90 bg-black/5 shadow-[0_0_0_1px_#0008]' : 'border-transparent hover:border-white/60'}`}
            style={{
              left: `${(layout.x / image.width) * 100}%`,
              top: `${(layout.y / image.height) * 100}%`,
              width: `${(layout.width / image.width) * 100}%`,
              height: `${(layout.height / image.height) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
            onFocus={() => onActivate(index)}
            onPointerDown={(event) => startDrag(event, index)}
            onPointerMove={(event) => {
              const current = drag.current;
              if (
                !current ||
                current.id !== event.pointerId ||
                current.index !== index ||
                !previewRef.current
              )
                return;
              const point = pointerToCaptionPosition(
                event,
                previewRef.current.getBoundingClientRect(),
              );
              move(index, { x: point.x + current.x, y: point.y + current.y });
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            onLostPointerCapture={() => {
              drag.current = null;
            }}
            onKeyDown={(event) => {
              const offsets: Record<string, [number, number]> = {
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0],
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
              };
              const offset = offsets[event.key];
              if (!offset) return;
              event.preventDefault();
              const step = event.shiftKey ? 0.05 : 0.01;
              move(index, {
                x: layout.x / image.width + offset[0] * step,
                y: layout.y / image.height + offset[1] * step,
              });
            }}
          >
            {activeIndex === index || !captions[index].text ? (
              <span
                aria-hidden="true"
                className="absolute -top-3 left-2 rounded bg-neutral px-1.5 py-0.5 text-[10px] font-bold text-neutral-content"
              >
                {index + 1}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <p className="mt-4 text-center text-xs leading-5 text-base-content/60">
        Drag a caption to place it. Arrow keys nudge it. Selection guides won’t
        appear in your PNG.
      </p>
    </div>
  );
}
