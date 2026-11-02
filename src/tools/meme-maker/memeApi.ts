import type { MemeTemplate } from './memeTypes';

const API_ORIGIN = 'https://justmeme.wtf';
const PAGE_SIZE = 24;

export interface MemeTemplatePage {
  templates: MemeTemplate[];
  total: number;
  hasMore: boolean;
}

export function isSupportedMemeImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.origin === 'https://i.imgflip.com' || url.origin === API_ORIGIN) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function normalizeTemplate(value: unknown): MemeTemplate | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== 'string' ||
    !/^[a-z0-9_-]+$/i.test(item.id) ||
    typeof item.slug !== 'string' ||
    !/^[a-z0-9_-]+$/i.test(item.slug) ||
    typeof item.name !== 'string' ||
    !item.name.trim() ||
    typeof item.url !== 'string' ||
    !isSupportedMemeImageUrl(item.url)
  )
    return null;
  return {
    id: item.id,
    name: item.name.trim(),
    captionCount: 2,
    blankUrl: item.url,
    sourceUrl: `${API_ORIGIN}/meme/${item.slug}`,
  };
}

export async function fetchMemeTemplates({
  page = 1,
  query = '',
  signal,
}: {
  page?: number;
  query?: string;
  signal?: AbortSignal;
} = {}): Promise<MemeTemplatePage> {
  const search = query.trim();
  if (search.length === 1) return { templates: [], total: 0, hasMore: false };
  const params = new URLSearchParams(
    search ? { q: search } : { page: String(page), limit: String(PAGE_SIZE) },
  );
  const response = await fetch(
    `${API_ORIGIN}/api/v1/templates${search ? '/search' : ''}?${params}`,
    {
      signal,
      credentials: 'omit',
    },
  );
  if (response.status === 429)
    throw new Error(
      'Too many requests to justmeme.wtf. Wait a minute before trying again.',
    );
  if (!response.ok)
    throw new Error('Could not load meme templates. Please try again.');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object')
    throw new Error('The template catalog is invalid. Please try again.');
  const catalog = data as Record<string, unknown>;
  if (
    catalog.success !== true ||
    !Array.isArray(catalog.templates) ||
    typeof catalog.total !== 'number' ||
    !Number.isSafeInteger(catalog.total) ||
    catalog.total < 0
  )
    throw new Error('The template catalog is invalid. Please try again.');
  const seen = new Set<string>();
  const templates: MemeTemplate[] = [];
  for (const value of catalog.templates) {
    const template = normalizeTemplate(value);
    if (template && !seen.has(template.id)) {
      seen.add(template.id);
      templates.push(template);
    }
  }
  if (catalog.templates.length && !templates.length)
    throw new Error('The template catalog has no supported templates.');
  return {
    templates,
    total: catalog.total,
    hasMore:
      !search &&
      catalog.templates.length > 0 &&
      page * PAGE_SIZE < catalog.total,
  };
}
