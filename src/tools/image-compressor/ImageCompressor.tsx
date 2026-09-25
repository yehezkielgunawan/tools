import {
  Check,
  Cpu,
  Download,
  Image as ImageIcon,
  LoaderCircle,
  Upload,
} from 'lucide-react';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import ToolLayout from '../../components/layout/ToolLayout';
import {
  compareImageSizes,
  type ImageInfo,
  type ImageMimeType,
  inspectImageFile,
  MAX_CANVAS_EDGE,
  MAX_EDGE_OPTIONS,
  MAX_ORIGINAL_OUTPUT_PIXELS,
  type MaxEdgeOption,
} from './imageUtils';
import {
  type CompressionEngine,
  compressImage,
  type ImageCompressionResult,
  type ImageOutputFormat,
} from './processImage';

interface SelectedImage {
  file: File;
  info: ImageInfo;
}

interface CompressionArtifact extends ImageCompressionResult {
  downloadName: string;
  previewUrl: string;
}

interface StatusMessage {
  kind: 'error' | 'info' | 'success';
  message: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getDownloadName(fileName: string, mimeType: ImageMimeType): string {
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'image';
  const extension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  return `${baseName}-compressed.${extension}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The image could not be compressed. Try another photo.';
}

function isOriginalWithinLimits(info: ImageInfo | null): boolean {
  return (
    info === null ||
    (info.width <= MAX_CANVAS_EDGE &&
      info.height <= MAX_CANVAS_EDGE &&
      info.width * info.height <= MAX_ORIGINAL_OUTPUT_PIXELS)
  );
}

function effectiveOutputFormat(
  format: ImageOutputFormat,
  selected: SelectedImage | null,
): ImageMimeType | null {
  return format === 'same' ? (selected?.info.mimeType ?? null) : format;
}

export default function ImageCompressor() {
  const [selected, setSelected] = useState<SelectedImage | null>(null);
  const [engine, setEngine] = useState<CompressionEngine>('canvas');
  const [format, setFormat] = useState<ImageOutputFormat>('same');
  const [quality, setQuality] = useState(82);
  const [maxEdge, setMaxEdge] = useState<MaxEdgeOption>(2048);
  const [pngLossy, setPngLossy] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [artifact, setArtifact] = useState<CompressionArtifact | null>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const activeJobRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);

  useEffect(
    () => () => {
      activeJobRef.current?.abort();
      generationRef.current += 1;
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    },
    [],
  );

  const clearArtifact = (): void => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
    setArtifact(null);
  };

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';

    generationRef.current += 1;
    activeJobRef.current?.abort();
    activeJobRef.current = null;
    setIsProcessing(false);
    setSelected(null);
    setStatus(null);
    clearArtifact();

    if (!file) return;

    const selectionGeneration = generationRef.current;
    try {
      const info = await inspectImageFile(file);
      if (selectionGeneration !== generationRef.current) return;

      setSelected({ file, info });
      setStatus({
        kind: 'success',
        message: 'Image ready. It will stay on this device while you work.',
      });
    } catch (error) {
      if (selectionGeneration === generationRef.current) {
        setStatus({ kind: 'error', message: getErrorMessage(error) });
      }
    }
  };

  const handleCompress = async (): Promise<void> => {
    if (!selected || isProcessing) return;

    const generation = ++generationRef.current;
    const controller = new AbortController();
    activeJobRef.current = controller;
    setIsProcessing(true);
    setStatus({
      kind: 'info',
      message: `Compressing locally with ${engine === 'wasm' ? 'pixo-wasm' : 'HTML Canvas'}…`,
    });
    clearArtifact();

    try {
      const result = await compressImage(
        selected.file,
        { engine, format, quality, maxEdge, pngLossy },
        controller.signal,
      );
      if (controller.signal.aborted || generation !== generationRef.current) {
        return;
      }

      const previewUrl = URL.createObjectURL(result.blob);
      resultUrlRef.current = previewUrl;
      setArtifact({
        ...result,
        previewUrl,
        downloadName: getDownloadName(selected.file.name, result.mimeType),
      });
      setStatus({
        kind: 'success',
        message: `Done. The image was processed locally with ${engine === 'wasm' ? 'pixo-wasm' : 'HTML Canvas'}.`,
      });
    } catch (error) {
      if (generation === generationRef.current) {
        if (error instanceof Error && error.name === 'AbortError') {
          setStatus({ kind: 'info', message: 'Compression cancelled.' });
        } else {
          setStatus({ kind: 'error', message: getErrorMessage(error) });
        }
      }
    } finally {
      if (generation === generationRef.current) {
        activeJobRef.current = null;
        setIsProcessing(false);
      }
    }
  };

  const handleCancel = (): void => {
    activeJobRef.current?.abort();
    setStatus({ kind: 'info', message: 'Cancellation requested…' });
  };

  const activeFormat = effectiveOutputFormat(format, selected);
  const showPngLossy = engine === 'wasm' && activeFormat === 'image/png';
  const showJpegQuality = activeFormat !== 'image/png';
  const originalAllowed = isOriginalWithinLimits(selected?.info ?? null);
  const sizeComparison =
    selected && artifact
      ? compareImageSizes(selected.file.size, artifact.blob.size)
      : null;

  return (
    <ToolLayout
      category="Image"
      description="Resize and compress a JPEG or PNG with your choice of browser Canvas or pixo-wasm. Your image stays on this device."
      title="Image Compressor"
    >
      <div className="space-y-6">
        <section aria-labelledby="image-source-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold" id="image-source-heading">
              01 <span className="mx-2 text-base-content/35">/</span> Choose an
              image
            </h2>
            <span className="badge badge-ghost gap-1.5">
              <ImageIcon aria-hidden="true" size={13} />
              JPEG or PNG · up to 32 MB
            </span>
          </div>
          <input
            accept="image/jpeg,image/png"
            aria-describedby="image-file-help"
            aria-label="Choose a JPEG or PNG image"
            className="file-input w-full"
            disabled={isProcessing}
            id="image-file"
            onChange={(event) => void handleFileChange(event)}
            type="file"
          />
          <p
            className="text-xs leading-5 text-base-content/55"
            id="image-file-help"
          >
            One image at a time. Photos above 24 megapixels may need to be
            resized on your device first.
          </p>
          {selected ? (
            <div className="flex items-center gap-3 rounded-box border border-base-300 bg-base-200/40 p-3">
              <div className="rounded-box bg-base-100 p-3 text-primary">
                <ImageIcon aria-hidden="true" size={21} />
              </div>
              <div className="min-w-0">
                <p className="break-all text-sm font-medium">
                  {selected.file.name}
                </p>
                <p className="mt-1 text-sm text-base-content/60">
                  {selected.info.width} × {selected.info.height} px
                  <span className="mx-2">·</span>
                  {formatBytes(selected.file.size)}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">
            02 <span className="mx-2 text-base-content/35">/</span> Compression
            engine
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-box border border-base-300 p-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                checked={engine === 'canvas'}
                className="radio radio-primary"
                disabled={isProcessing}
                name="image-compression-engine"
                onChange={() => setEngine('canvas')}
                type="radio"
                value="canvas"
              />
              <span>
                <span className="block text-sm font-medium">HTML Canvas</span>
                <span className="block text-xs text-base-content/55">
                  Built into your browser
                </span>
              </span>
            </label>
            <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-box border border-base-300 p-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                checked={engine === 'wasm'}
                className="radio radio-primary"
                disabled={isProcessing}
                name="image-compression-engine"
                onChange={() => setEngine('wasm')}
                type="radio"
                value="wasm"
              />
              <span>
                <span className="block text-sm font-medium">pixo-wasm</span>
                <span className="block text-xs text-base-content/55">
                  Rust encoder in a worker
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        <section aria-labelledby="image-options-heading" className="space-y-4">
          <h2 className="text-sm font-semibold" id="image-options-heading">
            03 <span className="mx-2 text-base-content/35">/</span> Output
            settings
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="label py-0" htmlFor="image-output-format">
                <span className="label-text font-medium">Output format</span>
              </label>
              <select
                className="select w-full"
                disabled={isProcessing}
                id="image-output-format"
                onChange={(event) =>
                  setFormat(event.currentTarget.value as ImageOutputFormat)
                }
                value={format}
              >
                <option value="same">Keep original</option>
                <option value="image/jpeg">JPEG</option>
                <option value="image/png">PNG</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="label py-0" htmlFor="image-max-edge">
                <span className="label-text font-medium">
                  Maximum long edge
                </span>
              </label>
              <select
                className="select w-full"
                disabled={isProcessing}
                id="image-max-edge"
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setMaxEdge(
                    value === 'original'
                      ? 'original'
                      : (Number(value) as MaxEdgeOption),
                  );
                }}
                value={maxEdge}
              >
                {MAX_EDGE_OPTIONS.map((edge) => (
                  <option key={edge} value={edge}>
                    {edge.toLocaleString()} px
                  </option>
                ))}
                <option disabled={!originalAllowed} value="original">
                  Original size (when safe)
                </option>
              </select>
              {!originalAllowed ? (
                <p className="text-xs leading-5 text-base-content/55">
                  Original dimensions exceed the mobile-safe canvas limit.
                </p>
              ) : null}
            </div>
          </div>

          {showJpegQuality ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium" htmlFor="image-quality">
                  JPEG quality
                </label>
                <output
                  className="text-sm tabular-nums text-base-content/65"
                  htmlFor="image-quality"
                >
                  {quality} / 100
                </output>
              </div>
              <input
                className="range range-primary range-sm w-full"
                disabled={isProcessing}
                id="image-quality"
                max="100"
                min="1"
                onChange={(event) =>
                  setQuality(Number(event.currentTarget.value))
                }
                step="1"
                type="range"
                value={quality}
              />
              <p className="text-xs leading-5 text-base-content/55">
                Higher quality keeps more detail and usually creates a larger
                file.
              </p>
            </div>
          ) : null}

          {showPngLossy ? (
            <label className="flex items-start gap-3 rounded-box border border-base-300 p-3">
              <input
                checked={pngLossy}
                className="checkbox checkbox-primary mt-0.5"
                disabled={isProcessing}
                id="lossy-png"
                onChange={(event) => setPngLossy(event.currentTarget.checked)}
                type="checkbox"
              />
              <span>
                <span className="block text-sm font-medium">
                  Allow lossy PNG
                </span>
                <span className="block text-xs leading-5 text-base-content/55">
                  Reduce the palette to up to 256 colors for a smaller file.
                </span>
              </span>
            </label>
          ) : null}
        </section>

        <div className="flex flex-col gap-2 border-t border-base-300 pt-5 sm:flex-row sm:items-center">
          <button
            className="btn btn-primary min-h-12 flex-1"
            disabled={!selected || isProcessing}
            onClick={() => void handleCompress()}
            type="button"
          >
            {isProcessing ? (
              <LoaderCircle
                aria-hidden="true"
                className="animate-spin"
                size={17}
              />
            ) : (
              <Upload aria-hidden="true" size={17} />
            )}
            {isProcessing ? 'Compressing locally…' : 'Compress image'}
          </button>
          {isProcessing ? (
            <button
              className="btn min-h-12"
              onClick={handleCancel}
              type="button"
            >
              Cancel
            </button>
          ) : null}
        </div>

        {isProcessing ? (
          <progress
            aria-label="Compressing image locally"
            className="progress progress-primary w-full"
          />
        ) : null}

        {status ? (
          <div
            aria-atomic="true"
            aria-live={status.kind === 'error' ? 'assertive' : 'polite'}
            className={`alert alert-soft ${status.kind === 'error' ? 'alert-error' : status.kind === 'success' ? 'alert-success' : 'alert-info'}`}
            role={status.kind === 'error' ? 'alert' : 'status'}
          >
            {status.kind === 'success' ? (
              <Check aria-hidden="true" size={17} />
            ) : status.kind === 'info' ? (
              <Cpu aria-hidden="true" size={17} />
            ) : null}
            <span>{status.message}</span>
          </div>
        ) : null}

        {selected && artifact ? (
          <section aria-labelledby="image-result-heading" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold" id="image-result-heading">
                  Compression result
                </h2>
                <p className="mt-1 text-xs text-base-content/55">
                  {artifact.width} × {artifact.height} px
                  <span className="mx-2">·</span>
                  {artifact.mimeType === 'image/jpeg' ? 'JPEG' : 'PNG'}
                </p>
              </div>
              <a
                className="btn btn-primary min-h-11"
                download={artifact.downloadName}
                href={artifact.previewUrl}
              >
                <Download aria-hidden="true" size={16} />
                Download image
              </a>
            </div>

            <div className="stats stats-vertical w-full border border-base-300 bg-base-200/40 sm:stats-horizontal">
              <div className="stat px-4 py-3">
                <div className="stat-title">Original</div>
                <div className="stat-value text-2xl">
                  {formatBytes(selected.file.size)}
                </div>
                <div className="stat-desc">
                  {selected.info.width} × {selected.info.height} px
                </div>
              </div>
              <div className="stat px-4 py-3">
                <div className="stat-title">Compressed</div>
                <div className="stat-value text-2xl">
                  {formatBytes(artifact.blob.size)}
                </div>
                <div className="stat-desc">
                  {sizeComparison?.isLarger
                    ? `${sizeComparison.percentage.toFixed(1)}% larger`
                    : sizeComparison && sizeComparison.percentage > 0
                      ? `${sizeComparison.percentage.toFixed(1)}% smaller`
                      : 'Same file size'}
                </div>
              </div>
            </div>

            {sizeComparison?.isLarger ? (
              <div className="alert alert-warning alert-soft" role="status">
                The compressed result is larger than the original. Try a lower
                JPEG quality or a smaller maximum edge.
              </div>
            ) : null}

            <div className="flex min-h-40 items-center justify-center rounded-box border border-base-300 bg-base-200/30 p-3">
              <img
                alt={`Compressed preview of ${artifact.downloadName}`}
                className="max-h-80 max-w-full object-contain"
                src={artifact.previewUrl}
              />
            </div>
          </section>
        ) : null}
      </div>
    </ToolLayout>
  );
}
