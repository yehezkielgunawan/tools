import { SPIN_DURATION_MS, type SpinnerEntry } from './spinnerModel';

interface SpinnerWheelProps {
  entries: readonly SpinnerEntry[];
  rotation: number;
  spinning: boolean;
  onFinish: () => void;
}

// Paired semantic chart colors keep segment labels legible in either theme.
const palette = [
  'secondary',
  'info',
  'accent',
  'warning',
  'success',
  'error',
] as const;

function point(angle: number, radius: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return [200 + radius * Math.cos(radians), 200 + radius * Math.sin(radians)];
}

export default function SpinnerWheel({
  entries,
  rotation,
  spinning,
  onFinish,
}: SpinnerWheelProps) {
  const count = entries.length;
  const segmentAngle = 360 / (count || 6);
  const segments = count
    ? entries
    : Array.from({ length: 6 }, (_, lineIndex) => ({ label: '', lineIndex }));

  return (
    <div
      aria-hidden="true"
      className="relative mx-auto aspect-square w-full max-w-96 p-4"
    >
      <div className="absolute inset-1 rounded-full border border-dashed border-base-content/20" />
      <div className="absolute inset-4 rounded-full border-8 border-base-100 shadow-xl" />
      <div
        className="relative h-full w-full rounded-full"
        onTransitionEnd={(event) => {
          if (
            event.target === event.currentTarget &&
            event.propertyName === 'transform'
          )
            onFinish();
        }}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning
            ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.75, 0.12, 1)`
            : 'none',
        }}
      >
        <svg
          aria-hidden="true"
          className="h-full w-full overflow-visible"
          viewBox="0 0 400 400"
          focusable="false"
        >
          {segments.map((entry, index) => {
            const start = point(index * segmentAngle, 194);
            const end = point((index + 1) * segmentAngle, 194);
            const middle = (index + 0.5) * segmentAngle;
            const color = palette[index % palette.length];
            const characters = Array.from(entry.label);
            const label =
              characters.length > 16
                ? `${characters.slice(0, 15).join('')}…`
                : entry.label;
            return (
              <g key={entry.lineIndex}>
                <path
                  d={`M 200 200 L ${start[0]} ${start[1]} A 194 194 0 ${segmentAngle > 180 ? 1 : 0} 1 ${end[0]} ${end[1]} Z`}
                  fill={`var(--color-${color})`}
                  stroke="var(--color-base-100)"
                  strokeWidth={count > 30 ? 1 : 2}
                  opacity={count ? 1 : 0.3}
                />
                {count <= 24 && label ? (
                  <text
                    transform={`rotate(${middle - 90} 200 200)`}
                    x="375"
                    y="200"
                    dy="0.35em"
                    textAnchor="end"
                    fill={`var(--color-${color}-content)`}
                    fontSize={count > 12 ? 10 : 13}
                    fontWeight="650"
                  >
                    {label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="absolute top-1 left-1/2 -translate-x-1/2 drop-shadow-md">
        <svg
          aria-hidden="true"
          width="32"
          height="42"
          viewBox="0 0 32 42"
          focusable="false"
        >
          <path
            d="M 2 2 H 30 L 16 38 Z"
            fill="var(--color-base-content)"
            stroke="var(--color-base-100)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="absolute top-1/2 left-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-base-100 bg-base-content text-base-100 shadow-lg">
        <span className="text-xl font-black">{count || '?'}</span>
      </div>
    </div>
  );
}
