import { expect, test } from '@rstest/core';
import { transformUrl } from './urlUtils';

test('encodes components and round-trips Unicode, plus signs, and whitespace', () => {
  const text = ' https://example.com/?q=hello 👋&next=a+b#ok ';
  const encoded = transformUrl(text, 'encode', 'component');
  expect(encoded).toEqual({
    ok: true,
    value:
      '%20https%3A%2F%2Fexample.com%2F%3Fq%3Dhello%20%F0%9F%91%8B%26next%3Da%2Bb%23ok%20',
  });
  if (!encoded.ok) throw new Error(encoded.error);
  expect(transformUrl(encoded.value, 'decode', 'component')).toEqual({
    ok: true,
    value: text,
  });
});

test('whole-URL mode preserves URL separators when encoding and reserved escapes when decoding', () => {
  expect(
    transformUrl(
      'https://example.com/?q=hello world&n=👋#ok',
      'encode',
      'whole-url',
    ),
  ).toEqual({
    ok: true,
    value: 'https://example.com/?q=hello%20world&n=%F0%9F%91%8B#ok',
  });
  expect(
    transformUrl('%3Fq%3Da%26b%20%F0%9F%91%8B', 'decode', 'whole-url'),
  ).toEqual({ ok: true, value: '%3Fq%3Da%26b 👋' });
});

test('decodes once, keeps literal plus signs, and supports empty input', () => {
  expect(transformUrl('a+b%2520', 'decode', 'component')).toEqual({
    ok: true,
    value: 'a+b%20',
  });
  expect(transformUrl('', 'encode', 'component')).toEqual({
    ok: true,
    value: '',
  });
});

test('reports malformed escapes, invalid UTF-8, and lone surrogates', () => {
  for (const mode of ['component', 'whole-url'] as const) {
    for (const text of ['%', '%GG', '%E0%A4%A', '%FF']) {
      const result = transformUrl(text, 'decode', mode);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/percent|utf-8/i);
    }
    expect(transformUrl('\uD800', 'encode', mode).ok).toBe(false);
  }
});
