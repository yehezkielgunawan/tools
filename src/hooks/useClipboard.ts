import { useEffect, useRef, useState } from 'react';

export interface ClipboardState {
  copied: boolean;
  error: string | null;
  copy: (text: string) => Promise<boolean>;
}

export function useClipboard(): ClipboardState {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== undefined) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  const copy = async (text: string): Promise<boolean> => {
    if (!text.trim()) {
      setError('Nothing to copy.');
      return false;
    }

    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard access is unavailable.');
      }

      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError(null);

      if (resetTimer.current !== undefined) {
        window.clearTimeout(resetTimer.current);
      }
      resetTimer.current = window.setTimeout(() => setCopied(false), 1800);
      return true;
    } catch {
      setCopied(false);
      setError('Unable to copy. Check your browser permissions and try again.');
      return false;
    }
  };

  return { copied, error, copy };
}
