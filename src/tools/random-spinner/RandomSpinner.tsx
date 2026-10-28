import { ArrowUpRight, RotateCcw, Sparkles, Trash2, X } from 'lucide-react';
import ToolLayout from '../../components/layout/ToolLayout';
import SpinnerWheel from './SpinnerWheel';
import { useSpinner } from './useSpinner';

export default function RandomSpinner() {
  const spinner = useSpinner();
  const { entries, error: validationError } = spinner.parsed;
  const hasDraft = spinner.text.trim().length > 0;

  return (
    <ToolLayout
      category="Generator"
      title="Random Spinner Wheel"
      description="Names, lunch plans, or your next big idea. Add your choices and let the wheel decide."
      privacyNote="Runs locally in your browser. Entries are saved on this device when browser storage is available; your choices are not uploaded."
    >
      <div className="grid min-w-0 gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <div className="flex min-w-0 flex-col items-center justify-center rounded-box bg-base-200/60 px-3 py-6 sm:px-6">
          <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-base-content/60 uppercase">
            A little chance. A clear choice.
          </p>
          <SpinnerWheel
            entries={validationError ? [] : entries}
            rotation={spinner.rotation}
            spinning={spinner.spinning}
            onFinish={spinner.finish}
          />
          <button
            className="btn btn-primary btn-lg mt-6 w-full max-w-64 rounded-full"
            disabled={Boolean(validationError) || spinner.spinning}
            onClick={spinner.spin}
            type="button"
          >
            <Sparkles aria-hidden="true" size={19} />
            {spinner.spinning ? 'Spinning…' : 'Spin'}
          </button>
          <div
            aria-label="Spin result"
            aria-atomic="true"
            className="mt-5 w-full min-w-0 text-center"
            role="status"
          >
            {spinner.spinning ? (
              <p className="text-sm text-base-content/65">
                Spinning… let chance do its thing.
              </p>
            ) : spinner.winner ? (
              <>
                <p className="text-xs font-semibold tracking-[0.18em] text-base-content/60 uppercase">
                  The wheel picked
                </p>
                <p className="mt-2 text-2xl font-bold wrap-anywhere">
                  {spinner.winner.label}
                </p>
              </>
            ) : (
              <p className="text-sm text-base-content/65">
                {validationError
                  ? 'Add your choices to get started.'
                  : 'Everyone gets an equal slice.'}
              </p>
            )}
          </div>
          {spinner.winner ? (
            <button
              className="btn btn-sm btn-ghost mt-3"
              onClick={spinner.removeWinner}
              type="button"
            >
              <X aria-hidden="true" size={15} /> Remove winning entry
            </button>
          ) : null}
          {spinner.error ? (
            <p className="mt-4 text-sm text-error" role="alert">
              {spinner.error}
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <label
              className="text-base font-semibold"
              htmlFor="spinner-entries"
            >
              Entries
            </label>
            <span className="text-xs text-base-content/60">
              {entries.length} / 100
            </span>
          </div>
          <textarea
            aria-describedby="spinner-entry-help spinner-entry-error"
            aria-invalid={hasDraft && Boolean(validationError)}
            className="textarea w-full resize-y bg-base-100 text-base leading-7"
            disabled={spinner.spinning}
            id="spinner-entries"
            onChange={(event) =>
              spinner.updateEntries(event.currentTarget.value)
            }
            placeholder={'Pizza\nSushi\nTacos\nSomething new'}
            rows={8}
            spellCheck={false}
            value={spinner.text}
          />
          <p
            className="mt-2 text-xs leading-5 text-base-content/65"
            id="spinner-entry-help"
          >
            One choice per line, up to 80 characters each. Blank lines are
            ignored. Repeated entries get extra chances.
          </p>
          <p
            className="mt-2 min-h-5 text-sm text-base-content/75"
            id="spinner-entry-error"
          >
            {validationError}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3 border-b border-base-300 pb-6">
            <span className="text-xs text-base-content/60">
              Your list stays in this browser.
            </span>
            <button
              className="btn btn-sm btn-ghost"
              disabled={spinner.spinning}
              onClick={spinner.reset}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={14} /> Reset
            </button>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Recent results</h2>
              {spinner.history.length ? (
                <button
                  className="btn btn-xs btn-ghost"
                  onClick={spinner.clearHistory}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={12} /> Clear history
                </button>
              ) : null}
            </div>
            {spinner.history.length ? (
              <ol
                aria-label="Recent results"
                className="mt-3 max-h-64 space-y-2 overflow-y-auto"
              >
                {spinner.history.map((result, index) => (
                  <li
                    className="flex min-w-0 items-start gap-3 rounded-field bg-base-200/60 px-3 py-2 text-sm"
                    key={result.id}
                  >
                    <span className="shrink-0 text-xs leading-5 text-base-content/50">
                      {String(spinner.history.length - index).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1 wrap-anywhere">
                      {result.label}
                    </span>
                    {index === 0 ? (
                      <ArrowUpRight
                        aria-hidden="true"
                        className="shrink-0 text-base-content/50"
                        size={16}
                      />
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm leading-6 text-base-content/60">
                Your next decision starts here. The latest 20 picks will appear
                during this visit.
              </p>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
