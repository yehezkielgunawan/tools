import type { CardInput } from './cardModel';

export class CardRenderError extends Error {
  constructor(
    message: string,
    public readonly field?: keyof CardInput,
  ) {
    super(message);
    this.name = 'CardRenderError';
  }
}

export async function renderCard(
  card: CardInput,
  signal: AbortSignal,
): Promise<Blob> {
  const response = await fetch(
    'https://og-image-rev.yehezgun.com/cards/render',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
      signal,
      cache: 'no-store',
      credentials: 'omit',
    },
  );

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    let message = 'Unable to render your card. Please try again.';
    let field: keyof CardInput | undefined;
    if (body && typeof body === 'object') {
      if ('error' in body && typeof body.error === 'string') {
        message = body.error;
      }
      if (
        'field' in body &&
        typeof body.field === 'string' &&
        Object.keys(card).includes(body.field)
      ) {
        field = body.field as keyof CardInput;
      }
    }
    throw new CardRenderError(message, field);
  }

  if (response.headers.get('Content-Type')?.split(';')[0] !== 'image/png') {
    throw new CardRenderError(
      'The image service did not return a PNG. Please try again.',
    );
  }
  const blob = await response.blob();
  if (!blob.size) {
    throw new CardRenderError(
      'The image service returned an empty image. Please try again.',
    );
  }
  return blob;
}
