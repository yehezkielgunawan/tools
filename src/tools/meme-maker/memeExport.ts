export function canCopyMeme(): boolean {
  return (
    globalThis.isSecureContext === true &&
    typeof ClipboardItem !== 'undefined' &&
    typeof navigator.clipboard?.write === 'function' &&
    (typeof ClipboardItem.supports !== 'function' ||
      ClipboardItem.supports('image/png'))
  );
}

export async function copyMeme(blob: Blob): Promise<void> {
  if (!canCopyMeme())
    throw new Error(
      'Image copying is unavailable in this browser. Download the PNG instead.',
    );
  try {
    // No async work before write: preserve the click's transient user activation.
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  } catch {
    throw new Error(
      'Could not copy the image. Allow clipboard access or download the PNG instead.',
    );
  }
}

export function downloadMeme(blob: Blob, templateName: string): void {
  const name =
    templateName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'meme';
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name}-meme.png`;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Let the browser start the download before revoking the URL.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
