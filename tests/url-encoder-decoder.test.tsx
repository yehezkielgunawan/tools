import { expect, test } from '@rstest/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import UrlEncoderDecoder from '../src/tools/url-encoder-decoder/UrlEncoderDecoder';

function renderTool() {
  render(
    <MemoryRouter>
      <UrlEncoderDecoder />
    </MemoryRouter>,
  );
}

test('defaults to component encoding and reuses output to decode', () => {
  renderTool();
  fireEvent.change(screen.getByLabelText('URL or text input'), {
    target: { value: 'a+b 👋' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Encode' }));
  expect(screen.getByLabelText('Result')).toHaveValue('a%2Bb%20%F0%9F%91%8B');
  fireEvent.click(screen.getByRole('button', { name: 'Use output as input' }));
  fireEvent.click(screen.getByRole('button', { name: 'Decode' }));
  expect(screen.getByLabelText('Result')).toHaveValue('a+b 👋');
});

test('whole-URL encoding preserves separators and changing mode or input clears results', () => {
  renderTool();
  fireEvent.change(screen.getByLabelText('URL or text input'), {
    target: { value: 'https://example.com/?a=hello world' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Encode' }));
  fireEvent.change(screen.getByLabelText('Encoding mode'), {
    target: { value: 'whole-url' },
  });
  expect(screen.getByLabelText('Result')).toHaveValue('');
  fireEvent.click(screen.getByRole('button', { name: 'Encode' }));
  expect(screen.getByLabelText('Result')).toHaveValue(
    'https://example.com/?a=hello%20world',
  );
  fireEvent.change(screen.getByLabelText('URL or text input'), {
    target: { value: '%' },
  });
  expect(screen.getByLabelText('Result')).toHaveValue('');
  fireEvent.click(screen.getByRole('button', { name: 'Decode' }));
  expect(screen.getByRole('alert')).toHaveTextContent(/percent/i);
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(screen.getByLabelText('URL or text input')).toHaveValue('');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Copy output' })).toBeDisabled();
});
