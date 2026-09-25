export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface PdfViewportTransform {
  width: number;
  height: number;
  convertToPdfPoint: (x: number, y: number) => number[];
}

export interface PdfTextEdit {
  id: string;
  pageIndex: number;
  kind: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
}

export interface PdfPenEdit {
  id: string;
  pageIndex: number;
  kind: 'pen';
  points: NormalizedPoint[];
  color: string;
  width: number;
}

export interface PdfSignatureEdit {
  id: string;
  pageIndex: number;
  kind: 'signature';
  x: number;
  y: number;
  width: number;
  height: number;
  strokes: NormalizedPoint[][];
  color: string;
  strokeWidth: number;
}

export type PdfEdit = PdfTextEdit | PdfPenEdit | PdfSignatureEdit;

export interface EditHistoryState {
  past: PdfEdit[][];
  edits: PdfEdit[];
  future: PdfEdit[][];
}

export type EditHistoryAction =
  | { type: 'replace'; edits: PdfEdit[] }
  | { type: 'reset' }
  | { type: 'undo' }
  | { type: 'redo' };

const MAX_HISTORY_STEPS = 100;

function roundCoordinate(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface PdfTextOperation {
  kind: 'text';
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  rotateDegrees: number;
}

export interface PdfLineOperation {
  kind: 'line';
  start: NormalizedPoint;
  end: NormalizedPoint;
  color: string;
  width: number;
}

export type PdfPageOperation = PdfTextOperation | PdfLineOperation;

export function normalizedPointToPdfPoint(
  point: NormalizedPoint,
  viewport: PdfViewportTransform,
): NormalizedPoint {
  if (
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    !Number.isFinite(viewport.width) ||
    !Number.isFinite(viewport.height) ||
    viewport.width <= 0 ||
    viewport.height <= 0
  ) {
    throw new RangeError('PDF page coordinates must be finite and non-zero.');
  }

  const [x, y] = viewport.convertToPdfPoint(
    point.x * viewport.width,
    point.y * viewport.height,
  );
  return {
    x: Math.round(x * 100_000) / 100_000,
    y: Math.round(y * 100_000) / 100_000,
  };
}

export function buildPageOperations(
  edits: readonly PdfEdit[],
  pageIndex: number,
  viewport: PdfViewportTransform,
): PdfPageOperation[] {
  const operations: PdfPageOperation[] = [];

  for (const edit of edits) {
    if (edit.pageIndex !== pageIndex) continue;

    if (edit.kind === 'text') {
      const baseline = normalizedPointToPdfPoint(
        { x: edit.x, y: edit.y + edit.fontSize / viewport.height },
        viewport,
      );
      const baselineRight = normalizedPointToPdfPoint(
        {
          x: edit.x + 1 / viewport.width,
          y: edit.y + edit.fontSize / viewport.height,
        },
        viewport,
      );

      operations.push({
        kind: 'text',
        text: edit.text,
        ...baseline,
        fontSize: edit.fontSize,
        color: edit.color,
        rotateDegrees:
          (Math.atan2(
            baselineRight.y - baseline.y,
            baselineRight.x - baseline.x,
          ) *
            180) /
          Math.PI,
      });
      continue;
    }

    const paths =
      edit.kind === 'pen'
        ? [edit.points]
        : edit.strokes.map((stroke) =>
            stroke.map((point) => ({
              x: edit.x + point.x * edit.width,
              y: edit.y + point.y * edit.height,
            })),
          );
    const color = edit.color;
    const width = edit.kind === 'pen' ? edit.width : edit.strokeWidth;

    for (const path of paths) {
      for (let index = 1; index < path.length; index += 1) {
        operations.push({
          kind: 'line',
          start: normalizedPointToPdfPoint(path[index - 1], viewport),
          end: normalizedPointToPdfPoint(path[index], viewport),
          color,
          width,
        });
      }
    }
  }

  return operations;
}

export function movePdfEdit(
  edit: PdfEdit,
  deltaX: number,
  deltaY: number,
): PdfEdit {
  if (edit.kind === 'text') {
    return {
      ...edit,
      x: roundCoordinate(clamp(edit.x + deltaX, 0, 1)),
      y: roundCoordinate(clamp(edit.y + deltaY, 0, 1)),
    };
  }

  if (edit.kind === 'signature') {
    return {
      ...edit,
      x: roundCoordinate(clamp(edit.x + deltaX, 0, 1 - edit.width)),
      y: roundCoordinate(clamp(edit.y + deltaY, 0, 1 - edit.height)),
    };
  }

  if (edit.points.length === 0) return edit;
  const xs = edit.points.map((point) => point.x);
  const ys = edit.points.map((point) => point.y);
  const boundedDeltaX = clamp(deltaX, -Math.min(...xs), 1 - Math.max(...xs));
  const boundedDeltaY = clamp(deltaY, -Math.min(...ys), 1 - Math.max(...ys));

  return {
    ...edit,
    points: edit.points.map((point) => ({
      x: roundCoordinate(point.x + boundedDeltaX),
      y: roundCoordinate(point.y + boundedDeltaY),
    })),
  };
}

export function resizePdfSignature(
  edit: PdfSignatureEdit,
  deltaX: number,
  deltaY: number,
): PdfSignatureEdit {
  return {
    ...edit,
    width: roundCoordinate(clamp(edit.width + deltaX, 0.05, 1 - edit.x)),
    height: roundCoordinate(clamp(edit.height + deltaY, 0.05, 1 - edit.y)),
  };
}

export function editHistoryReducer(
  state: EditHistoryState,
  action: EditHistoryAction,
): EditHistoryState {
  if (action.type === 'reset') {
    return { past: [], edits: [], future: [] };
  }

  if (action.type === 'replace') {
    if (action.edits === state.edits) return state;

    return {
      past: [...state.past, state.edits].slice(-MAX_HISTORY_STEPS),
      edits: action.edits,
      future: [],
    };
  }

  if (action.type === 'undo') {
    const previous = state.past[state.past.length - 1];
    if (!previous) return state;

    return {
      past: state.past.slice(0, -1),
      edits: previous,
      future: [state.edits, ...state.future],
    };
  }

  const next = state.future[0];
  if (!next) return state;

  return {
    past: [...state.past, state.edits].slice(-MAX_HISTORY_STEPS),
    edits: next,
    future: state.future.slice(1),
  };
}
