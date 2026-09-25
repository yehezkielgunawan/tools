export function normalizeQrUrl(input: string): string {
  const value = input.trim();
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    if (
      /\s/.test(value) ||
      (/^[a-z][a-z\d+.-]*:\/\//i.test(value) && !/^https?:\/\//i.test(value))
    ) {
      throw new Error('Invalid whitespace or protocol');
    }
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
      throw new Error('Invalid protocol or host');
    }
    return url.href;
  } catch {
    throw new Error('Enter a valid HTTP or HTTPS URL.');
  }
}
