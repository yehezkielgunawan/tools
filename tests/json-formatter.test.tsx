import { expect, test } from '@rstest/core';
import { fireEvent, render, screen } from '@testing-library/react';
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
});

test('clears the editor and status', () => {
  renderTool();

  const editor = screen.getByLabelText(/json input/i);
  fireEvent.change(editor, { target: { value: '{"active":true}' } });
  fireEvent.click(screen.getByRole('button', { name: /^clear$/i }));

  expect(editor).toHaveValue('');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
