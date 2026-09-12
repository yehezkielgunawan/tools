import { expect, test } from '@rstest/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import WhatsAppLinkGenerator from '../src/tools/whatsapp-link/WhatsAppLinkGenerator';

function renderTool(): void {
  render(
    <MemoryRouter>
      <WhatsAppLinkGenerator />
    </MemoryRouter>,
  );
}

test('requires a phone number before generating a link', () => {
  renderTool();

  fireEvent.click(screen.getByRole('button', { name: /generate link/i }));

  expect(screen.getByRole('alert')).toHaveTextContent(
    /phone number is required/i,
  );
});

test('shows a normalized link with an encoded message', () => {
  renderTool();

  fireEvent.change(screen.getByLabelText(/phone number/i), {
    target: { value: '0812-3456-789' },
  });
  fireEvent.change(screen.getByLabelText(/message/i), {
    target: { value: 'Hello there & 👋' },
  });
  fireEvent.click(screen.getByRole('button', { name: /generate link/i }));

  expect(
    screen.getByDisplayValue(
      'https://wa.me/628123456789?text=Hello%20there%20%26%20%F0%9F%91%8B',
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /open whatsapp/i })).toHaveAttribute(
    'href',
    'https://wa.me/628123456789?text=Hello%20there%20%26%20%F0%9F%91%8B',
  );
});

test('clears the form and generated link with reset', () => {
  renderTool();

  fireEvent.change(screen.getByLabelText(/phone number/i), {
    target: { value: '08123456789' },
  });
  fireEvent.click(screen.getByRole('button', { name: /generate link/i }));
  fireEvent.click(screen.getByRole('button', { name: /reset/i }));

  expect(screen.getByLabelText(/phone number/i)).toHaveValue('');
  expect(
    screen.queryByDisplayValue('https://wa.me/628123456789'),
  ).not.toBeInTheDocument();
});
