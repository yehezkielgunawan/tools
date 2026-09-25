import { expect, test } from '@rstest/core';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import HomePage from '../src/pages/HomePage';
import { tools } from '../src/tools/registry';

test('renders all registered tools in one grid with their category labels', () => {
  const { container } = render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );

  const grids = container.querySelectorAll('.grid');
  expect(grids).toHaveLength(1);

  const grid = grids[0];
  if (!grid) throw new Error('Expected homepage tool grid');

  const gridQueries = within(grid);
  for (const tool of tools) {
    const toolCard = gridQueries.getByRole('link', { name: tool.name });
    expect(toolCard).toHaveAttribute('href', tool.path);
    expect(within(toolCard).getByText(tool.category)).toBeInTheDocument();
  }

  for (const { label } of [
    { label: 'Generator' },
    { label: 'Developer' },
    { label: 'Image' },
    { label: 'PDF' },
  ]) {
    expect(
      screen.queryByRole('heading', { name: label }),
    ).not.toBeInTheDocument();
  }
});
