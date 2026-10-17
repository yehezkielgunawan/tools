import { Download, Link as LinkIcon, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import ToolLayout from '../../components/layout/ToolLayout';
import InvoiceForm from './InvoiceForm';
import InvoicePreview from './InvoicePreview';
import InvoiceViewer from './InvoiceViewer';
import {
  type InvoiceDraft,
  parseInvoice,
  validateInvoice,
} from './invoiceModel';
import { decodeInvoice, encodeInvoice } from './invoiceShare';
import { useInvoiceDownload } from './useInvoiceDownload';
import { useInvoiceDraft } from './useInvoiceDraft';

function InvoiceEditor({ copy }: { copy?: InvoiceDraft }) {
  const { draft, update, reset, message, status } = useInvoiceDraft(copy);
  const navigate = useNavigate();
  const { download, downloading, downloadError } = useInvoiceDownload();
  const [showErrors, setShowErrors] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [fallbackUrl, setFallbackUrl] = useState('');
  const errors = validateInvoice(draft);
  useEffect(() => {
    if (copy) navigate('/generator/invoice', { replace: true, state: null });
  }, [copy, navigate]);
  const change = (next: InvoiceDraft) => {
    update(next);
    setShareMessage('');
    setFallbackUrl('');
  };
  const ready = () => {
    setShowErrors(true);
    return Object.keys(errors).length === 0;
  };
  const share = async () => {
    if (!ready()) return;
    setShareMessage('');
    setFallbackUrl('');
    try {
      const url = encodeInvoice(draft, window.location.origin);
      try {
        await navigator.clipboard.writeText(url);
        setShareMessage(
          'Share link copied. Anyone with this link can view this invoice.',
        );
      } catch {
        setFallbackUrl(url);
        setShareMessage('Copy the link below to share this invoice.');
      }
    } catch (error) {
      setShareMessage(
        error instanceof Error ? error.message : 'Unable to create share link.',
      );
    }
  };
  const clear = () => {
    if (
      !window.confirm(
        'Clear saved invoice data and reset the editor? Previously shared links will still work.',
      )
    )
      return;
    reset();
    setShowErrors(false);
    setShareMessage('');
    setFallbackUrl('');
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-base-300 pb-5">
        <div>
          <h2 className="font-semibold">Your invoice workspace</h2>
          <p role="status" className="mt-1 text-xs text-base-content/65">
            {status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => void share()}
          >
            <LinkIcon size={15} aria-hidden="true" />
            Copy share link
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={downloading}
            onClick={() => {
              if (ready()) void download(draft);
            }}
          >
            <Download size={15} aria-hidden="true" />
            {downloading ? 'Generating PDF…' : 'Download PDF'}
          </button>
        </div>
      </div>
      {message ? (
        <p
          role="alert"
          className="rounded-box border border-warning/40 bg-warning/10 p-3 text-sm"
        >
          {message}
        </p>
      ) : null}
      {downloadError ? (
        <p role="alert" className="text-sm text-error">
          {downloadError}
        </p>
      ) : null}
      {showErrors && Object.keys(errors).length ? (
        <p role="alert" className="text-sm text-error">
          Check the highlighted fields before sharing or downloading.
          {errors.invoice ? ` ${errors.invoice}` : ''}
        </p>
      ) : null}
      {shareMessage ? (
        <p role="status" className="text-sm">
          {shareMessage}
        </p>
      ) : null}
      {fallbackUrl ? (
        <label className="block space-y-2 text-sm font-medium">
          Share link
          <input
            className="input w-full"
            readOnly
            value={fallbackUrl}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
      ) : null}
      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <InvoiceForm
          invoice={draft}
          update={change}
          errors={showErrors ? errors : {}}
        />
        <section aria-label="Live preview" className="min-w-0">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Live preview</h2>
            <span className="text-xs text-base-content/60">
              {draft.currency} · A4 PDF
            </span>
          </div>
          <InvoicePreview invoice={draft} />
          <p className="mt-3 text-xs leading-5 text-base-content/60">
            PDF text is selectable. Long invoices continue onto additional
            pages.
          </p>
        </section>
      </div>
      <div className="flex flex-wrap gap-3 border-t border-base-300 pt-6">
        <button
          className="btn btn-sm"
          type="button"
          onClick={() => {
            if (
              window.confirm(
                'Discard the current draft and start a new invoice?',
              )
            ) {
              reset();
              setShowErrors(false);
              setFallbackUrl('');
              setShareMessage('');
            }
          }}
        >
          <RotateCcw size={15} aria-hidden="true" />
          New invoice
        </button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={clear}>
          <Trash2 size={15} aria-hidden="true" />
          Clear saved invoice data
        </button>
      </div>
      <p className="text-xs leading-5 text-base-content/65">
        Share links contain an invoice snapshot. Anyone with the link can read
        it; clearing your draft does not revoke existing links.
      </p>
    </div>
  );
}

export default function InvoiceGenerator() {
  const location = useLocation();
  const navigate = useNavigate();
  let shared: InvoiceDraft | undefined;
  let error = '';
  let copy: InvoiceDraft | undefined;
  if (location.hash) {
    try {
      shared = decodeInvoice(location.hash);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Invalid invoice link.';
    }
  } else if (
    location.state &&
    typeof location.state === 'object' &&
    'invoiceCopy' in location.state
  ) {
    try {
      copy = parseInvoice(location.state.invoiceCopy);
    } catch {
      /* Ignore invalid navigation state. */
    }
  }
  return (
    <ToolLayout
      category="Generator"
      title="Invoice Generator"
      description="Create an invoice, save a PDF, and share a read-only link. Everything is generated in your browser."
      privacyNote="Invoice data stays in your browser unless you share a link or download a PDF. Share links contain the invoice data in the URL fragment."
    >
      {error ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Unable to open invoice</h2>
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
          <button
            className="btn"
            type="button"
            onClick={() => navigate('/generator/invoice')}
          >
            Open invoice editor
          </button>
        </section>
      ) : shared ? (
        <InvoiceViewer key={location.hash} invoice={shared} />
      ) : (
        <InvoiceEditor copy={copy} />
      )}
    </ToolLayout>
  );
}
