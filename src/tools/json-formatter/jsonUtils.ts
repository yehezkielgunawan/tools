export type JsonOperationResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

type JsonParseResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

function parseJson(input: string): JsonParseResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { ok: false, error: 'Enter JSON to continue.' };
  }

  try {
    return { ok: true, value: JSON.parse(trimmed) as unknown };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to parse input.';
    return { ok: false, error: `Invalid JSON: ${message}` };
  }
}

function serializeJson(input: string, space?: number): JsonOperationResult {
  const parsed = parseJson(input);

  if (!parsed.ok) {
    return parsed;
  }

  return { ok: true, value: JSON.stringify(parsed.value, null, space) };
}

export function formatJson(input: string): JsonOperationResult {
  return serializeJson(input, 2);
}

export function minifyJson(input: string): JsonOperationResult {
  return serializeJson(input);
}

export function validateJson(input: string): JsonOperationResult {
  const parsed = parseJson(input);

  return parsed.ok ? { ok: true, value: input } : parsed;
}
