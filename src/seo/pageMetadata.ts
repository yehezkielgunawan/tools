import { tools } from '../tools/registry';

const SITE_ORIGIN = 'https://tools.yehezgun.com';
const OG_SERVICE_ORIGIN = 'https://og-image-rev.yehezgun.com';
const OG_SITE_NAME = 'tools.yehezgun.com';
const OG_SOCIAL = 'yehezgun.com';
const OG_LOGO_URL = 'https://tools.yehezgun.com/yehezgun-tools-og-logo.png';
const HOMEPAGE_DESCRIPTION =
  'A customized collection of focused tools, organized in one place and ready whenever I need them.';

export interface PageMetadata {
  browserTitle: string;
  imageTitle: string;
  description: string;
  canonicalUrl: string;
  ogImageUrl: string;
}

export function buildOgImageUrl({
  title,
  description,
  cta,
}: {
  title: string;
  description: string;
  cta: string;
}): string {
  const params = new URLSearchParams({
    title,
    description,
    siteName: OG_SITE_NAME,
    social: OG_SOCIAL,
    cta,
    image: OG_LOGO_URL,
  });

  return `${OG_SERVICE_ORIGIN}/og?${params.toString()}`;
}

function createPageMetadata({
  browserTitle,
  imageTitle,
  description,
  path,
  cta,
}: {
  browserTitle: string;
  imageTitle: string;
  description: string;
  path: string;
  cta: string;
}): PageMetadata {
  return {
    browserTitle,
    imageTitle,
    description,
    canonicalUrl: `${SITE_ORIGIN}${path}`,
    ogImageUrl: buildOgImageUrl({
      title: imageTitle,
      description,
      cta,
    }),
  };
}

export const homePageMetadata = createPageMetadata({
  browserTitle: 'Yehezgun Tools | My unified toolkit',
  imageTitle: 'Yehezgun Tools',
  description: HOMEPAGE_DESCRIPTION,
  path: '/',
  cta: 'Explore tools \u2192',
});

export const changelogPageMetadata = createPageMetadata({
  browserTitle: 'Changelog | Yehezgun Tools',
  imageTitle: 'Yehezgun Tools Changelog',
  description: 'Release history and notable changes for Yehezgun Tools.',
  path: '/changelog',
  cta: 'Read release notes \u2192',
});

function normalizePathname(pathname: string): string {
  const path = pathname.split('?')[0] ?? '/';
  if (path === '/') {
    return path;
  }

  return path.replace(/\/+$/, '');
}

export function getPageMetadata(pathname: string): PageMetadata | null {
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname === '/') {
    return homePageMetadata;
  }

  if (normalizedPathname === '/changelog') {
    return changelogPageMetadata;
  }

  const tool = tools.find(({ path }) => path === normalizedPathname);
  if (!tool) {
    return null;
  }

  return createPageMetadata({
    browserTitle: `${tool.name} | Yehezgun Tools`,
    imageTitle: tool.name,
    description: tool.description,
    path: tool.path,
    cta: 'Open tool \u2192',
  });
}
