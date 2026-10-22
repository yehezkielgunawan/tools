import { expect, test } from '@rstest/core';
import { buildJsonTree } from './jsonTreeUtils';

test('builds typed JSON nodes with property names, array indices, and collection sizes', () => {
  const tree = buildJsonTree({ items: [null, true, 42, 'hello'], empty: {} });
  expect(tree.root.kind).toBe('object');
  expect(tree.root.size).toBe(2);
  expect(tree.root.children?.[0]).toMatchObject({
    label: '"items"',
    kind: 'array',
    size: 4,
  });
  expect(
    tree.root.children?.[0]?.children?.map(({ label, kind }) => [label, kind]),
  ).toEqual([
    ['[0]', 'null'],
    ['[1]', 'boolean'],
    ['[2]', 'number'],
    ['[3]', 'string'],
  ]);
  expect(tree.root.children?.[1]).toMatchObject({ size: 0, children: [] });
  expect(tree.truncated).toBe(false);
});

test('supports scalar roots and preserves escaped string text as text', () => {
  expect(buildJsonTree(null).root).toMatchObject({
    kind: 'null',
    display: 'null',
  });
  expect(buildJsonTree('<script>\n"hello"').root.display).toBe(
    '"<script>\\n\\"hello\\""',
  );
});

test('bounds total tree nodes even for wide collections', () => {
  const tree = buildJsonTree(Array.from({ length: 5000 }, (_, i) => i));
  expect(tree.nodeCount).toBe(2000);
  expect(tree.root.children).toHaveLength(1999);
  expect(tree.root.size).toBe(5000);
  expect(tree.truncated).toBe(true);
});

test('bounds deep trees and long string previews', () => {
  let value: unknown = 0;
  for (let i = 0; i < 200; i++) value = { nested: value };
  const tree = buildJsonTree(value);
  expect(tree.nodeCount).toBe(51);
  expect(tree.truncated).toBe(true);
  expect(buildJsonTree('x'.repeat(10000)).root.display.length).toBeLessThan(
    310,
  );
});
