import { useEffect, useRef, useState } from 'react';
import type { PdfPreviewSource } from './pdfPreviewModel';

export function usePdfPreviewSelection() {
  const [source, setSource] = useState<PdfPreviewSource | null>(null);
  const [autoFocus, setAutoFocus] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const focusFrame = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    },
    [],
  );
  function open(next: PdfPreviewSource, trigger: HTMLElement | null = null) {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = null;
    opener.current = trigger;
    setAutoFocus(Boolean(trigger));
    setSource(next);
  }
  function close(restoreFocus = true) {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = null;
    const trigger = opener.current;
    setSource(null);
    opener.current = null;
    if (restoreFocus)
      focusFrame.current = requestAnimationFrame(() => {
        focusFrame.current = null;
        const fallback =
          document.querySelector<HTMLInputElement>('input[type="file"]');
        (trigger?.isConnected && !trigger.hasAttribute('disabled')
          ? trigger
          : fallback
        )?.focus();
      });
  }
  function clearOutput() {
    if (source?.kind === 'output') close(false);
  }
  return { source, autoFocus, open, close, clearOutput };
}
