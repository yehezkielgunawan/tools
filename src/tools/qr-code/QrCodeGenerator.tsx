import { Download, Link2, UserRound } from 'lucide-react';
import * as QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import ToolLayout from '../../components/layout/ToolLayout';
import { createVCard, type VCardContact } from './createVCard';
import { normalizeQrUrl } from './normalizeQrUrl';

type Mode = 'url' | 'vcard';

interface QrResult {
  key: string;
  image?: string;
  error?: string;
}

function getPayload(mode: Mode, url: string, contact: VCardContact) {
  if (mode === 'url' && !url.trim()) return { value: null, error: null };
  if (mode === 'vcard' && !contact.name.trim()) {
    return { value: null, error: null };
  }

  try {
    return {
      value: mode === 'url' ? normalizeQrUrl(url) : createVCard(contact),
      error: null,
    };
  } catch (error) {
    return {
      value: null,
      error: error instanceof Error ? error.message : 'Invalid QR content.',
    };
  }
}

const initialContact: VCardContact = {
  name: '',
  phone: '',
  email: '',
  organization: '',
  title: '',
  website: '',
};

export default function QrCodeGenerator() {
  const [mode, setMode] = useState<Mode>('url');
  const [url, setUrl] = useState('');
  const [contact, setContact] = useState<VCardContact>(initialContact);
  const [result, setResult] = useState<QrResult | null>(null);

  const payload = getPayload(mode, url, contact);
  const key = payload.value ? `${mode}:${payload.value}` : null;

  useEffect(() => {
    if (!payload.value || !key) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      QRCode.toDataURL(payload.value as string, {
        width: 1024,
        margin: 4,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000ff', light: '#ffffffff' },
      })
        .then((image) => {
          if (!cancelled) setResult({ key, image });
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            const message =
              error instanceof Error &&
              /too big|too long|code length/i.test(error.message)
                ? 'Too much data for one QR code. Shorten the content and try again.'
                : 'Could not generate this QR code. Try shorter content.';
            setResult({ key, error: message });
          }
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [key, payload.value]);

  const image = result?.key === key ? result.image : undefined;
  const error = payload.error ?? (result?.key === key ? result.error : null);

  const updateContact = (field: keyof VCardContact, value: string) => {
    setContact((previous) => ({ ...previous, [field]: value }));
  };

  const download = () => {
    if (!image) return;
    const link = document.createElement('a');
    link.href = image;
    link.download = mode === 'url' ? 'url-qr.png' : 'contact-qr.png';
    link.click();
  };

  return (
    <ToolLayout
      category="Generator"
      description="Turn a web address or contact details into a scannable QR code. Everything stays in your browser."
      title="QR Code Generator"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.85fr)]">
        <section aria-label="QR content" className="min-w-0">
          <div
            aria-label="QR type"
            className="tabs tabs-border mb-6"
            role="tablist"
          >
            <button
              aria-controls="qr-input-panel"
              aria-selected={mode === 'url'}
              className={`tab gap-2 ${mode === 'url' ? 'tab-active' : ''}`}
              id="qr-url-tab"
              onClick={() => setMode('url')}
              role="tab"
              type="button"
            >
              <Link2 aria-hidden="true" size={16} /> URL
            </button>
            <button
              aria-controls="qr-input-panel"
              aria-selected={mode === 'vcard'}
              className={`tab gap-2 ${mode === 'vcard' ? 'tab-active' : ''}`}
              id="qr-vcard-tab"
              onClick={() => setMode('vcard')}
              role="tab"
              type="button"
            >
              <UserRound aria-hidden="true" size={16} /> vCard
            </button>
          </div>

          <div
            aria-labelledby={mode === 'url' ? 'qr-url-tab' : 'qr-vcard-tab'}
            className="space-y-5"
            id="qr-input-panel"
            role="tabpanel"
          >
            {mode === 'url' ? (
              <div>
                <label className="label" htmlFor="qr-url">
                  URL
                </label>
                <input
                  aria-invalid={Boolean(payload.error)}
                  autoComplete="url"
                  className="input w-full"
                  id="qr-url"
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="example.com"
                  type="url"
                  value={url}
                />
                <p className="mt-2 text-xs text-base-content/60">
                  Links without a prefix will use https://.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="qr-name">
                    Full name{' '}
                    <span className="text-base-content/55">Required</span>
                  </label>
                  <input
                    className="input w-full"
                    id="qr-name"
                    onChange={(event) =>
                      updateContact('name', event.target.value)
                    }
                    placeholder="Ada Lovelace"
                    type="text"
                    value={contact.name}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="qr-phone">
                    Phone
                  </label>
                  <input
                    className="input w-full"
                    id="qr-phone"
                    onChange={(event) =>
                      updateContact('phone', event.target.value)
                    }
                    placeholder="+1 555 0100"
                    type="tel"
                    value={contact.phone}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="qr-email">
                    Email
                  </label>
                  <input
                    className="input w-full"
                    id="qr-email"
                    onChange={(event) =>
                      updateContact('email', event.target.value)
                    }
                    placeholder="ada@example.com"
                    type="email"
                    value={contact.email}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="qr-organization">
                    Organization
                  </label>
                  <input
                    className="input w-full"
                    id="qr-organization"
                    onChange={(event) =>
                      updateContact('organization', event.target.value)
                    }
                    placeholder="Company or team"
                    type="text"
                    value={contact.organization}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="qr-title">
                    Job title
                  </label>
                  <input
                    className="input w-full"
                    id="qr-title"
                    onChange={(event) =>
                      updateContact('title', event.target.value)
                    }
                    placeholder="Your role"
                    type="text"
                    value={contact.title}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="qr-website">
                    Website
                  </label>
                  <input
                    className="input w-full"
                    id="qr-website"
                    onChange={(event) =>
                      updateContact('website', event.target.value)
                    }
                    placeholder="example.com"
                    type="url"
                    value={contact.website}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        <section
          aria-label="QR preview"
          className="flex flex-col items-center justify-center rounded-box border border-base-300 bg-base-200/40 p-5 sm:p-8"
        >
          <div className="mb-5 w-full">
            <h2 className="text-base font-semibold">Preview</h2>
            <p className="mt-1 text-sm text-base-content/60">
              Ready to scan and save.
            </p>
          </div>
          <div
            aria-live="polite"
            className="flex aspect-square w-full max-w-72 items-center justify-center overflow-hidden rounded-box border border-base-300 bg-white p-3 text-center"
          >
            {image && !error ? (
              <img
                alt="QR code preview"
                className="h-full w-full"
                height="1024"
                src={image}
                width="1024"
              />
            ) : (
              <p className="px-4 text-sm text-neutral/70">
                {error
                  ? 'Preview unavailable'
                  : 'Enter a URL or contact name to see your QR code.'}
              </p>
            )}
          </div>
          {error ? (
            <p className="mt-4 w-full text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}
          <button
            className="btn btn-primary mt-6 w-full"
            disabled={!image || Boolean(error)}
            onClick={download}
            type="button"
          >
            <Download aria-hidden="true" size={17} /> Download PNG
          </button>
          <p className="mt-3 text-center text-xs text-base-content/55">
            1024 × 1024 px · PNG
          </p>
        </section>
      </div>
    </ToolLayout>
  );
}
