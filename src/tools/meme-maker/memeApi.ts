import type { MemeTemplate } from './memeTypes';

const API_ORIGIN = 'https://api.memegen.link';

function normalizeTemplate(value: unknown): MemeTemplate | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== 'string' ||
    !/^[a-z0-9_-]+$/i.test(item.id) ||
    typeof item.name !== 'string' ||
    !item.name.trim() ||
    typeof item.lines !== 'number' ||
    !Number.isInteger(item.lines) ||
    item.lines < 1 ||
    item.lines > 10 ||
    item.overlays !== 0 ||
    typeof item.blank !== 'string'
  )
    return null;

  try {
    const blank = new URL(item.blank);
    if (blank.origin !== API_ORIGIN || blank.username || blank.password)
      return null;
    let sourceUrl: string | undefined;
    if (typeof item.source === 'string') {
      const source = new URL(item.source);
      if (source.protocol === 'https:' || source.protocol === 'http:')
        sourceUrl = source.href;
    }
    return {
      id: item.id,
      name: item.name.trim(),
      captionCount: item.lines,
      blankUrl: `${API_ORIGIN}/images/${item.id}.png`,
      ...(sourceUrl ? { sourceUrl } : {}),
    };
  } catch {
    return null;
  }
}

export async function fetchMemeTemplates(
  signal?: AbortSignal,
): Promise<MemeTemplate[]> {
  const response = await fetch(`${API_ORIGIN}/templates/`, {
    signal,
    credentials: 'omit',
  });
  if (!response.ok)
    throw new Error('Could not load meme templates. Please try again.');
  const data: unknown = await response.json();
  if (!Array.isArray(data))
    throw new Error('The template catalog is invalid. Please try again.');
  const seen = new Set<string>();
  const templates: MemeTemplate[] = [];
  for (const value of data) {
    const template = normalizeTemplate(value);
    if (template && !seen.has(template.id)) {
      seen.add(template.id);
      templates.push(template);
    }
  }
  if (!templates.length)
    throw new Error('The template catalog has no supported templates.');
  return templates;
}

export function searchMemeTemplates(
  templates: readonly MemeTemplate[],
  query: string,
): MemeTemplate[] {
  const search = query.trim().toLowerCase();
  return templates.filter((template) =>
    template.name.toLowerCase().includes(search),
  );
}
