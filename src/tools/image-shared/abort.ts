export function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted)
    throw new DOMException('Processing cancelled.', 'AbortError');
}
