import { ArrowDown, ArrowUp, X } from 'lucide-react';
import type { ImageInput } from './conversionTypes';

export default function ImageQueue({
  images,
  disabled,
  onChange,
}: {
  images: readonly ImageInput[];
  disabled: boolean;
  onChange: (images: ImageInput[]) => void;
}) {
  function move(index: number, delta: number) {
    const next = [...images];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next);
  }
  return (
    <ol className="space-y-2" aria-label="Image order">
      {images.map((image, index) => (
        <li
          key={image.id}
          className="flex items-center gap-3 rounded-box border border-base-300 p-3"
        >
          <span className="w-5 shrink-0 text-center font-mono text-xs text-base-content/60">
            {String(index + 1).padStart(2, '0')}
          </span>
          <img
            alt=""
            src={image.url}
            loading="lazy"
            decoding="async"
            className="h-12 w-14 shrink-0 rounded object-contain bg-base-200"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" title={image.file.name}>
              {image.file.name}
            </p>
            <p className="text-xs text-base-content/60">
              {image.width} × {image.height}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              className="btn btn-ghost btn-square btn-sm"
              aria-label={`Move ${image.file.name} up`}
              disabled={disabled || index === 0}
              onClick={() => move(index, -1)}
            >
              <ArrowUp size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-square btn-sm"
              aria-label={`Move ${image.file.name} down`}
              disabled={disabled || index === images.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowDown size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-square btn-sm"
              aria-label={`Remove ${image.file.name}`}
              disabled={disabled}
              onClick={() =>
                onChange(images.filter((item) => item.id !== image.id))
              }
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}
