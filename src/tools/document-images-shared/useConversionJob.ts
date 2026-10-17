import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConversionOutput } from './conversionTypes';

export interface DownloadOutput extends ConversionOutput {
  url: string;
  thumbnailUrl?: string;
}

export interface ConversionContext {
  signal: AbortSignal;
  progress: (done: number, total: number) => void;
}

export function useConversionJob() {
  const [outputs, setOutputs] = useState<DownloadOutput[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const active = useRef<AbortController | null>(null);
  const urls = useRef<string[]>([]);
  const release = useCallback(() => {
    for (const url of urls.current) URL.revokeObjectURL(url);
    urls.current = [];
  }, []);

  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
      release();
    },
    [release],
  );

  function invalidate() {
    active.current?.abort();
    active.current = null;
    release();
    setOutputs([]);
    setBusy(false);
    setError('');
    setProgress({ done: 0, total: 0 });
  }

  async function run(
    task: (
      context: ConversionContext,
    ) => Promise<ConversionOutput[]> | Promise<void>,
  ) {
    if (active.current) return;
    invalidate();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    const isCurrent = () =>
      active.current === controller && !controller.signal.aborted;
    try {
      const result = await task({
        signal: controller.signal,
        progress: (done, total) => {
          if (isCurrent()) setProgress({ done, total });
        },
      });
      if (result && isCurrent()) {
        const next = result.map((output) => {
          const url = URL.createObjectURL(output.blob);
          urls.current.push(url);
          const thumbnailUrl = output.thumbnail
            ? URL.createObjectURL(output.thumbnail)
            : undefined;
          if (thumbnailUrl) urls.current.push(thumbnailUrl);
          return { ...output, url, thumbnailUrl };
        });
        setOutputs(next);
      }
    } catch (cause) {
      if (isCurrent()) {
        release();
        setError(
          cause instanceof Error
            ? cause.message
            : 'Conversion failed. Try another file.',
        );
      }
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
      }
    }
  }

  return {
    outputs,
    busy,
    error,
    progress,
    run,
    invalidate,
    cancel: () => active.current?.abort(),
  };
}
