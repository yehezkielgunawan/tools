import { expect, test } from '@rstest/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import JsonYamlConverter from '../src/tools/json-yaml/JsonYamlConverter';

function renderTool() {
  render(
    <MemoryRouter>
      <JsonYamlConverter />
    </MemoryRouter>,
  );
}

test('converts JSON to YAML and uses the result for reverse conversion', () => {
  renderTool();
  fireEvent.change(screen.getByLabelText('JSON input'), {
    target: { value: '{"active":true}' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Convert' }));
  expect(screen.getByLabelText('YAML output')).toHaveValue('active: true\n');
  expect(screen.getByRole('button', { name: 'Copy output' })).toBeEnabled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Use output as reverse input' }),
  );
  expect(screen.getByLabelText('YAML input')).toHaveValue('active: true\n');
  fireEvent.click(screen.getByRole('button', { name: 'Convert' }));
  expect(screen.getByLabelText('JSON output')).toHaveValue(
    '{\n  "active": true\n}',
  );
});

test('invalidates stale output on input or direction changes and clears everything', () => {
  renderTool();
  const input = screen.getByLabelText('JSON input');
  fireEvent.change(input, { target: { value: 'null' } });
  fireEvent.click(screen.getByRole('button', { name: 'Convert' }));
  fireEvent.change(input, { target: { value: '{broken' } });
  expect(screen.getByLabelText('YAML output')).toHaveValue('');
  fireEvent.click(screen.getByRole('button', { name: 'Convert' }));
  expect(screen.getByRole('alert')).toHaveTextContent(
    /unable to convert json/i,
  );
  expect(input).toHaveAttribute('aria-invalid', 'true');
  fireEvent.change(screen.getByLabelText('Conversion direction'), {
    target: { value: 'yaml-to-json' },
  });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByLabelText('JSON output')).toHaveValue('');
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(screen.getByLabelText('YAML input')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Copy output' })).toBeDisabled();
});

test('copies the current output and resets copied feedback when the result changes', async () => {
  let copied = '';
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: async (value: string) => {
        copied = value;
      },
    },
  });
  renderTool();
  fireEvent.change(screen.getByLabelText('JSON input'), {
    target: { value: '{"active":true}' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Convert' }));
  fireEvent.click(screen.getByRole('button', { name: 'Copy output' }));
  expect(
    await screen.findByRole('button', { name: 'Copied' }),
  ).toBeInTheDocument();
  expect(copied).toBe('active: true\n');
  fireEvent.click(
    screen.getByRole('button', { name: 'Use output as reverse input' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Convert' }));
  expect(screen.getByRole('button', { name: 'Copy output' })).toBeEnabled();
});
