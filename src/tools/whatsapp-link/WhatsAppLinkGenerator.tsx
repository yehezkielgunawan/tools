import { ExternalLink, Link as LinkIcon, RotateCcw } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import ToolLayout from '../../components/layout/ToolLayout';
import CopyButton from '../../components/ui/CopyButton';
import { generateWhatsAppLink } from './generateWhatsAppLink';
import { normalizePhoneNumber } from './normalizePhoneNumber';

export default function WhatsAppLinkGenerator() {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const result = normalizePhoneNumber(phone);

    if (!result.ok) {
      setPhoneError(result.error);
      setGeneratedLink(null);
      return;
    }

    setPhoneError(null);
    setGeneratedLink(generateWhatsAppLink(result.value, message));
  };

  const reset = (): void => {
    setPhone('');
    setMessage('');
    setPhoneError(null);
    setGeneratedLink(null);
  };

  return (
    <ToolLayout
      category="Generator"
      description="Create a wa.me link with an optional prefilled message."
      title="WhatsApp Link Generator"
    >
      <form className="space-y-6" noValidate onSubmit={handleSubmit}>
        <div>
          <label className="label" htmlFor="whatsapp-phone">
            <span className="label-text font-medium">Phone number</span>
            <span className="label-text-alt text-base-content/50">
              Required
            </span>
          </label>
          <input
            aria-describedby={phoneError ? 'whatsapp-phone-error' : undefined}
            aria-invalid={phoneError ? 'true' : 'false'}
            autoComplete="tel"
            className="input w-full"
            id="whatsapp-phone"
            inputMode="tel"
            onChange={(event) => {
              setPhone(event.target.value);
              setPhoneError(null);
              setGeneratedLink(null);
            }}
            placeholder="0812 3456 789"
            type="tel"
            value={phone}
          />
          {phoneError ? (
            <p
              className="mt-2 text-sm text-error"
              id="whatsapp-phone-error"
              role="alert"
            >
              {phoneError}
            </p>
          ) : null}
        </div>

        <div>
          <label className="label" htmlFor="whatsapp-message">
            <span className="label-text font-medium">Message</span>
            <span className="label-text-alt text-base-content/50">
              Optional
            </span>
          </label>
          <textarea
            className="textarea min-h-32 w-full"
            id="whatsapp-message"
            onChange={(event) => {
              setMessage(event.target.value);
              setGeneratedLink(null);
            }}
            placeholder="Hello, I would like to ask about your service."
            value={message}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary" type="submit">
            <LinkIcon aria-hidden="true" size={16} />
            Generate link
          </button>
          <button className="btn btn-ghost" onClick={reset} type="button">
            <RotateCcw aria-hidden="true" size={16} />
            Reset
          </button>
        </div>
      </form>

      {generatedLink ? (
        <div className="mt-8 border-t border-base-300 pt-6">
          <div className="flex items-center justify-between gap-4">
            <label className="label p-0" htmlFor="generated-whatsapp-link">
              <span className="label-text font-medium">Generated link</span>
            </label>
            <CopyButton text={generatedLink} />
          </div>
          <input
            aria-label="Generated WhatsApp link"
            className="input mt-2 w-full"
            id="generated-whatsapp-link"
            readOnly
            value={generatedLink}
          />
          <a
            className="btn btn-primary mt-4 w-full sm:w-auto"
            href={generatedLink}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink aria-hidden="true" size={16} />
            Open WhatsApp
          </a>
        </div>
      ) : null}
    </ToolLayout>
  );
}
