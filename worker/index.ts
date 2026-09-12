import type { PageMetadata } from '../src/seo/pageMetadata';
import { getPageMetadata } from '../src/seo/pageMetadata';

function rewriteDocument(response: Response, metadata: PageMetadata): Response {
  try {
    return new HTMLRewriter()
      .on('title', {
        element(element) {
          element.setInnerContent(metadata.browserTitle);
        },
      })
      .on('meta[name="description"]', {
        element(element) {
          element.setAttribute('content', metadata.description);
        },
      })
      .on('meta[property="og:title"]', {
        element(element) {
          element.setAttribute('content', metadata.browserTitle);
        },
      })
      .on('meta[property="og:description"]', {
        element(element) {
          element.setAttribute('content', metadata.description);
        },
      })
      .on('meta[property="og:url"]', {
        element(element) {
          element.setAttribute('content', metadata.canonicalUrl);
        },
      })
      .on('meta[property="og:image"]', {
        element(element) {
          element.setAttribute('content', metadata.ogImageUrl);
        },
      })
      .on('meta[property="og:image:alt"]', {
        element(element) {
          element.setAttribute('content', metadata.imageTitle);
        },
      })
      .on('meta[name="twitter:title"]', {
        element(element) {
          element.setAttribute('content', metadata.browserTitle);
        },
      })
      .on('meta[name="twitter:description"]', {
        element(element) {
          element.setAttribute('content', metadata.description);
        },
      })
      .on('meta[name="twitter:image"]', {
        element(element) {
          element.setAttribute('content', metadata.ogImageUrl);
        },
      })
      .on('meta[name="twitter:image:alt"]', {
        element(element) {
          element.setAttribute('content', metadata.imageTitle);
        },
      })
      .on('link[rel="canonical"]', {
        element(element) {
          element.setAttribute('href', metadata.canonicalUrl);
        },
      })
      .transform(response);
  } catch {
    return response;
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const response = await env.ASSETS.fetch(request);
    if (request.method !== 'GET') {
      return response;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('text/html')) {
      return response;
    }

    const metadata = getPageMetadata(new URL(request.url).pathname);
    if (!metadata) {
      return response;
    }

    return rewriteDocument(response, metadata);
  },
} satisfies ExportedHandler<Env>;
