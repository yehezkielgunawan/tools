import { useCallback, useEffect, useRef, useState } from 'react';
import { createPdfOutput, type PdfOutput } from './pdfDownloads';

export function usePdfWorkspace() {
  const [outputs, setOutputs] = useState<PdfOutput[]>([]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const generation = useRef(0);
  const outputRef = useRef<PdfOutput[]>([]);

  const releaseOutputs = useCallback(() => {
    for (const output of outputRef.current) URL.revokeObjectURL(output.url);
    outputRef.current = [];
  }, []);

  useEffect(
    () => () => {
      generation.current += 1;
      releaseOutputs();
    },
    [releaseOutputs],
  );

  function invalidate() {
    generation.current += 1;
    busyRef.current = false;
    setBusy(false);
    releaseOutputs();
    setOutputs([]);
  }

  function begin() {
    invalidate();
    busyRef.current = true;
    setBusy(true);
    return generation.current;
  }

  function isCurrent(job: number) {
    return generation.current === job;
  }

  function finish(job: number) {
    if (isCurrent(job)) {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function publish(
    job: number,
    files: { bytes: Uint8Array; filename: string; pageCount: number }[],
  ) {
    if (!isCurrent(job)) return;
    const next: PdfOutput[] = [];
    try {
      for (const file of files)
        next.push(createPdfOutput(file.bytes, file.filename, file.pageCount));
    } catch (error) {
      for (const output of next) URL.revokeObjectURL(output.url);
      throw error;
    }
    releaseOutputs();
    outputRef.current = next;
    setOutputs(next);
  }

  return {
    outputs,
    busy,
    busyRef,
    begin,
    isCurrent,
    finish,
    invalidate,
    publish,
  };
}
