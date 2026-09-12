import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { getPageMetadata } from './pageMetadata';

function setMetaContent(selector: string, content: string): void {
  document.head
    .querySelector<HTMLMetaElement>(selector)
    ?.setAttribute('content', content);
}

export default function MetadataManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const metadata = getPageMetadata(pathname);
    if (!metadata) {
      return;
    }

    document.title = metadata.browserTitle;
    setMetaContent('meta[name="description"]', metadata.description);
    setMetaContent('meta[property="og:title"]', metadata.browserTitle);
    setMetaContent('meta[property="og:description"]', metadata.description);
    setMetaContent('meta[property="og:url"]', metadata.canonicalUrl);
    setMetaContent('meta[property="og:image"]', metadata.ogImageUrl);
    setMetaContent('meta[property="og:image:alt"]', metadata.imageTitle);
    setMetaContent('meta[name="twitter:title"]', metadata.browserTitle);
    setMetaContent('meta[name="twitter:description"]', metadata.description);
    setMetaContent('meta[name="twitter:image"]', metadata.ogImageUrl);
    setMetaContent('meta[name="twitter:image:alt"]', metadata.imageTitle);
    document.head
      .querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?.setAttribute('href', metadata.canonicalUrl);
  }, [pathname]);

  return null;
}
