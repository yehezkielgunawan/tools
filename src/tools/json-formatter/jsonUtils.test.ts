import { expect, test } from '@rstest/core';
import { formatJson, minifyJson, validateJson } from './jsonUtils';

test('formats JSON with two-space indentation', () => {
  expect(formatJson('{"name":"Yehezgun","active":true}')).toEqual({
    ok: true,
    value: '{\n  "name": "Yehezgun",\n  "active": true\n}',
  });
});

test('minifies nested JSON and arrays', () => {
  expect(
    minifyJson(`{
      "user": { "roles": ["admin", "author"] }
    }`),
  ).toEqual({
    ok: true,
    value: '{"user":{"roles":["admin","author"]}}',
  });
});

test('preserves special characters in JSON strings', () => {
  expect(formatJson('{"text":"line\\n\\"quoted\\"","emoji":"👋"}')).toEqual({
    ok: true,
    value: '{\n  "text": "line\\n\\"quoted\\"",\n  "emoji": "👋"\n}',
  });
});

test('validates JSON without changing the editor text', () => {
  const input = '  {"valid":true}  ';

  expect(validateJson(input)).toEqual({ ok: true, value: input });
});

test('rejects empty input', () => {
  expect(formatJson('   ')).toEqual({
    ok: false,
    error: 'Enter JSON to continue.',
  });
});

test('returns a readable parsing error for invalid JSON', () => {
  const result = minifyJson('{"active": }');

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error).toMatch(/^Invalid JSON:/);
  }
});
