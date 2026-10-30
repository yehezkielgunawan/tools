import type { MemeCaption } from './memeTypes';

interface CaptionControlsProps {
  captions: readonly MemeCaption[];
  activeIndex: number;
  onActivate: (index: number) => void;
  onChange: (index: number, patch: Partial<MemeCaption>) => void;
}

export default function CaptionControls({
  captions,
  activeIndex,
  onActivate,
  onChange,
}: CaptionControlsProps) {
  return (
    <div className="space-y-4">
      {captions.map((caption, index) => (
        <fieldset
          key={caption.id}
          className={`rounded-box border p-4 transition-colors ${activeIndex === index ? 'border-base-content/40 bg-base-200/50' : 'border-base-300'}`}
        >
          <legend className="px-2 text-xs font-semibold uppercase tracking-widest">
            Caption {index + 1}
          </legend>
          <label className="block">
            <span className="sr-only">Caption {index + 1} text</span>
            <textarea
              aria-label={`Caption ${index + 1} text`}
              className="textarea min-h-20 w-full resize-y"
              maxLength={500}
              onFocus={() => onActivate(index)}
              onChange={(event) =>
                onChange(index, { text: event.target.value })
              }
              placeholder={
                index === 0 ? 'Set up the joke…' : 'Land the punchline…'
              }
              value={caption.text}
            />
          </label>
          <label className="mt-3 block text-xs">
            <span className="mb-2 flex justify-between">
              <span>Caption {index + 1} text size</span>
              <span className="tabular-nums">{caption.fontScale}%</span>
            </span>
            <input
              aria-label={`Caption ${index + 1} text size`}
              className="range range-xs w-full"
              min={3}
              max={20}
              step={0.5}
              type="range"
              value={caption.fontScale}
              onChange={(event) =>
                onChange(index, { fontScale: Number(event.target.value) })
              }
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-xs">
              <input
                aria-label={`Caption ${index + 1} text color`}
                className="h-8 w-9 cursor-pointer rounded border border-base-300 p-0.5"
                type="color"
                value={caption.color}
                onChange={(event) =>
                  onChange(index, { color: event.target.value })
                }
              />
              Text
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                aria-label={`Caption ${index + 1} outline color`}
                className="h-8 w-9 cursor-pointer rounded border border-base-300 p-0.5"
                type="color"
                value={caption.outlineColor}
                onChange={(event) =>
                  onChange(index, { outlineColor: event.target.value })
                }
              />
              Outline
            </label>
          </div>
        </fieldset>
      ))}
    </div>
  );
}
