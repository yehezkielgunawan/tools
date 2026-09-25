import { expect, it } from '@rstest/core';
import { fireEvent, render, screen } from '@testing-library/react';
import type { NormalizedPoint } from '../src/tools/pdf-editor/editModel';
import SignaturePad from '../src/tools/pdf-editor/SignaturePad';

it('passes a completed signature stroke to the placement callback', () => {
  const applied: NormalizedPoint[][][] = [];
  render(
    <SignaturePad
      color="#202124"
      onApply={(strokes) => applied.push(strokes)}
      onClose={() => undefined}
    />,
  );

  const canvas = screen.getByLabelText('Draw signature in this area');
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    value: () => ({ left: 10, top: 20, width: 720, height: 220 }),
  });

  fireEvent.pointerDown(canvas, {
    pointerId: 1,
    clientX: 80,
    clientY: 55,
  });
  fireEvent.pointerMove(canvas, {
    pointerId: 1,
    clientX: 370,
    clientY: 120,
  });
  fireEvent.pointerUp(canvas, {
    pointerId: 1,
    clientX: 370,
    clientY: 120,
  });
  fireEvent.click(screen.getByRole('button', { name: 'Use signature' }));

  expect(applied).toHaveLength(1);
  expect(applied[0]).toHaveLength(1);
  expect(applied[0]?.[0]).toHaveLength(2);
  expect(applied[0]?.[0]?.[0]).toMatchObject({
    x: (80 - 10) / 720,
    y: (55 - 20) / 220,
  });
  expect(applied[0]?.[0]?.[1]).toMatchObject({
    x: (370 - 10) / 720,
    y: (120 - 20) / 220,
  });
});
