// @rstest-environment happy-dom
import { describe, expect, it } from '@rstest/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppRoutes } from '../src/app/router';
import { ToolSearchProvider } from '../src/components/ui/ToolSearch';
import HomePage from '../src/pages/HomePage';
import { getPageMetadata } from '../src/seo/pageMetadata';
import { tools } from '../src/tools/registry';

describe('invoice tool integration', () => {
  it('loads the lazy route with generic metadata', async () => {
    render(
      <MemoryRouter initialEntries={['/generator/invoice']}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Invoice Generator',
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(
      tools.find((tool) => tool.path === '/generator/invoice')?.category,
    ).toBe('generator');
    expect(getPageMetadata('/generator/invoice')?.canonicalUrl).toBe(
      'https://tools.yehezgun.com/generator/invoice',
    );
  });
  it('appears on the homepage and in billing search results', () => {
    render(
      <MemoryRouter>
        <ToolSearchProvider>
          <HomePage />
        </ToolSearchProvider>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('link', { name: /Invoice Generator/ }),
    ).toHaveAttribute('href', '/generator/invoice');
    fireEvent.click(screen.getByRole('button', { name: /Search tools/ }));
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'billing' },
    });
    expect(
      screen.getAllByRole('link', { name: /Invoice Generator/ }),
    ).toHaveLength(2);
  });
});
