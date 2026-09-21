import { beforeEach, expect, test } from '@rstest/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router';
import MetadataManager from '../src/seo/MetadataManager';

function NavigationHarness() {
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate('/developer/json-formatter')} type="button">
      Navigate to JSON Formatter
    </button>
  );
}

function renderMetadataManager(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <MetadataManager />
      <NavigationHarness />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  document.head.innerHTML = `
    <title>Fallback</title>
    <meta name="description" content="Fallback description" />
    <meta property="og:title" content="Fallback" />
    <meta property="og:description" content="Fallback description" />
    <meta property="og:url" content="https://tools.yehezgun.com/" />
    <meta property="og:image" content="https://example.com/fallback.png" />
    <meta property="og:image:alt" content="Fallback" />
    <meta name="twitter:title" content="Fallback" />
    <meta name="twitter:description" content="Fallback description" />
    <meta name="twitter:image" content="https://example.com/fallback.png" />
    <meta name="twitter:image:alt" content="Fallback" />
    <link rel="canonical" href="https://tools.yehezgun.com/" />
  `;
});

test('updates homepage document metadata', () => {
  renderMetadataManager('/');

  expect(document.title).toBe('Yehezgun Tools | My unified toolkit');
  expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
    'content',
    'A customized collection of focused tools, organized in one place and ready whenever I need them.',
  );
  expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute(
    'content',
    'https://tools.yehezgun.com/',
  );
  expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://tools.yehezgun.com/',
  );
});

test('updates tool document metadata', () => {
  renderMetadataManager('/generator/whatsapp-link');

  expect(document.title).toBe('WhatsApp Link Generator | Yehezgun Tools');
  expect(document.querySelector('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'WhatsApp Link Generator | Yehezgun Tools',
  );
  expect(document.querySelector('meta[property="og:image"]')).toHaveAttribute(
    'content',
    expect.stringContaining('og-image-rev.yehezgun.com/og?'),
  );
  expect(document.querySelector('meta[name="twitter:image"]')).toHaveAttribute(
    'content',
    expect.stringContaining('og-image-rev.yehezgun.com/og?'),
  );
});

test('updates metadata after client-side navigation', async () => {
  renderMetadataManager('/');

  fireEvent.click(
    screen.getByRole('button', { name: /navigate to json formatter/i }),
  );

  await waitFor(() => {
    expect(document.title).toBe('JSON Formatter | Yehezgun Tools');
  });
  expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://tools.yehezgun.com/developer/json-formatter',
  );
});

test('leaves fallback metadata unchanged for unknown routes', () => {
  renderMetadataManager('/unknown');

  expect(document.title).toBe('Fallback');
  expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
    'content',
    'Fallback description',
  );
});
