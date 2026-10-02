import { useEffect, useState } from 'react';
import { type CardInput, sizes, validateCard } from './cardModel';
import { CardRenderError, renderCard } from './renderCard';

interface CardPreview {
  key: string;
  url: string;
  width: number;
  height: number;
  downloadName: string;
}

interface RenderState {
  key: string;
  attempt: number;
  kind: 'loading' | 'success' | 'error';
  error?: CardRenderError;
}

export function useCardPreview(card: CardInput) {
  const validation = validateCard(card);
  const key = validation.value ? JSON.stringify(validation.value) : null;
  const [preview, setPreview] = useState<CardPreview | null>(null);
  const [state, setState] = useState<RenderState | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!key) return;
    // Parse the normalized request key so the effect depends only on the
    // actual payload, rather than the editor object's identity.
    const input: CardInput = JSON.parse(key);
    const controller = new AbortController();
    let active = true;
    let timedOut = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    setState({ key, attempt, kind: 'loading' });

    const render = async (): Promise<void> => {
      timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 20_000);
      try {
        const blob = await renderCard(input, controller.signal);
        if (!active || controller.signal.aborted) return;
        setPreview({
          key,
          url: URL.createObjectURL(blob),
          width: sizes[input.size].width,
          height: sizes[input.size].height,
          downloadName: `${input.occasion}-greeting-card-${input.size}.png`,
        });
        setState({ key, attempt, kind: 'success' });
      } catch (error) {
        if (!active) return;
        const failure = timedOut
          ? new CardRenderError('Rendering took too long. Please try again.')
          : error instanceof CardRenderError
            ? error
            : new CardRenderError(
                'Could not reach the image service. Check your internet connection and try again.',
              );
        setState({ key, attempt, kind: 'error', error: failure });
      } finally {
        clearTimeout(timeout);
      }
    };

    const debounce = setTimeout(() => void render(), 400);
    return () => {
      active = false;
      clearTimeout(debounce);
      clearTimeout(timeout);
      controller.abort();
    };
  }, [key, attempt]);

  const previewUrl = preview?.url;
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const current = key && state?.key === key && state.attempt === attempt;
  const error = current ? (state.error ?? null) : null;
  const ready = Boolean(
    current && state.kind === 'success' && preview?.key === key,
  );

  return {
    preview,
    errors: validation.errors,
    error,
    ready,
    pending: Boolean(key && !ready && !error),
    retry: () => setAttempt((previous) => previous + 1),
  };
}
