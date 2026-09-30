import { expect, test } from '@rstest/core';
import { fireEvent, render, screen } from '@testing-library/react';
import type {
  NormalizedPoint,
  PdfEdit,
} from '../src/tools/pdf-editor/editModel';
import PdfKeyboardControls from '../src/tools/pdf-editor/PdfKeyboardControls';

test('places text, a typed signature, and a line with numeric page coordinates', () => {
  const created: string[] = [];
  render(
    <PdfKeyboardControls
      edits={[]}
      selectedEditId={null}
      onAddText={(text, point) =>
        created.push(`text:${text}:${point.x}:${point.y}`)
      }
      onAddSignature={(name, point) =>
        created.push(`signature:${name}:${point.x}:${point.y}`)
      }
      onAddLine={(start, end) =>
        created.push(`line:${start.x}:${start.y}:${end.x}:${end.y}`)
      }
      onSelect={() => undefined}
      onMove={() => undefined}
      onResize={() => undefined}
      onDelete={() => undefined}
    />,
  );
  fireEvent.change(
    screen.getByRole('spinbutton', { name: 'Horizontal position (%)' }),
    { target: { value: '25' } },
  );
  fireEvent.change(
    screen.getByRole('spinbutton', { name: 'Vertical position (%)' }),
    { target: { value: '40' } },
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'Text to add' }), {
    target: { value: 'Approved' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add text at position' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Typed signature' }), {
    target: { value: 'Ada' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Add typed signature at position' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Add straight line' }));
  expect(created).toEqual([
    'text:Approved:0.25:0.4',
    'signature:Ada:0.25:0.4',
    'line:0.25:0.4:0.8:0.8',
  ]);
});

test('selects, moves, resizes, and deletes existing edits without using the canvas', () => {
  const edits: PdfEdit[] = [
    {
      id: 'sig-1',
      kind: 'signature',
      pageIndex: 0,
      x: 0.2,
      y: 0.3,
      width: 0.3,
      height: 0.1,
      strokes: [],
      color: '#000000',
      strokeWidth: 2,
    },
  ];
  const calls: string[] = [];
  const { rerender } = render(
    <PdfKeyboardControls
      edits={edits}
      selectedEditId={null}
      onAddText={() => undefined}
      onAddSignature={() => undefined}
      onAddLine={() => undefined}
      onSelect={(id) => calls.push(`select:${id}`)}
      onMove={(_edit, delta: NormalizedPoint) =>
        calls.push(`move:${delta.x}:${delta.y}`)
      }
      onResize={(_edit, delta: NormalizedPoint) =>
        calls.push(`resize:${delta.x}:${delta.y}`)
      }
      onDelete={() => calls.push('delete')}
    />,
  );
  fireEvent.change(
    screen.getByRole('combobox', { name: 'Edit on this page' }),
    { target: { value: 'sig-1' } },
  );
  rerender(
    <PdfKeyboardControls
      edits={edits}
      selectedEditId="sig-1"
      onAddText={() => undefined}
      onAddSignature={() => undefined}
      onAddLine={() => undefined}
      onSelect={() => undefined}
      onMove={(_edit, delta) => calls.push(`move:${delta.x}:${delta.y}`)}
      onResize={(_edit, delta) => calls.push(`resize:${delta.x}:${delta.y}`)}
      onDelete={() => calls.push('delete')}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Move right 1%' }));
  expect(screen.getByRole('status')).toHaveTextContent('20% from left');
  fireEvent.click(
    screen.getByRole('button', { name: 'Increase signature width 1%' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Delete selected edit' }));
  expect(calls).toEqual([
    'select:sig-1',
    'move:0.01:0',
    'resize:0.01:0',
    'delete',
  ]);
});
