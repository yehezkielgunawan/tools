import { ArrowRight, Download, Image as ImageIcon } from 'lucide-react';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import ToolLayout from '../../components/layout/ToolLayout';
import {
  calculateOutputDimensions,
  type ImageMimeType,
  MAX_CANVAS_EDGE,
  MAX_EDGE_OPTIONS,
  MAX_ORIGINAL_OUTPUT_PIXELS,
  type MaxEdgeOption,
} from '../image-compressor/imageUtils';
import type { ConversionResult, ConverterInputInfo } from './converterTypes';
import { convertImage } from './convertImage';
import { inspectConverterInput } from './inspectConverterInput';

const ACCEPTED_TYPES =
  '.heic,.heif,.jpg,.jpeg,.png,.svg,image/heic,image/heif,image/jpeg,image/png,image/svg+xml';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface Artifact extends ConversionResult {
  url: string;
  name: string;
  format: 'JPG' | 'PNG';
}

export default function ImageConverter() {
  const [selected, setSelected] = useState<{
    file: File;
    info: ConverterInputInfo;
  } | null>(null);
  const [format, setFormat] = useState<ImageMimeType>('image/jpeg');
  const [quality, setQuality] = useState(92);
  const [maxEdge, setMaxEdge] = useState<MaxEdgeOption>('original');
  const [busy, setBusy] = useState(false);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [status, setStatus] = useState<{
    error: boolean;
    message: string;
  } | null>(null);
  const generation = useRef(0);
  const activeJob = useRef<AbortController | null>(null);
  const resultUrl = useRef<string | null>(null);

  useEffect(
    () => () => {
      generation.current += 1;
      activeJob.current?.abort();
      if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
    },
    [],
  );

  function invalidate(): number {
    generation.current += 1;
    activeJob.current?.abort();
    activeJob.current = null;
    if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
    resultUrl.current = null;
    setArtifact(null);
    setBusy(false);
    setStatus(null);
    return generation.current;
  }

  async function selectFile(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    // Closing the picker without selecting a file should not discard work.
    if (!file) return;
    const job = invalidate();
    const controller = new AbortController();
    activeJob.current = controller;
    setSelected(null);
    setBusy(true);
    setStatus({ error: false, message: 'Checking your image locally…' });
    try {
      const info = await inspectConverterInput(file, controller.signal);
      if (job !== generation.current) return;
      setSelected({ file, info });
      setStatus({
        error: false,
        message: 'Image ready. Choose your output settings.',
      });
    } catch (error) {
      if (job === generation.current) {
        setStatus({
          error: true,
          message:
            error instanceof Error
              ? error.message
              : 'This image could not be opened.',
        });
      }
    } finally {
      if (job === generation.current) {
        activeJob.current = null;
        setBusy(false);
      }
    }
  }

  async function convert(): Promise<void> {
    if (!selected || busy) return;
    const job = invalidate();
    const controller = new AbortController();
    activeJob.current = controller;
    setBusy(true);
    setStatus({ error: false, message: 'Converting on your device…' });
    try {
      const result = await convertImage(
        selected.file,
        {
          outputMimeType: format,
          quality,
          maxEdge,
        },
        controller.signal,
      );
      if (job !== generation.current || controller.signal.aborted) return;
      const url = URL.createObjectURL(result.blob);
      resultUrl.current = url;
      const extension = format === 'image/jpeg' ? 'jpg' : 'png';
      setArtifact({
        ...result,
        url,
        name: `${selected.file.name.replace(/\.[^.]+$/, '') || 'image'}-converted.${extension}`,
        format: format === 'image/jpeg' ? 'JPG' : 'PNG',
      });
      setStatus({
        error: false,
        message: 'Conversion complete. Your image is ready to download.',
      });
    } catch (error) {
      if (job === generation.current) {
        setStatus({
          error: true,
          message:
            error instanceof Error
              ? error.message
              : 'Conversion failed. Try another image.',
        });
      }
    } finally {
      if (job === generation.current) {
        activeJob.current = null;
        setBusy(false);
      }
    }
  }

  const originalAllowed =
    !selected ||
    (selected.info.width <= MAX_CANVAS_EDGE &&
      selected.info.height <= MAX_CANVAS_EDGE &&
      selected.info.width * selected.info.height <= MAX_ORIGINAL_OUTPUT_PIXELS);
  const needsResize = maxEdge === 'original' && !originalAllowed;
  const dimensions =
    selected && !needsResize
      ? calculateOutputDimensions(
          selected.info.width,
          selected.info.height,
          maxEdge,
        )
      : null;

  return (
    <ToolLayout
      category="Image"
      title="Image Converter"
      description="Turn HEIC photos, JPGs, PNGs, and SVG artwork into a JPG or PNG. No uploads. No account. Just your image, in the format you need."
    >
      <div className="space-y-7">
        <section
          aria-labelledby="converter-source-heading"
          className="space-y-3"
        >
          <h2 className="text-sm font-semibold" id="converter-source-heading">
            01 <span className="mx-2 text-base-content/35">/</span> Choose your
            image
          </h2>
          <input
            accept={ACCEPTED_TYPES}
            aria-describedby="converter-file-help"
            aria-label="Choose an image file"
            className="file-input w-full"
            onChange={(event) => void selectFile(event)}
            type="file"
          />
          <p
            className="text-xs leading-5 text-base-content/75"
            id="converter-file-help"
          >
            One image at a time · up to 32 MB. JPEG/PNG/SVG: up to 24
            megapixels. HEIC/HEIF: up to 50 megapixels; large files may need a
            desktop browser. SVGs up to 2 MB. HEIC/HEIF containers use the
            primary photo, not every frame.
          </p>
          {selected ? (
            <div className="flex items-center gap-3 rounded-box border border-base-300 bg-base-200/40 p-4">
              <ImageIcon
                aria-hidden="true"
                className="shrink-0 text-base-content/60"
                size={24}
              />
              <div className="min-w-0">
                <p className="break-all text-sm font-medium">
                  {selected.file.name}
                </p>
                <p className="mt-1 text-xs tabular-nums text-base-content/75">
                  {selected.info.format.toUpperCase()} · {selected.info.width} ×{' '}
                  {selected.info.height} px · {formatBytes(selected.file.size)}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        <section
          aria-labelledby="converter-settings-heading"
          className="space-y-4"
        >
          <h2 className="text-sm font-semibold" id="converter-settings-heading">
            02 <span className="mx-2 text-base-content/35">/</span> Make it
            yours
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                className="block text-sm font-medium"
                htmlFor="converter-format"
              >
                Output format
              </label>
              <select
                className="select w-full"
                disabled={busy}
                id="converter-format"
                onChange={(event) => {
                  invalidate();
                  setFormat(event.currentTarget.value as ImageMimeType);
                }}
                value={format}
              >
                <option value="image/jpeg">JPG</option>
                <option value="image/png">PNG</option>
              </select>
              <p className="text-xs leading-5 text-base-content/75">
                {format === 'image/jpeg'
                  ? 'Best for photos. Transparent areas become white.'
                  : 'Keeps transparency. Files may be larger.'}
              </p>
            </div>
            <div className="space-y-2">
              <label
                className="block text-sm font-medium"
                htmlFor="converter-edge"
              >
                Maximum long edge
              </label>
              <select
                className="select w-full"
                disabled={busy}
                id="converter-edge"
                onChange={(event) => {
                  invalidate();
                  const value = event.currentTarget.value;
                  setMaxEdge(
                    value === 'original'
                      ? 'original'
                      : (Number(value) as MaxEdgeOption),
                  );
                }}
                value={maxEdge}
              >
                <option value="original">Original size (when safe)</option>
                {MAX_EDGE_OPTIONS.map((edge) => (
                  <option key={edge} value={edge}>
                    {edge.toLocaleString()} px
                  </option>
                ))}
              </select>
              <p className="text-xs leading-5 text-base-content/75">
                Keeps proportions. Never enlarges your image.
              </p>
            </div>
          </div>
          {needsResize ? (
            <p className="rounded-box border border-base-300 p-3 text-sm">
              Original size exceeds the safe canvas limit (12 megapixels or
              4,096 px per edge). Choose a smaller maximum long edge to
              continue.
            </p>
          ) : null}
          {needsResize && selected?.info.format === 'heic' ? (
            <div className="space-y-2 rounded-box border border-base-300 p-3 text-sm">
              <p>
                For a smaller JPG or PNG, open Image Compressor and select this
                photo again. It defaults to 2048 px and JPG quality 82.
              </p>
              <Link className="link" to="/image/image-compressor">
                Open Image Compressor
              </Link>
            </div>
          ) : null}
          {format === 'image/jpeg' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <label
                  className="text-sm font-medium"
                  htmlFor="converter-quality"
                >
                  JPG quality
                </label>
                <span className="text-sm tabular-nums text-base-content/75">
                  {quality}%
                </span>
              </div>
              <input
                className="range range-sm w-full"
                disabled={busy}
                id="converter-quality"
                max="100"
                min="1"
                onChange={(event) => {
                  invalidate();
                  setQuality(Number(event.currentTarget.value));
                }}
                step="1"
                type="range"
                value={quality}
              />
            </div>
          ) : null}
          {dimensions ? (
            <p className="flex items-center gap-2 text-sm tabular-nums text-base-content/75">
              <ArrowRight aria-hidden="true" size={15} />
              Output: {dimensions.width} × {dimensions.height} px
            </p>
          ) : null}
        </section>

        <div className="flex flex-wrap gap-2">
          <button
            className="btn"
            disabled={!selected || busy || needsResize}
            onClick={() => void convert()}
            type="button"
          >
            {busy ? 'Processing…' : 'Convert image'}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              invalidate();
              setSelected(null);
              setFormat('image/jpeg');
              setQuality(92);
              setMaxEdge('original');
            }}
            type="button"
          >
            Reset
          </button>
          {busy ? (
            <button
              className="btn btn-ghost"
              onClick={() => {
                invalidate();
                setStatus({ error: false, message: 'Processing cancelled.' });
              }}
              type="button"
            >
              Cancel
            </button>
          ) : null}
        </div>

        {status ? (
          <p
            aria-live={status.error ? 'assertive' : 'polite'}
            className={`text-sm ${status.error ? 'text-error' : 'text-base-content/75'}`}
            role={status.error ? 'alert' : 'status'}
          >
            {status.message}
          </p>
        ) : null}

        {artifact ? (
          <section
            aria-labelledby="converter-result-heading"
            className="space-y-4 border-t border-base-300 pt-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2
                  className="text-sm font-semibold"
                  id="converter-result-heading"
                >
                  03 <span className="mx-2 text-base-content/35">/</span> Ready
                  to save
                </h2>
                <p className="mt-2 text-sm tabular-nums text-base-content/75">
                  {artifact.format} · {artifact.width} × {artifact.height} px ·{' '}
                  {formatBytes(artifact.blob.size)}
                </p>
              </div>
              <a className="btn" download={artifact.name} href={artifact.url}>
                <Download aria-hidden="true" size={16} /> Download{' '}
                {artifact.format}
              </a>
            </div>
            <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-box border border-base-300 bg-base-200/40 p-4">
              <img
                alt="Conversion preview"
                className="max-h-96 max-w-full object-contain"
                height={artifact.height}
                src={artifact.url}
                width={artifact.width}
              />
            </div>
          </section>
        ) : null}
        <div className="space-y-2 border-t border-base-300 pt-4 text-xs leading-5 text-base-content/75">
          <p>
            Source metadata, including location, is not copied. Color rendering
            may change, especially for HDR or wide-gamut photos. Conversion does
            not guarantee a smaller file.
          </p>
          <p>
            SVG support is for self-contained shapes and text with local fonts.
            Scripts, stylesheets, embedded images, and external resources are
            not supported.
          </p>
          <p>
            HEIC decoding uses libheif-js (LGPL-3.0).{' '}
            <a
              className="underline"
              href="/licenses/libheif-js.txt"
              rel="noreferrer"
              target="_blank"
            >
              License and source information
            </a>
            .
          </p>
        </div>
      </div>
    </ToolLayout>
  );
}
