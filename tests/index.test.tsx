import { expect, test } from '@rstest/core';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import App from '../src/app/App';

test('renders the homepage with both registered tools', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole('heading', { name: /small tools for everyday work/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: /whatsapp link generator/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: /json formatter/i }),
  ).toBeInTheDocument();
});

test('renders the WhatsApp tool for its direct route', async () => {
  render(
    <MemoryRouter initialEntries={['/generator/whatsapp-link']}>
      <App />
    </MemoryRouter>,
  );

  expect(
    await screen.findByRole('heading', { name: /whatsapp link generator/i }),
  ).toBeInTheDocument();
});

test('renders the JSON tool for its direct route', async () => {
  render(
    <MemoryRouter initialEntries={['/developer/json-formatter']}>
      <App />
    </MemoryRouter>,
  );

  expect(
    await screen.findByRole('heading', { name: /json formatter/i }),
  ).toBeInTheDocument();
});

test('renders the not found page for unknown routes', () => {
  render(
    <MemoryRouter initialEntries={['/unknown']}>
      <App />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole('heading', { name: /page not found/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: /back to homepage/i }),
  ).toBeInTheDocument();
});
