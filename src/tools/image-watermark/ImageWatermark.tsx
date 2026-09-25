import {
  AlertTriangle,
  Check,
  Download,
  Image as ImageIcon,
  LoaderCircle,
  Type,
} from 'lucide-react';
import {
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import ToolLayout from '../../components/layout/ToolLayout';
import {
  clampWatermarkPosition,
  pointerToWatermarkPosition,
  type WatermarkPosition,
} from './watermarkGeometry';
import {
  exportWatermarkedImage,
  HEIF_DECODE_WARNING,
  type PreparedWatermarkImage,
  prepareWatermarkImage,
  releaseWatermarkImage,
} from './watermarkImage';

interface SelectedPhoto {
  file: File;
  image: PreparedWatermarkImage;
}

interface DownloadArtifact {
  href: string;
  name: string;
  width: number;
  height: number;
  mimeType: string;
}

interface StatusMessage {
  kind: 'error' | 'info' | 'success' | 'warning';
  message: string;
}

interface PreviewSize {
  width: number;
  height: number;
}

const ACCEPTED_IMAGE_TYPES =
  'image/jpeg,image/png,image/heic,image/heif,.heic,.heif';
const INITIAL_POSITION: WatermarkPosition = { x: 0.5, y: 0.86 };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getDownloadName(fileName: string, mimeType: string): string {
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'image';
  return `${baseName}-watermarked.${mimeType === 'image/png' ? 'png' : 'jpg'}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The photo could not be prepared. Try another JPEG, PNG, HEIC, or HEIF photo.';
}

function getPreviewFontSize(
  photo: SelectedPhoto,
  previewSize: PreviewSize,
  text: string,
  fontScale: number,
): number {
  const imageWidth = photo.image.width;
  const imageHeight = photo.image.height;
  const shortEdge = Math.min(imageWidth, imageHeight);
  let fontSize = shortEdge * (fontScale / 100);
  const context = photo.image.canvas.getContext('2d');

  if (context && text.trim()) {
    context.font = `600 ${fontSize}px system-ui, sans-serif`;
    const textWidth = context.measureText(text).width;
    const maxTextWidth = imageWidth * 0.9;
    if (textWidth > maxTextWidth && textWidth > 0) {
      fontSize *= maxTextWidth / textWidth;
    }
  }

  const scale = Math.min(
    previewSize.width / imageWidth || 0,
    previewSize.height / imageHeight || 0,
  );
  return Math.max(8, fontSize * scale);
}

export default function ImageWatermark() {
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedPhoto | null>(
    null,
  );
  const [watermarkText, setWatermarkText] = useState('© Your name');
  const [fontScale, setFontScale] = useState(7);
  const [color, setColor] = useState('#ffffff');
  const [opacity, setOpacity] = useState(78);
  const [position, setPosition] = useState(INITIAL_POSITION);
  const [previewSize, setPreviewSize] = useState<PreviewSize>({
    width: 0,
    height: 0,
  });
  const [operation, setOperation] = useState<'prepare' | 'export' | null>(null);
  const [artifact, setArtifact] = useState<DownloadArtifact | null>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const watermarkRef = useRef<HTMLButtonElement>(null);
  const activePointerRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const generationRef = useRef(0);

  const clearArtifact = (): void => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
    setArtifact(null);
  };

  useEffect(() => {
    const preview = previewRef.current;
    const image = selectedPhoto?.image;
    if (!preview || !image) return;

    const canvas = image.canvas;
    canvas.className = 'block h-auto max-h-[62vh] max-w-full';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute(
      'aria-label',
      `Photo preview: ${selectedPhoto.file.name}`,
    );
    preview.insertBefore(canvas, watermarkRef.current);

    const updateSize = (): void => {
      const bounds = preview.getBoundingClientRect();
      setPreviewSize({ width: bounds.width, height: bounds.height });
    };

    updateSize();
    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(updateSize);
      observer.observe(preview);
      return () => {
        observer.disconnect();
        canvas.remove();
      };
    }

    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      canvas.remove();
    };
  }, [selectedPhoto]);

  useEffect(() => {
    const image = selectedPhoto?.image;
    if (!image) return;
    return () => releaseWatermarkImage(image);
  }, [selectedPhoto]);

  useEffect(
    () => () => {
      generationRef.current += 1;
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    },
    [],
  );

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    const generation = ++generationRef.current;

    setSelectedPhoto(null);
    setOperation(file ? 'prepare' : null);
    setPosition(INITIAL_POSITION);
    setPreviewSize({ width: 0, height: 0 });
    setStatus(null);
    clearArtifact();
    if (!file) return;

    setStatus({ kind: 'info', message: 'Opening the photo on this device…' });
    try {
      const image = await prepareWatermarkImage(file);
      if (generation !== generationRef.current) {
        releaseWatermarkImage(image);
        return;
      }

      setSelectedPhoto({ file, image });
      setStatus({
        kind: 'success',
        message: `Photo ready. The working image is ${image.width.toLocaleString()} × ${image.height.toLocaleString()} px.`,
      });
    } catch (error) {
      if (generation === generationRef.current) {
        const message = getErrorMessage(error);
        setStatus({
          kind: message === HEIF_DECODE_WARNING ? 'warning' : 'error',
          message,
        });
      }
    } finally {
      if (generation === generationRef.current) setOperation(null);
    }
  };

  const updateWatermarkText = (value: string): void => {
    setWatermarkText(value);
    clearArtifact();
  };

  const changePositionFromPointer = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void => {
    const preview = previewRef.current;
    const watermark = watermarkRef.current;
    const drag = activePointerRef.current;
    if (
      !preview ||
      !watermark ||
      !selectedPhoto ||
      !drag ||
      drag.pointerId !== event.pointerId
    ) {
      return;
    }

    const previewRect = preview.getBoundingClientRect();
    const pointerPosition = pointerToWatermarkPosition(
      {
        clientX: event.clientX + drag.offsetX,
        clientY: event.clientY + drag.offsetY,
      },
      previewRect,
    );
    const watermarkRect = watermark.getBoundingClientRect();
    setPosition(
      clampWatermarkPosition(
        pointerPosition,
        { width: previewRect.width, height: previewRect.height },
        { width: watermarkRect.width, height: watermarkRect.height },
      ),
    );
    clearArtifact();
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void => {
    const preview = previewRef.current;
    if (!preview) return;

    const bounds = preview.getBoundingClientRect();
    activePointerRef.current = {
      pointerId: event.pointerId,
      offsetX: position.x * bounds.width - (event.clientX - bounds.left),
      offsetY: position.y * bounds.height - (event.clientY - bounds.top),
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can be unavailable for synthetic or cancelled events.
    }
    event.preventDefault();
  };

  const handlePointerUp = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void => {
    if (activePointerRef.current?.pointerId === event.pointerId) {
      activePointerRef.current = null;
    }
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Pointer capture may already have been released by the browser.
    }
  };

  const handleWatermarkKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ): void => {
    const directions: Record<string, WatermarkPosition> = {
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
    };
    const direction = directions[event.key];
    const preview = previewRef.current;
    const watermark = watermarkRef.current;
    if (!direction || !preview || !watermark) return;

    event.preventDefault();
    const previewRect = preview.getBoundingClientRect();
    const watermarkRect = watermark.getBoundingClientRect();
    const step = event.shiftKey ? 0.05 : 0.01;
    setPosition(
      clampWatermarkPosition(
        {
          x: position.x + direction.x * step,
          y: position.y + direction.y * step,
        },
        { width: previewRect.width, height: previewRect.height },
        { width: watermarkRect.width, height: watermarkRect.height },
      ),
    );
    clearArtifact();
  };

  const handleExport = async (): Promise<void> => {
    if (!selectedPhoto || !watermarkText.trim() || operation === 'export')
      return;
    const generation = generationRef.current;
    setOperation('export');
    setStatus({
      kind: 'info',
      message: 'Rendering the watermarked photo locally…',
    });
    clearArtifact();

    try {
      const blob = await exportWatermarkedImage(
        selectedPhoto.image.canvas,
        {
          text: watermarkText.trim(),
          position,
          fontScale: fontScale / 100,
          color,
          opacity: opacity / 100,
        },
        selectedPhoto.image.mimeType,
      );
      if (generation !== generationRef.current) return;

      const href = URL.createObjectURL(blob);
      resultUrlRef.current = href;
      setArtifact({
        href,
        name: getDownloadName(selectedPhoto.file.name, blob.type),
        width: selectedPhoto.image.width,
        height: selectedPhoto.image.height,
        mimeType: blob.type,
      });
      setStatus({
        kind: 'success',
        message:
          'Watermark ready. Download the image to save it to your phone.',
      });
    } catch (error) {
      if (generation === generationRef.current) {
        setStatus({ kind: 'error', message: getErrorMessage(error) });
      }
    } finally {
      if (generation === generationRef.current) setOperation(null);
    }
  };

  const statusClass =
    status?.kind === 'error'
      ? 'alert alert-soft alert-error'
      : status?.kind === 'warning'
        ? 'alert alert-soft alert-warning'
        : status?.kind === 'success'
          ? 'alert alert-soft alert-success'
          : 'alert alert-soft alert-info';
  const previewFontSize = selectedPhoto
    ? getPreviewFontSize(selectedPhoto, previewSize, watermarkText, fontScale)
    : 16;

  return (
    <ToolLayout
      category="Image"
      description="Place a text watermark on a photo and download it from your browser. Your image stays on this device."
      title="Image Watermark"
    >
      <div className="space-y-6 sm:space-y-7">
        <section
          aria-labelledby="watermark-source-heading"
          className="space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold" id="watermark-source-heading">
              01 <span className="mx-2 text-base-content/35">/</span> Choose a
              photo
            </h2>
            <span className="badge badge-ghost gap-1.5">
              <ImageIcon aria-hidden="true" size={13} />
              JPEG · PNG · HEIC · HEIF
            </span>
          </div>
          <input
            accept={ACCEPTED_IMAGE_TYPES}
            aria-describedby="watermark-file-help"
            aria-label="Choose a photo file"
            className="file-input w-full"
            disabled={operation === 'prepare'}
            id="watermark-file"
            onChange={(event) => void handleFileChange(event)}
            type="file"
          />
          <p
            className="text-xs leading-5 text-base-content/55"
            id="watermark-file-help"
          >
            One photo at a time, up to 32 MB. Large images are resized to a
            mobile-safe 2048 px long edge. HEIC/HEIF needs browser support.
          </p>
          {selectedPhoto ? (
            <div className="flex items-center gap-3 rounded-box border border-base-300 bg-base-200/40 p-3">
              <div className="rounded-box bg-base-100 p-3 text-primary">
                <ImageIcon aria-hidden="true" size={21} />
              </div>
              <div className="min-w-0">
                <p className="break-all text-sm font-medium">
                  {selectedPhoto.file.name}
                </p>
                <p className="mt-1 text-sm text-base-content/60">
                  {selectedPhoto.image.width.toLocaleString()} ×{' '}
                  {selectedPhoto.image.height.toLocaleString()} px
                  <span className="mx-2">·</span>
                  {formatBytes(selectedPhoto.file.size)}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        <section
          aria-labelledby="watermark-preview-heading"
          className="space-y-3"
        >
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2
                className="text-sm font-semibold"
                id="watermark-preview-heading"
              >
                02 <span className="mx-2 text-base-content/35">/</span> Preview
              </h2>
              <p className="mt-1 text-xs text-base-content/55">
                Drag the outlined text to place it. Use arrow keys for fine
                adjustments.
              </p>
            </div>
            {selectedPhoto ? (
              <span className="badge badge-ghost">Live preview</span>
            ) : null}
          </div>

          {selectedPhoto ? (
            <section
              aria-label="Watermark preview"
              className="relative mx-auto w-fit max-w-full overflow-hidden rounded-box border border-base-content/15 bg-neutral shadow-inner"
              ref={previewRef}
            >
              {watermarkText.trim() ? (
                <button
                  aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
                  aria-label={`Move watermark: ${watermarkText.trim()}. Drag to move or use arrow keys.`}
                  className="absolute z-10 max-w-[90%] -translate-x-1/2 -translate-y-1/2 touch-none cursor-move whitespace-nowrap rounded-md border border-dashed border-white/75 bg-black/35 px-2 py-1 text-center font-semibold leading-tight text-shadow-sm shadow-lg backdrop-blur-[2px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  onKeyDown={handleWatermarkKeyDown}
                  onPointerCancel={handlePointerUp}
                  onPointerDown={handlePointerDown}
                  onPointerMove={changePositionFromPointer}
                  onPointerUp={handlePointerUp}
                  ref={watermarkRef}
                  style={
                    {
                      color,
                      fontSize: `${previewFontSize}px`,
                      left: `${position.x * 100}%`,
                      opacity: opacity / 100,
                      top: `${position.y * 100}%`,
                      textShadow: '0 1px 4px rgb(0 0 0 / 85%)',
                    } as CSSProperties
                  }
                  type="button"
                >
                  {watermarkText.trim()}
                </button>
              ) : null}
            </section>
          ) : (
            <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-box border border-dashed border-base-300 bg-base-200/35 px-5 py-8 text-center sm:min-h-64">
              <span className="rounded-box bg-base-100 p-3 text-base-content/55">
                <ImageIcon aria-hidden="true" size={25} />
              </span>
              <p className="max-w-xs text-sm leading-6 text-base-content/60">
                Choose a photo to see and position your watermark here.
              </p>
            </div>
          )}
        </section>

        <section
          aria-labelledby="watermark-controls-heading"
          className="space-y-4"
        >
          <h2 className="text-sm font-semibold" id="watermark-controls-heading">
            03 <span className="mx-2 text-base-content/35">/</span> Watermark
            style
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="label py-0" htmlFor="watermark-text">
                <span className="label-text font-medium">Watermark text</span>
              </label>
              <div className="relative">
                <Type
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base-content/45"
                  size={16}
                />
                <input
                  autoComplete="off"
                  className="input w-full pl-10"
                  disabled={operation === 'export'}
                  id="watermark-text"
                  maxLength={60}
                  onChange={(event) =>
                    updateWatermarkText(event.currentTarget.value)
                  }
                  placeholder="Type your watermark"
                  type="text"
                  value={watermarkText}
                />
              </div>
              <p className="text-xs text-base-content/55">
                Keep it short for a clear, readable mark.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium" htmlFor="watermark-size">
                  Text size
                </label>
                <output
                  className="text-sm tabular-nums text-base-content/65"
                  htmlFor="watermark-size"
                >
                  {fontScale}%
                </output>
              </div>
              <input
                className="range range-primary range-sm w-full"
                disabled={operation === 'export'}
                id="watermark-size"
                max="18"
                min="2"
                onChange={(event) => {
                  setFontScale(Number(event.currentTarget.value));
                  clearArtifact();
                }}
                step="1"
                type="range"
                value={fontScale}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label
                  className="text-sm font-medium"
                  htmlFor="watermark-opacity"
                >
                  Opacity
                </label>
                <output
                  className="text-sm tabular-nums text-base-content/65"
                  htmlFor="watermark-opacity"
                >
                  {opacity}%
                </output>
              </div>
              <input
                className="range range-primary range-sm w-full"
                disabled={operation === 'export'}
                id="watermark-opacity"
                max="100"
                min="10"
                onChange={(event) => {
                  setOpacity(Number(event.currentTarget.value));
                  clearArtifact();
                }}
                step="1"
                type="range"
                value={opacity}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="label py-0" htmlFor="watermark-color">
                <span className="label-text font-medium">Text color</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  aria-label="Text color"
                  className="input h-12 w-16 cursor-pointer p-1"
                  disabled={operation === 'export'}
                  id="watermark-color"
                  onChange={(event) => {
                    setColor(event.currentTarget.value);
                    clearArtifact();
                  }}
                  type="color"
                  value={color}
                />
                <span className="text-sm text-base-content/60">
                  A soft shadow keeps the text readable on light or dark photos.
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-2 border-t border-base-300 pt-5 sm:flex-row sm:items-center">
          <button
            className="btn btn-primary min-h-12 flex-1"
            disabled={
              !selectedPhoto || !watermarkText.trim() || operation !== null
            }
            onClick={() => void handleExport()}
            type="button"
          >
            {operation === 'export' ? (
              <LoaderCircle
                aria-hidden="true"
                className="animate-spin"
                size={17}
              />
            ) : (
              <Type aria-hidden="true" size={17} />
            )}
            {operation === 'export'
              ? 'Rendering locally…'
              : 'Create watermarked image'}
          </button>
        </div>

        {operation ? (
          <progress
            aria-label={
              operation === 'prepare'
                ? 'Preparing photo locally'
                : 'Creating watermarked image locally'
            }
            className="progress progress-primary w-full"
          />
        ) : null}

        {status ? (
          <div
            aria-atomic="true"
            aria-live={
              status.kind === 'error' || status.kind === 'warning'
                ? 'assertive'
                : 'polite'
            }
            className={statusClass}
            role={
              status.kind === 'error' || status.kind === 'warning'
                ? 'alert'
                : 'status'
            }
          >
            {status.kind === 'success' ? (
              <Check aria-hidden="true" size={17} />
            ) : status.kind === 'warning' || status.kind === 'error' ? (
              <AlertTriangle aria-hidden="true" size={17} />
            ) : null}
            <span>{status.message}</span>
          </div>
        ) : null}

        {artifact ? (
          <section
            aria-labelledby="watermark-result-heading"
            className="space-y-4 rounded-box border border-success/30 bg-success/5 p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2
                  className="text-sm font-semibold"
                  id="watermark-result-heading"
                >
                  Image ready
                </h2>
                <p className="mt-1 text-xs text-base-content/60">
                  {artifact.width.toLocaleString()} ×{' '}
                  {artifact.height.toLocaleString()} px
                  <span className="mx-2">·</span>
                  {artifact.mimeType === 'image/png' ? 'PNG' : 'JPEG'}
                </p>
              </div>
              <a
                className="btn btn-primary min-h-11 w-full sm:w-auto"
                download={artifact.name}
                href={artifact.href}
              >
                <Download aria-hidden="true" size={16} />
                Download image
              </a>
            </div>
            <p className="break-all text-xs text-base-content/55">
              {artifact.name}
            </p>
          </section>
        ) : null}
      </div>
    </ToolLayout>
  );
}
