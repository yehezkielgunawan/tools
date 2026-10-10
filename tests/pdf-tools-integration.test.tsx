import { describe, expect, it } from '@rstest/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppRoutes } from '../src/app/router';
import { ToolSearchProvider } from '../src/components/ui/ToolSearch';
import HomePage from '../src/pages/HomePage';
import { getPageMetadata } from '../src/seo/pageMetadata';
import { tools } from '../src/tools/registry';

describe('PDF tools integration', () => {
  for (const [name, path] of [
    ['PDF Merger', '/pdf/pdf-merger'],
    ['PDF Splitter', '/pdf/pdf-splitter'],
  ]) {
    it(`loads ${name} from its route with matching metadata`, async () => {
      render(
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>,
      );
      expect(
        await screen.findByRole('heading', { level: 1, name }),
      ).toBeInTheDocument();
      expect(tools.find((tool) => tool.path === path)?.category).toBe('pdf');
      expect(getPageMetadata(path)?.browserTitle).toBe(
        `${name} | Yehezgun Tools`,
      );
      expect(getPageMetadata(path)?.canonicalUrl).toBe(
        `https://tools.yehezgun.com${path}`,
      );
    });
  }

  it('shows both tools on the home page and in PDF search results', async () => {
    render(
      <MemoryRouter>
        <ToolSearchProvider>
          <HomePage />
        </ToolSearchProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /PDF Merger/i })).toHaveAttribute(
      'href',
      '/pdf/pdf-merger',
    );
    expect(screen.getByRole('link', { name: /PDF Splitter/i })).toHaveAttribute(
      'href',
      '/pdf/pdf-splitter',
    );
    fireEvent.click(screen.getByRole('button', { name: /Search tools/i }));
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'pdf' },
    });
    expect(screen.getAllByRole('link', { name: /PDF Merger/i })).toHaveLength(
      2,
    );
    expect(screen.getAllByRole('link', { name: /PDF Splitter/i })).toHaveLength(
      2,
    );
  });
});
