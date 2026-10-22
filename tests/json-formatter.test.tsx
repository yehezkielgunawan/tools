import { expect, test } from '@rstest/core';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import JsonFormatter from '../src/tools/json-formatter/JsonFormatter';

function renderTool(): void {
  render(
    <MemoryRouter>
      <JsonFormatter />
    </MemoryRouter>,
  );
}

test('formats valid JSON in the single editor', () => {
  renderTool();

  const editor = screen.getByLabelText(/json input/i);
  fireEvent.change(editor, { target: { value: '{"name":"Yehezgun"}' } });
  fireEvent.click(screen.getByRole('button', { name: /^format$/i }));

  expect(editor).toHaveValue('{\n  "name": "Yehezgun"\n}');
  expect(screen.getByRole('status')).toHaveTextContent(/formatted/i);
});

test('minifies valid JSON in the single editor', () => {
  renderTool();

  const editor = screen.getByLabelText(/json input/i);
  fireEvent.change(editor, { target: { value: '{\n  "active": true\n}' } });
  fireEvent.click(screen.getByRole('button', { name: /^minify$/i }));

  expect(editor).toHaveValue('{"active":true}');
});

test('keeps invalid JSON unchanged and reports the parsing error', () => {
  renderTool();

  const editor = screen.getByLabelText(/json input/i);
  fireEvent.change(editor, { target: { value: '{"active": }' } });
  fireEvent.click(screen.getByRole('button', { name: /^validate$/i }));

  expect(editor).toHaveValue('{"active": }');
  expect(screen.getByRole('alert')).toHaveTextContent(/invalid json/i);
  expect(editor).toHaveAttribute('aria-invalid', 'true');
  expect(editor).toHaveAttribute('aria-describedby', 'json-status');
});

test('clears the editor and status', () => {
  renderTool();

  const editor = screen.getByLabelText(/json input/i);
  fireEvent.change(editor, { target: { value: '{"active":true}' } });
  fireEvent.click(screen.getByRole('button', { name: /^clear$/i }));

  expect(editor).toHaveValue('');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('previews nested JSON and expands and collapses collections', () => {
  renderTool();
  fireEvent.change(screen.getByLabelText(/json input/i), {
    target: {
      value: '{"user":{"name":"Ada","roles":["admin"]},"active":true}',
    },
  });
  expect(
    screen.getByRole('region', { name: 'JSON tree preview' }),
  ).toBeInTheDocument();
  expect(screen.queryByText('"Ada"')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /"user".*object.*2/i }));
  expect(screen.getByText('"Ada"')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));
  expect(screen.getByText('"admin"')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
  expect(screen.queryByText('"Ada"')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /root.*object/i })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});

test('updates the preview and removes stale content on invalid or empty input', () => {
  renderTool();
  const input = screen.getByLabelText(/json input/i);
  const preview = within(
    screen.getByRole('region', { name: 'JSON tree preview' }),
  );
  fireEvent.change(input, {
    target: { value: '"<img src=x onerror=alert(1)>"' },
  });
  expect(
    preview.getByText('"<img src=x onerror=alert(1)>"'),
  ).toBeInTheDocument();
  expect(document.querySelector('img')).toBeNull();
  fireEvent.change(input, { target: { value: 'false' } });
  expect(preview.getByText('false')).toBeInTheDocument();
  fireEvent.change(input, { target: { value: '{broken' } });
  expect(screen.queryByText('false')).not.toBeInTheDocument();
  expect(screen.getByText(/enter valid json to explore/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^clear$/i }));
  expect(screen.getByText(/enter json to see/i)).toBeInTheDocument();
});

test('reports limited previews without preventing formatting', () => {
  renderTool();
  fireEvent.change(screen.getByLabelText(/json input/i), {
    target: {
      value: JSON.stringify(Array.from({ length: 2500 }, (_, i) => i)),
    },
  });
  expect(screen.getByText(/preview is limited/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^format$/i }));
  expect(screen.getByRole('status')).toHaveTextContent('JSON formatted.');
});

test('does not present depth-limited collections as empty', () => {
  renderTool();
  const deep = `${'['.repeat(52)}0${']'.repeat(52)}`;
  fireEvent.change(screen.getByLabelText(/json input/i), {
    target: { value: deep },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));
  expect(screen.getByText('[…]')).toBeInTheDocument();
});
