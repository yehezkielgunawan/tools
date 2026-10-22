import { expect, test } from '@rstest/core';
import { jsonToYaml, yamlToJson } from './jsonYamlUtils';

test('converts nested JSON to YAML and back without changing values', () => {
  const value = {
    name: '👋',
    active: true,
    missing: null,
    list: [1, { text: 'true' }],
    empty: {},
  };
  const yaml = jsonToYaml(JSON.stringify(value));
  expect(yaml.ok).toBe(true);
  if (!yaml.ok) throw new Error(yaml.error);
  expect(yaml.value).toContain('name:');
  expect(yamlToJson(yaml.value)).toEqual({
    ok: true,
    value: JSON.stringify(value, null, 2),
  });
});

test('preserves YAML strings, multiline text, scalar roots, and empty collections', () => {
  for (const value of [
    '',
    'true',
    '2026-10-22',
    'line\nsecond\n',
    null,
    false,
    42,
    [],
    {},
  ]) {
    const yaml = jsonToYaml(JSON.stringify(value));
    if (!yaml.ok) throw new Error(yaml.error);
    expect(yamlToJson(yaml.value)).toEqual({
      ok: true,
      value: JSON.stringify(value, null, 2),
    });
  }
  expect(yamlToJson('date: 2026-10-22\non: yes')).toEqual({
    ok: true,
    value: '{\n  "date": "2026-10-22",\n  "on": "yes"\n}',
  });
});

test('preserves special object keys and permits bounded non-cyclic aliases', () => {
  const result = yamlToJson(
    '__proto__: safe\nconstructor: value\na: &a [1, 2]\nb: *a',
  );
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error);
  expect(JSON.parse(result.value)).toEqual(
    JSON.parse(
      '{"__proto__":"safe","constructor":"value","a":[1,2],"b":[1,2]}',
    ),
  );
});

test('rejects invalid and empty source documents with readable errors', () => {
  for (const input of ['', '  ', '{broken'])
    expect(jsonToYaml(input).ok).toBe(false);
  for (const input of [
    '',
    '# only a comment',
    'a: [broken',
    'a: 1\na: 2',
    '---\na: 1\n---\nb: 2',
  ]) {
    const result = yamlToJson(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(10);
  }
  const result = yamlToJson('a: [broken');
  if (!result.ok) expect(result.error).toMatch(/line|column/i);
});

test('rejects values that JSON cannot faithfully represent', () => {
  for (const input of [
    '? [a, b]\n: value',
    '1: value',
    'a: .nan',
    'a: .inf',
    'a: !!timestamp 2026-10-22',
    'a: !custom value',
    'a: &a [*a]',
    'a: 9007199254740993',
  ]) {
    expect(yamlToJson(input).ok).toBe(false);
  }
  expect(jsonToYaml('{"n":1e999}').ok).toBe(false);
});

test('bounds alias expansion and conversion depth', () => {
  const yaml = `a: &a [1, 2]\nb: &b [${Array(101).fill('*a').join(', ')}]`;
  expect(yamlToJson(yaml).ok).toBe(false);
  const deep = `${'['.repeat(150)}0${']'.repeat(150)}`;
  expect(jsonToYaml(deep).ok).toBe(false);
});
