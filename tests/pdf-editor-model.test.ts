import { describe, expect, it } from '@rstest/core';
import { PDFDocument } from 'pdf-lib';
import {
  buildPageOperations,
  editHistoryReducer,
  movePdfEdit,
  normalizedPointToPdfPoint,
  type PdfEdit,
  resizePdfSignature,
} from '../src/tools/pdf-editor/editModel';
import {
  createEditedPdf,
  validatePdfCanEdit,
} from '../src/tools/pdf-editor/pdfEngine';

describe('normalizedPointToPdfPoint', () => {
  it('maps a normalized page point through the PDF viewport transform', () => {
    const viewport = {
      width: 600,
      height: 800,
      convertToPdfPoint: (x: number, y: number): [number, number] => [
        y / 2,
        400 - x / 2,
      ],
    };

    expect(normalizedPointToPdfPoint({ x: 0.25, y: 0.75 }, viewport)).toEqual({
      x: 300,
      y: 325,
    });
  });

  it('maps page corners on a rotated viewport without assuming portrait layout', () => {
    const viewport = {
      width: 800,
      height: 600,
      convertToPdfPoint: (x: number, y: number): [number, number] => [
        y,
        600 - x,
      ],
    };

    expect(normalizedPointToPdfPoint({ x: 1, y: 0 }, viewport)).toEqual({
      x: 0,
      y: -200,
    });
  });
});

describe('createEditedPdf', () => {
  it('preserves every page and writes edits into a new PDF byte stream', async () => {
    const original = await PDFDocument.create();
    original.addPage([600, 800]);
    original.addPage([800, 600]);
    const originalBytes = await original.save();
    const viewport = {
      width: 600,
      height: 800,
      convertToPdfPoint: (x: number, y: number): [number, number] => [
        x,
        800 - y,
      ],
    };
    const landscapeViewport = {
      width: 800,
      height: 600,
      convertToPdfPoint: (x: number, y: number): [number, number] => [
        x,
        600 - y,
      ],
    };

    const result = await createEditedPdf(
      originalBytes,
      [
        {
          id: 'text-1',
          pageIndex: 0,
          kind: 'text',
          x: 0.25,
          y: 0.25,
          text: 'Approved',
          fontSize: 18,
          color: '#202020',
        },
        {
          id: 'text-2',
          pageIndex: 1,
          kind: 'text',
          x: 0.25,
          y: 0.25,
          text: 'Page two',
          fontSize: 14,
          color: '#202020',
        },
      ],
      [viewport, landscapeViewport],
    );
    const reopened = await PDFDocument.load(result);

    expect(reopened.getPageCount()).toBe(2);
    expect(reopened.getPage(0).getSize()).toEqual({ width: 600, height: 800 });
    expect(reopened.getPage(1).getSize()).toEqual({ width: 800, height: 600 });
    expect(reopened.getPage(0).node.Contents()).not.toBeNull();
    expect(reopened.getPage(1).node.Contents()).not.toBeNull();
    expect(result.byteLength).toBeGreaterThan(originalBytes.byteLength);
  });

  it('preflights a locally loaded PDF with the same library used for export', async () => {
    const document = await PDFDocument.create();
    document.addPage([600, 800]);

    await expect(
      validatePdfCanEdit(await document.save()),
    ).resolves.toBeUndefined();
  });

  it('rejects a page viewport list that does not match the PDF', async () => {
    const original = await PDFDocument.create();
    original.addPage([600, 800]);

    await expect(
      createEditedPdf(await original.save(), [], []),
    ).rejects.toThrow('Page geometry is unavailable for this PDF.');
  });
});

describe('buildPageOperations', () => {
  const viewport = {
    width: 600,
    height: 800,
    convertToPdfPoint: (x: number, y: number): [number, number] => [x, 800 - y],
  };

  it('converts text baselines and pen paths into PDF coordinates', () => {
    const operations = buildPageOperations(
      [
        {
          id: 'text-1',
          pageIndex: 0,
          kind: 'text',
          x: 0.25,
          y: 0.25,
          text: 'Approved',
          fontSize: 12,
          color: '#202020',
        },
        {
          id: 'pen-1',
          pageIndex: 0,
          kind: 'pen',
          points: [
            { x: 0.1, y: 0.2 },
            { x: 0.5, y: 0.5 },
          ],
          color: '#cc0000',
          width: 3,
        },
        {
          id: 'other-page',
          pageIndex: 1,
          kind: 'text',
          x: 0,
          y: 0,
          text: 'Not on this page',
          fontSize: 12,
          color: '#202020',
        },
      ],
      0,
      viewport,
    );

    expect(operations).toEqual([
      {
        kind: 'text',
        text: 'Approved',
        x: 150,
        y: 588,
        fontSize: 12,
        color: '#202020',
        rotateDegrees: 0,
      },
      {
        kind: 'line',
        start: { x: 60, y: 640 },
        end: { x: 300, y: 400 },
        color: '#cc0000',
        width: 3,
      },
    ]);
  });

  it('expands a positioned signature into PDF-space stroke segments', () => {
    const operations = buildPageOperations(
      [
        {
          id: 'signature-1',
          pageIndex: 0,
          kind: 'signature',
          x: 0.5,
          y: 0.5,
          width: 0.25,
          height: 0.1,
          strokes: [
            [
              { x: 0, y: 0.5 },
              { x: 1, y: 0.5 },
            ],
          ],
          color: '#111111',
          strokeWidth: 2,
        },
      ],
      0,
      viewport,
    );

    expect(operations).toEqual([
      {
        kind: 'line',
        start: { x: 300, y: 360 },
        end: { x: 450, y: 360 },
        color: '#111111',
        width: 2,
      },
    ]);
  });
});

describe('editHistoryReducer', () => {
  const textEdit: PdfEdit = {
    id: 'text-1',
    pageIndex: 0,
    kind: 'text',
    x: 0.2,
    y: 0.3,
    text: 'Approved',
    fontSize: 18,
    color: '#202020',
  };

  const penEdit: PdfEdit = {
    id: 'pen-1',
    pageIndex: 1,
    kind: 'pen',
    points: [
      { x: 0.1, y: 0.2 },
      { x: 0.4, y: 0.5 },
    ],
    color: '#202020',
    width: 2,
  };

  it('undoes and redoes edits across pages', () => {
    const initial = { past: [], edits: [], future: [] };
    const withText = editHistoryReducer(initial, {
      type: 'replace',
      edits: [textEdit],
    });
    const withPen = editHistoryReducer(withText, {
      type: 'replace',
      edits: [textEdit, penEdit],
    });

    const undone = editHistoryReducer(withPen, { type: 'undo' });
    expect(undone.edits).toEqual([textEdit]);

    const redone = editHistoryReducer(undone, { type: 'redo' });
    expect(redone.edits).toEqual([textEdit, penEdit]);
  });

  it('clears the redo stack when a new edit follows undo', () => {
    const withText = editHistoryReducer(
      { past: [], edits: [], future: [] },
      { type: 'replace', edits: [textEdit] },
    );
    const undone = editHistoryReducer(withText, { type: 'undo' });
    const withPen = editHistoryReducer(undone, {
      type: 'replace',
      edits: [penEdit],
    });

    expect(withPen.edits).toEqual([penEdit]);
    expect(withPen.future).toEqual([]);
    expect(editHistoryReducer(withPen, { type: 'redo' })).toEqual(withPen);
  });

  it('resets history when a new PDF is opened', () => {
    const withText = editHistoryReducer(
      { past: [], edits: [], future: [] },
      { type: 'replace', edits: [textEdit] },
    );

    expect(editHistoryReducer(withText, { type: 'reset' })).toEqual({
      past: [],
      edits: [],
      future: [],
    });
  });
});

describe('movePdfEdit', () => {
  it('moves text, freehand, and signature edits without mutating their originals', () => {
    const text: PdfEdit = {
      id: 'text-1',
      pageIndex: 0,
      kind: 'text',
      x: 0.2,
      y: 0.3,
      text: 'Note',
      fontSize: 16,
      color: '#000000',
    };
    const pen: PdfEdit = {
      id: 'pen-1',
      pageIndex: 0,
      kind: 'pen',
      points: [
        { x: 0.1, y: 0.2 },
        { x: 0.2, y: 0.4 },
      ],
      color: '#000000',
      width: 2,
    };

    expect(movePdfEdit(text, 0.1, -0.1)).toMatchObject({ x: 0.3, y: 0.2 });
    expect(movePdfEdit(pen, 0.1, -0.1)).toMatchObject({
      points: [
        { x: 0.2, y: 0.1 },
        { x: 0.3, y: 0.3 },
      ],
    });
    expect(text).toMatchObject({ x: 0.2, y: 0.3 });
  });

  it('keeps a signature placement within the page bounds', () => {
    const signature: PdfEdit = {
      id: 'signature-1',
      pageIndex: 0,
      kind: 'signature',
      x: 0.6,
      y: 0.6,
      width: 0.3,
      height: 0.2,
      strokes: [
        [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      ],
      color: '#000000',
      strokeWidth: 2,
    };

    expect(movePdfEdit(signature, 0.4, 0.4)).toMatchObject({ x: 0.7, y: 0.8 });
  });
});

describe('resizePdfSignature', () => {
  it('resizes a signature while keeping its origin and page bounds fixed', () => {
    const signature: PdfEdit = {
      id: 'signature-1',
      pageIndex: 0,
      kind: 'signature',
      x: 0.6,
      y: 0.5,
      width: 0.3,
      height: 0.2,
      strokes: [
        [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      ],
      color: '#000000',
      strokeWidth: 2,
    };

    expect(resizePdfSignature(signature, 0.2, 0.2)).toMatchObject({
      x: 0.6,
      y: 0.5,
      width: 0.4,
      height: 0.4,
    });
    expect(resizePdfSignature(signature, 1, 1)).toMatchObject({
      width: 0.4,
      height: 0.5,
    });
  });
});
