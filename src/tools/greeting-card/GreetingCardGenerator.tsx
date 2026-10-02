import { Download, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import ToolLayout from '../../components/layout/ToolLayout';
import CardTextField from './CardTextField';
import {
  type CardInput,
  changeOccasion,
  initialCard,
  type Occasion,
  occasions,
  palettes,
  sizes,
  type TextField,
  templates,
} from './cardModel';
import { useCardPreview } from './useCardPreview';

const designFields = [
  { field: 'template', label: 'Template', options: templates },
  { field: 'theme', label: 'Palette', options: palettes },
  {
    field: 'size',
    label: 'Format',
    options: {
      square: 'Square · 1080 × 1080',
      portrait: 'Portrait · 1080 × 1350',
    },
  },
] as const;

export default function GreetingCardGenerator() {
  const [card, setCard] = useState<CardInput>(initialCard);
  const { preview, errors, error, ready, pending, retry } =
    useCardPreview(card);
  const fieldErrors = {
    ...errors,
    ...(error?.field ? { [error.field]: error.message } : {}),
  };

  const updateText = (field: TextField, value: string): void => {
    setCard((previous) => ({ ...previous, [field]: value }));
  };

  const download = (): void => {
    if (!ready || !preview) return;
    const anchor = document.createElement('a');
    anchor.href = preview.url;
    anchor.download = preview.downloadName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  };

  const status = ready
    ? 'Your card is ready to download.'
    : error
      ? 'Preview could not be updated.'
      : pending
        ? 'Updating your preview…'
        : 'Check your card text to update the preview.';

  return (
    <ToolLayout
      category="Generator"
      description="A birthday wish, a well-earned congratulations, or a simple thank you. Make a card that says it your way."
      privacyNote="Card text is sent to og-image-rev.yehezgun.com to render your PNG. Cards are rendered on demand and are not saved in a database. An internet connection is required."
      title="Greeting Card Generator"
    >
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
        <div className="min-w-0 space-y-6">
          <fieldset className="fieldset p-0">
            <legend className="fieldset-legend pb-4 text-base">
              Choose the moment
            </legend>
            <label className="mb-1 text-sm font-medium" htmlFor="card-occasion">
              Occasion
            </label>
            <select
              aria-describedby={
                fieldErrors.occasion ? 'card-occasion-error' : undefined
              }
              aria-invalid={Boolean(fieldErrors.occasion)}
              className="select w-full"
              id="card-occasion"
              onChange={(event) => {
                const occasion = event.currentTarget.value as Occasion;
                setCard((previous) => changeOccasion(previous, occasion));
              }}
              value={card.occasion}
            >
              {Object.entries(occasions).map(([value, occasion]) => (
                <option key={value} value={value}>
                  {occasion.label}
                </option>
              ))}
            </select>
            {fieldErrors.occasion ? (
              <p className="text-sm text-error" id="card-occasion-error">
                {fieldErrors.occasion}
              </p>
            ) : null}
          </fieldset>

          <fieldset className="fieldset gap-4 border-t border-base-300 p-0 pt-2">
            <legend className="fieldset-legend text-base">
              Make it personal
            </legend>
            <CardTextField
              error={fieldErrors.heading}
              field="heading"
              label="Heading"
              onChange={(value) => updateText('heading', value)}
              value={card.heading}
            />
            <CardTextField
              error={fieldErrors.message}
              field="message"
              label="Message"
              onChange={(value) => updateText('message', value)}
              value={card.message}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CardTextField
                error={fieldErrors.recipient}
                field="recipient"
                label="Recipient"
                onChange={(value) => updateText('recipient', value)}
                optional
                value={card.recipient}
              />
              <CardTextField
                error={fieldErrors.sender}
                field="sender"
                label="Sender"
                onChange={(value) => updateText('sender', value)}
                optional
                value={card.sender}
              />
            </div>
          </fieldset>

          <fieldset className="fieldset border-t border-base-300 p-0 pt-2">
            <legend className="fieldset-legend text-base">Set the mood</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {designFields.map(({ field, label, options }) => (
                <div
                  className={`space-y-2 ${field === 'size' ? 'sm:col-span-2' : ''}`}
                  key={field}
                >
                  <label
                    className="block text-sm font-medium"
                    htmlFor={`card-${field}`}
                  >
                    {label}
                  </label>
                  <select
                    aria-describedby={
                      fieldErrors[field] ? `card-${field}-error` : undefined
                    }
                    aria-invalid={Boolean(fieldErrors[field])}
                    className="select w-full"
                    id={`card-${field}`}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setCard((previous) => ({ ...previous, [field]: value }));
                    }}
                    value={card[field]}
                  >
                    {Object.entries(options).map(([value, name]) => (
                      <option key={value} value={value}>
                        {name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors[field] ? (
                    <p
                      className="text-sm text-error"
                      id={`card-${field}-error`}
                    >
                      {fieldErrors[field]}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </fieldset>
        </div>

        <section
          aria-labelledby="card-preview-title"
          className="min-w-0 space-y-4 lg:sticky lg:top-6"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold" id="card-preview-title">
              Your card
            </h2>
            <span className="text-xs uppercase tracking-[0.16em] text-base-content/75">
              PNG preview
            </span>
          </div>
          <div
            aria-busy={pending}
            className="flex min-h-72 items-center justify-center rounded-box border border-base-300 bg-base-200 p-4 sm:p-6"
            style={{
              aspectRatio: preview
                ? `${preview.width} / ${preview.height}`
                : `${sizes[card.size].width} / ${sizes[card.size].height}`,
            }}
          >
            {preview ? (
              <img
                alt="Greeting card preview"
                className="h-auto w-full rounded-sm shadow-md"
                height={preview.height}
                src={preview.url}
                width={preview.width}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 px-4 text-center text-base-content/75">
                <ImageIcon aria-hidden="true" size={36} strokeWidth={1.3} />
                <p className="text-sm leading-6">
                  Your words, ready to send.
                  <br />
                  The preview will appear here.
                </p>
              </div>
            )}
          </div>
          <div
            className="flex items-start gap-2 text-sm leading-6 text-base-content/75"
            role="status"
          >
            {pending ? (
              <span
                aria-hidden="true"
                className="loading loading-spinner loading-xs mt-1 shrink-0"
              />
            ) : null}
            <p>{status}</p>
          </div>
          {preview && !ready ? (
            <p className="text-xs leading-5 text-base-content/75">
              Showing the last successful preview. Download will be available
              when it matches your edits.
            </p>
          ) : null}
          {error ? (
            <div className="space-y-3 rounded-box border border-error/30 p-4">
              <p className="text-sm leading-6 text-error" role="alert">
                {error.message}
              </p>
              <button className="btn btn-sm" onClick={retry} type="button">
                <RotateCcw aria-hidden="true" size={15} />
                Retry preview
              </button>
            </div>
          ) : null}
          <button
            className="btn btn-primary w-full"
            disabled={!ready}
            onClick={download}
            type="button"
          >
            <Download aria-hidden="true" size={17} />
            Download PNG
          </button>
          <p className="text-xs leading-5 text-base-content/75">
            Preview changes automatically as you edit. Latin text and accented
            names are supported; emoji and other scripts may not render
            correctly.
          </p>
          <p className="text-xs leading-5 text-base-content/75">
            Rendered by{' '}
            <a
              className="underline underline-offset-2"
              href="https://og-image-rev.yehezgun.com/cards"
              rel="noopener noreferrer"
              target="_blank"
            >
              Yehez Image Studio
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            .
          </p>
        </section>
      </div>
    </ToolLayout>
  );
}
