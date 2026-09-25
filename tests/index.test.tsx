import { expect, test } from '@rstest/core';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import App from '../src/app/App';

test('renders the homepage with all registered tools', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole('heading', { name: /my unified toolkit/i }),
  ).toBeInTheDocument();
  const main = within(screen.getByRole('main'));
  expect(
    main.getByRole('link', { name: /whatsapp link generator/i }),
  ).toBeInTheDocument();
  expect(
    main.getByRole('link', { name: /json formatter/i }),
  ).toBeInTheDocument();
  expect(
    main.getByRole('link', { name: /image compressor/i }),
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

test('renders the image compressor for its direct route', async () => {
  render(
    <MemoryRouter initialEntries={['/image/image-compressor']}>
      <App />
    </MemoryRouter>,
  );

  expect(
    await screen.findByRole('heading', { name: /image compressor/i }),
  ).toBeInTheDocument();
});

test('renders the changelog route', async () => {
  render(
    <MemoryRouter initialEntries={['/changelog']}>
      <App />
    </MemoryRouter>,
  );

  expect(
    await screen.findByRole('heading', { name: /changelog/i }),
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
