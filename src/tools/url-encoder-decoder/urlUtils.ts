import type { JsonOperationResult } from '../json-formatter/jsonUtils';

export type UrlEncodingMode = 'component' | 'whole-url';

export function transformUrl(
  input: string,
  operation: 'encode' | 'decode',
  mode: UrlEncodingMode,
): JsonOperationResult {
  try {
    const transform =
      operation === 'encode'
        ? mode === 'component'
          ? encodeURIComponent
          : encodeURI
        : mode === 'component'
          ? decodeURIComponent
          : decodeURI;
    return { ok: true, value: transform(input) };
  } catch {
    return {
      ok: false,
      error:
        operation === 'decode'
          ? 'Unable to decode: check for incomplete percent escapes or invalid UTF-8 sequences.'
          : 'Unable to encode: the input contains an invalid Unicode character (an unpaired surrogate).',
    };
  }
}
