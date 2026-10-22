import { expect, test } from '@rstest/core';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppRoutes } from '../src/app/router';
import { getPageMetadata } from '../src/seo/pageMetadata';

for (const [path, title] of [
  ['/developer/json-yaml', 'JSON ↔ YAML'],
  ['/developer/url-encoder-decoder', 'URL Encoder & Decoder'],
  ['/developer/json-formatter', 'JSON Formatter & Viewer'],
] as const) {
  test(`renders ${path} directly with route metadata`, async () => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: title }),
    ).toBeInTheDocument();
    expect(getPageMetadata(path)).toMatchObject({
      browserTitle: `${title} | Yehezgun Tools`,
      canonicalUrl: `https://tools.yehezgun.com${path}`,
    });
    expect(getPageMetadata(`${path}/`)).toEqual(getPageMetadata(path));
  });
}
