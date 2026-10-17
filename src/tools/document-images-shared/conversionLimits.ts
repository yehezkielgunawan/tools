export const MAX_CONVERSION_ITEMS = 50;
export const MAX_DOCUMENT_BYTES = 32 * 1024 * 1024;
export const MAX_IMAGE_QUEUE_BYTES = 64 * 1024 * 1024;
export const MAX_RESULT_BYTES = 128 * 1024 * 1024;

export function checkCancelled(signal: AbortSignal) {
  if (signal.aborted)
    throw new DOMException('Conversion cancelled.', 'AbortError');
}

export function checkResultSize(bytes: number) {
  if (bytes > MAX_RESULT_BYTES)
    throw new RangeError(
      'Results exceed 128 MiB. Select fewer pages or a smaller resolution.',
    );
}

export function checkDocumentFile(file: File) {
  if (!file.size) throw new Error('The selected file is empty.');
  if (file.size > MAX_DOCUMENT_BYTES)
    throw new RangeError('Choose a document 32 MiB or smaller.');
}
