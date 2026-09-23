import { expect, test } from '@rstest/core';
import {
  parseChangelog,
  validateCurrentRelease,
} from '../src/config/parseChangelog';

const validChangelog = `# Changelog

## [1.1.0](https://github.com/example/tools/compare/v1.0.0...v1.1.0) (2026-09-23)

### Features

* **json:** Add tree view ([#12](https://github.com/example/tools/pull/12)) ([abc123](https://github.com/example/tools/commit/abc123))

### Bug Fixes

* Encode emoji correctly

## 1.0.0 (2026-09-01)

### Features

* **ui:** Add the initial workspace
`;

test('parses releases, sections, scopes, and release metadata', () => {
  expect(parseChangelog(validChangelog)).toEqual([
    {
      version: '1.1.0',
      date: '2026-09-23',
      changes: {
        features: [
          {
            scope: 'json',
            description: 'Add tree view',
          },
        ],
        fixes: [
          {
            description: 'Encode emoji correctly',
          },
        ],
      },
    },
    {
      version: '1.0.0',
      date: '2026-09-01',
      changes: {
        features: [
          {
            scope: 'ui',
            description: 'Add the initial workspace',
          },
        ],
      },
    },
  ]);
});

test('normalizes inline markdown references in change descriptions', () => {
  const markdown = `# Changelog

## 1.0.0 (2026-09-23)

### Fixes

* **api:** Fix stale cache, closes [#42](https://github.com/example/tools/issues/42)
`;

  expect(parseChangelog(markdown)[0]?.changes.fixes).toEqual([
    {
      scope: 'api',
      description: 'Fix stale cache, closes #42',
    },
  ]);
});

test('maps unrecognized sections to other', () => {
  const markdown = `# Changelog

## 1.0.0 (2026-09-23)

### Documentation

* Update setup instructions
`;

  expect(parseChangelog(markdown)[0]?.changes.other).toEqual([
    { description: 'Update setup instructions' },
  ]);
});

test('accepts breaking-change sections as other changes', () => {
  const markdown = `# Changelog

## 2.0.0 (2026-09-23)

### ⚠ BREAKING CHANGES

* **config:** Remove the legacy format
`;

  expect(parseChangelog(markdown)[0]?.changes.other).toEqual([
    { scope: 'config', description: 'Remove the legacy format' },
  ]);
});

test('rejects malformed release headings', () => {
  expect(() => parseChangelog('# Changelog\n\n## Version one\n')).toThrow(
    /invalid release heading/i,
  );
});

test('rejects entries outside a section', () => {
  expect(() =>
    parseChangelog('# Changelog\n\n## 1.0.0 (2026-09-23)\n\n* Entry\n'),
  ).toThrow(/before a section/i);
});

test('rejects unexpected content inside a release', () => {
  expect(() =>
    parseChangelog(
      '# Changelog\n\n## 1.0.0 (2026-09-23)\n\n### Features\n\nnot a bullet\n',
    ),
  ).toThrow(/unexpected content/i);
});

test('allows Release Please reference-link definitions', () => {
  const markdown = `# Changelog

## 1.0.0 (2026-09-23)

### Features

* Add the initial workspace

[1.0.0]: https://github.com/example/tools/releases/tag/v1.0.0
`;

  expect(parseChangelog(markdown)[0]?.changes.features).toEqual([
    { description: 'Add the initial workspace' },
  ]);
});

test('allows Markdown reference-link usages before the first release', () => {
  const markdown = `# Changelog

[npm history][1]

## 1.0.0 (2026-09-23)

### Features

* Add the initial workspace

[1]: https://github.com/example/tools/releases/tag/v1.0.0
`;

  expect(parseChangelog(markdown)[0]?.changes.features).toEqual([
    { description: 'Add the initial workspace' },
  ]);
});

test('rejects unexpected content before the first release', () => {
  expect(() =>
    parseChangelog('# Changelog\n\nThis is an unsupported preamble.\n'),
  ).toThrow(/before the first release/i);
});

test('rejects releases without changes', () => {
  expect(() =>
    parseChangelog('# Changelog\n\n## 1.0.0 (2026-09-23)\n'),
  ).toThrow(/release 1.0.0 has no changes/i);
});

test('rejects invalid release dates', () => {
  expect(() => parseChangelog('# Changelog\n\n## 1.0.0 (2026-9-23)\n')).toThrow(
    /invalid release heading/i,
  );
});

test('validates the current package version', () => {
  const releases = parseChangelog(validChangelog);

  expect(() => validateCurrentRelease('1.1.0', releases)).not.toThrow();
  expect(() => validateCurrentRelease('1.2.0', releases)).toThrow(
    /package version 1.2.0.*changelog version 1.1.0/i,
  );
});
