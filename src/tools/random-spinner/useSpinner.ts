import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSpinRotation,
  parseSpinnerEntries,
  removeSpinnerEntry,
  SPIN_DURATION_MS,
  type SpinnerEntry,
  selectWinnerIndex,
} from './spinnerModel';
import {
  clearSpinnerEntries,
  loadSpinnerEntries,
  saveSpinnerEntries,
} from './spinnerStorage';

interface SpinResult extends SpinnerEntry {
  id: number;
}

interface PendingSpin {
  result: SpinResult;
  endsAt: number;
}

export function useSpinner() {
  const [text, setText] = useState(loadSpinnerEntries);
  const [rotation, setRotation] = useState(0);
  const [pending, setPending] = useState<PendingSpin | null>(null);
  const [winner, setWinner] = useState<SpinResult | null>(null);
  const [history, setHistory] = useState<SpinResult[]>([]);
  const [error, setError] = useState('');
  const pendingRef = useRef<PendingSpin | null>(null);
  const nextId = useRef(0);
  const parsed = parseSpinnerEntries(text);

  const finish = useCallback(() => {
    const job = pendingRef.current;
    if (!job || Date.now() < job.endsAt) return;
    // Clear the synchronous guard before callbacks can report completion again.
    pendingRef.current = null;
    setPending(null);
    setWinner(job.result);
    setHistory((previous) => [job.result, ...previous].slice(0, 20));
  }, []);

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(finish, Math.max(0, pending.endsAt - Date.now()));
    const handleVisibility = () => {
      if (!document.hidden) finish();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [pending, finish]);

  useEffect(
    () => () => {
      pendingRef.current = null;
    },
    [],
  );

  function updateEntries(next: string) {
    if (pendingRef.current) return;
    setText(next);
    saveSpinnerEntries(next);
    setWinner(null);
    setRotation(0);
    setError('');
  }

  function spin() {
    if (pendingRef.current || parsed.error) return;
    try {
      const index = selectWinnerIndex(parsed.entries.length);
      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      const job: PendingSpin = {
        result: { ...parsed.entries[index], id: ++nextId.current },
        endsAt: Date.now() + (reducedMotion ? 0 : SPIN_DURATION_MS),
      };
      pendingRef.current = job;
      setWinner(null);
      setError('');
      setRotation(getSpinRotation(rotation, index, parsed.entries.length));
      setPending(job);
      if (reducedMotion) finish();
    } catch {
      setError('Could not start the spin. Please try again.');
    }
  }

  function removeWinner() {
    if (!winner || pendingRef.current) return;
    updateEntries(removeSpinnerEntry(text, winner.lineIndex));
  }

  function reset() {
    if (pendingRef.current) return;
    setText('');
    setWinner(null);
    setHistory([]);
    setRotation(0);
    setError('');
    clearSpinnerEntries();
  }

  return {
    text,
    rotation,
    winner,
    history,
    error,
    parsed,
    spinning: pending !== null,
    spin,
    finish,
    updateEntries,
    removeWinner,
    reset,
    clearHistory: () => setHistory([]),
  };
}
