import { Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { checkCancelled } from './conversionLimits';
import { createImagesZip } from './imageDownloads';
import type { DownloadOutput } from './useConversionJob';

export default function ConversionResults({
  outputs,
  zipName,
}: {
  outputs: DownloadOutput[];
  zipName: string;
}) {
  const [zipUrl, setZipUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const url = useRef('');
  useEffect(
    () => () => {
      controller.current?.abort();
      if (url.current) URL.revokeObjectURL(url.current);
    },
    [],
  );

  async function prepareZip() {
    if (busy) return;
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    setError('');
    try {
      const blob = await createImagesZip(outputs, current.signal);
      checkCancelled(current.signal);
      url.current = URL.createObjectURL(blob);
      setZipUrl(url.current);
    } catch (cause) {
      if (!current.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Could not create ZIP. Download images individually.',
        );
    } finally {
      if (!current.signal.aborted) setBusy(false);
    }
  }

  return (
    <section
      aria-label="Conversion results"
      className="space-y-4 border-t border-base-300 pt-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Ready to download</h2>
          <p className="text-sm text-base-content/65">
            {outputs.length} {outputs.length === 1 ? 'file' : 'files'} ·{' '}
            {(
              outputs.reduce((sum, output) => sum + output.blob.size, 0) /
              1024 /
              1024
            ).toFixed(2)}{' '}
            MiB
          </p>
        </div>
        {outputs.some((o) => o.thumbnail) ? (
          zipUrl ? (
            <a href={zipUrl} download={zipName} className="btn btn-sm">
              <Download size={15} aria-hidden="true" />
              Download ZIP
            </a>
          ) : (
            <button
              className="btn btn-sm"
              type="button"
              disabled={busy}
              onClick={() => void prepareZip()}
            >
              {busy ? 'Preparing ZIP…' : 'Prepare ZIP'}
            </button>
          )
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {outputs.map((output) => (
          <div
            key={output.filename}
            className="min-w-0 rounded-box border border-base-300 p-3"
          >
            {output.thumbnailUrl ? (
              <a
                href={output.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${output.filename}`}
              >
                <img
                  src={output.thumbnailUrl}
                  alt={`Preview of ${output.filename}`}
                  className="mb-3 h-32 w-full rounded bg-base-200 object-contain"
                  loading="lazy"
                />
              </a>
            ) : null}
            <a
              className="link link-hover flex items-center gap-2 break-all text-sm"
              href={output.url}
              download={output.filename}
            >
              <Download size={15} className="shrink-0" aria-hidden="true" />
              Download {output.filename}
            </a>
            {output.blob.type === 'application/pdf' ? (
              <a
                className="link mt-2 inline-block text-xs"
                href={output.url}
                target="_blank"
                rel="noreferrer"
              >
                Open PDF preview
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
