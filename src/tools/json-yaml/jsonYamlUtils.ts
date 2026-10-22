import { isScalar, parseDocument, stringify } from 'yaml';
import type { JsonOperationResult } from '../json-formatter/jsonUtils';

// Bound the expanded structure as well as YAML's alias resolution.
function jsonCompatible(value: unknown): unknown {
  let count = 0;
  const ancestors = new Set<object>();
  function convert(item: unknown, depth: number): unknown {
    if (++count > 50_000 || depth > 100) {
      throw new Error(
        'The document exceeds the conversion limit (50,000 values or 100 levels).',
      );
    }
    if (item === null || typeof item === 'string' || typeof item === 'boolean')
      return item;
    if (typeof item === 'bigint') {
      const number = Number(item);
      if (!Number.isSafeInteger(number))
        throw new Error(
          'An integer is too large to represent faithfully in JSON.',
        );
      return number;
    }
    if (typeof item === 'number' && Number.isFinite(item)) return item;
    if (typeof item !== 'object' || item === null)
      throw new Error(
        'Only finite numbers and JSON-compatible values are supported.',
      );
    if (ancestors.has(item))
      throw new Error('Cyclic YAML aliases cannot be represented in JSON.');
    ancestors.add(item);
    let result: unknown;
    if (Array.isArray(item))
      result = item.map((child) => convert(child, depth + 1));
    else if (item instanceof Map) {
      result = Object.fromEntries(
        Array.from(item, ([key, child]: [unknown, unknown]) => {
          if (typeof key !== 'string')
            throw new Error(
              'JSON objects require string mapping keys; complex or non-string YAML keys are not supported.',
            );
          return [key, convert(child, depth + 1)];
        }),
      );
    } else if (Object.getPrototypeOf(item) === Object.prototype) {
      result = Object.fromEntries(
        Object.entries(item).map(([key, child]) => [
          key,
          convert(child, depth + 1),
        ]),
      );
    } else throw new Error('This YAML value cannot be represented in JSON.');
    ancestors.delete(item);
    return result;
  }
  return convert(value, 0);
}

export function jsonToYaml(input: string): JsonOperationResult {
  if (!input.trim()) return { ok: false, error: 'Enter JSON to continue.' };
  try {
    const value = jsonCompatible(JSON.parse(input) as unknown);
    return { ok: true, value: stringify(value, { indent: 2, lineWidth: 0 }) };
  } catch (error) {
    return {
      ok: false,
      error: `Unable to convert JSON: ${error instanceof Error ? error.message : 'Invalid input.'}`,
    };
  }
}

export function yamlToJson(input: string): JsonOperationResult {
  if (!input.trim()) return { ok: false, error: 'Enter YAML to continue.' };
  try {
    const document = parseDocument(input, {
      version: '1.2',
      schema: 'core',
      uniqueKeys: true,
      intAsBigInt: true,
    });
    if (document.errors.length) throw document.errors[0];
    if (document.warnings.length) throw document.warnings[0];
    if (
      document.contents === null ||
      (isScalar(document.contents) &&
        document.contents.type === 'PLAIN' &&
        document.contents.source === '')
    ) {
      throw new Error('Enter a YAML value to continue.');
    }
    const value = jsonCompatible(
      document.toJS({ mapAsMap: true, maxAliasCount: 100 }) as unknown,
    );
    return { ok: true, value: JSON.stringify(value, null, 2) };
  } catch (error) {
    return {
      ok: false,
      error: `Unable to convert YAML: ${error instanceof Error ? error.message : 'Invalid input.'}`,
    };
  }
}
