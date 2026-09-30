import { useState } from 'react';
import type { NormalizedPoint, PdfEdit } from './editModel';

interface PdfKeyboardControlsProps {
  edits: readonly PdfEdit[];
  selectedEditId: string | null;
  onAddText: (text: string, point: NormalizedPoint) => void;
  onAddSignature: (name: string, point: NormalizedPoint) => void;
  onAddLine: (start: NormalizedPoint, end: NormalizedPoint) => void;
  onSelect: (id: string | null) => void;
  onMove: (edit: PdfEdit, delta: NormalizedPoint) => void;
  onResize: (
    edit: Extract<PdfEdit, { kind: 'signature' }>,
    delta: NormalizedPoint,
  ) => void;
  onDelete: () => void;
}

const point = (x: number, y: number): NormalizedPoint => ({
  x: Math.min(100, Math.max(0, x || 0)) / 100,
  y: Math.min(100, Math.max(0, y || 0)) / 100,
});

export default function PdfKeyboardControls({
  edits,
  selectedEditId,
  onAddText,
  onAddSignature,
  onAddLine,
  onSelect,
  onMove,
  onResize,
  onDelete,
}: PdfKeyboardControlsProps) {
  const [x, setX] = useState(20);
  const [y, setY] = useState(20);
  const [endX, setEndX] = useState(80);
  const [endY, setEndY] = useState(80);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const selected = edits.find((edit) => edit.id === selectedEditId);
  const selectedPosition =
    selected?.kind === 'pen' ? selected.points[0] : selected;
  const directions = [
    ['left', -0.01, 0],
    ['right', 0.01, 0],
    ['up', 0, -0.01],
    ['down', 0, 0.01],
  ] as const;

  return (
    <section
      aria-labelledby="pdf-keyboard-heading"
      className="space-y-4 rounded-box border border-base-300 p-4"
    >
      <div>
        <h2 className="text-base font-semibold" id="pdf-keyboard-heading">
          Edit without dragging
        </h2>
        <p className="text-sm text-base-content/75">
          Positions are percentages of the current page, measured from the top
          left. Select an edit below to move, resize, or delete it.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm" htmlFor="pdf-position-x">
          Horizontal position (%)
          <input
            className="input w-full"
            id="pdf-position-x"
            max="100"
            min="0"
            onChange={(event) => setX(Number(event.target.value))}
            type="number"
            value={x}
          />
        </label>
        <label className="block text-sm" htmlFor="pdf-position-y">
          Vertical position (%)
          <input
            className="input w-full"
            id="pdf-position-y"
            max="100"
            min="0"
            onChange={(event) => setY(Number(event.target.value))}
            type="number"
            value={y}
          />
        </label>
        <label className="block text-sm" htmlFor="pdf-keyboard-text">
          Text to add
          <input
            className="input w-full"
            id="pdf-keyboard-text"
            onChange={(event) => setText(event.target.value)}
            type="text"
            value={text}
          />
        </label>
        <label className="block text-sm" htmlFor="pdf-typed-signature">
          Typed signature
          <input
            className="input w-full"
            id="pdf-typed-signature"
            onChange={(event) => setName(event.target.value)}
            type="text"
            value={name}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="btn btn-sm"
          disabled={!text.trim()}
          onClick={() => onAddText(text, point(x, y))}
          type="button"
        >
          Add text at position
        </button>
        <button
          className="btn btn-sm"
          disabled={!name.trim()}
          onClick={() => onAddSignature(name, point(x, y))}
          type="button"
        >
          Add typed signature at position
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm" htmlFor="pdf-line-end-x">
          Line end horizontal (%)
          <input
            className="input input-sm block w-28"
            id="pdf-line-end-x"
            max="100"
            min="0"
            onChange={(event) => setEndX(Number(event.target.value))}
            type="number"
            value={endX}
          />
        </label>
        <label className="text-sm" htmlFor="pdf-line-end-y">
          Line end vertical (%)
          <input
            className="input input-sm block w-28"
            id="pdf-line-end-y"
            max="100"
            min="0"
            onChange={(event) => setEndY(Number(event.target.value))}
            type="number"
            value={endY}
          />
        </label>
        <button
          className="btn btn-sm"
          onClick={() => onAddLine(point(x, y), point(endX, endY))}
          type="button"
        >
          Add straight line
        </button>
      </div>
      <div className="space-y-3 border-t border-base-300 pt-4">
        <label className="block text-sm" htmlFor="pdf-edit-list">
          Edit on this page
          <select
            className="select mt-1 w-full"
            id="pdf-edit-list"
            onChange={(event) => onSelect(event.target.value || null)}
            value={selectedEditId ?? ''}
          >
            <option value="">Choose an edit</option>
            {edits.map((edit, index) => (
              <option key={edit.id} value={edit.id}>
                {index + 1}.{' '}
                {edit.kind === 'text'
                  ? `Text: ${edit.text}`
                  : edit.kind === 'pen'
                    ? 'Pen stroke or line'
                    : 'Drawn signature'}
              </option>
            ))}
          </select>
        </label>
        {selected ? (
          <div className="space-y-3">
            <p className="text-sm text-base-content/75" role="status">
              {selectedPosition
                ? `${Math.round(selectedPosition.x * 100)}% from left, ${Math.round(selectedPosition.y * 100)}% from top${selected.kind === 'signature' ? `; width ${Math.round(selected.width * 100)}%, height ${Math.round(selected.height * 100)}%` : ''}`
                : 'No position available'}
            </p>
            <div className="flex flex-wrap gap-2">
              {directions.map(([direction, dx, dy]) => (
                <button
                  className="btn btn-sm"
                  key={direction}
                  onClick={() => onMove(selected, { x: dx, y: dy })}
                  type="button"
                >
                  Move {direction} 1%
                </button>
              ))}
            </div>
            {selected.kind === 'signature' ? (
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn btn-sm"
                  onClick={() => onResize(selected, { x: 0.01, y: 0 })}
                  type="button"
                >
                  Increase signature width 1%
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => onResize(selected, { x: -0.01, y: 0 })}
                  type="button"
                >
                  Decrease signature width 1%
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => onResize(selected, { x: 0, y: 0.01 })}
                  type="button"
                >
                  Increase signature height 1%
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => onResize(selected, { x: 0, y: -0.01 })}
                  type="button"
                >
                  Decrease signature height 1%
                </button>
              </div>
            ) : null}
            <button
              className="btn btn-sm btn-error"
              onClick={onDelete}
              type="button"
            >
              Delete selected edit
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
