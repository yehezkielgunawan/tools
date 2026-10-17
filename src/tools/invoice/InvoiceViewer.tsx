import { Copy, Download } from 'lucide-react';
import { useNavigate } from 'react-router';
import InvoicePreview from './InvoicePreview';
import type { InvoiceDraft } from './invoiceModel';
import { loadInvoice } from './invoiceStorage';
import { useInvoiceDownload } from './useInvoiceDownload';

export default function InvoiceViewer({ invoice }: { invoice: InvoiceDraft }) {
  const navigate = useNavigate();
  const { download, downloading, downloadError } = useInvoiceDownload();
  const copy = () => {
    let existing = true;
    try {
      existing = loadInvoice(window.localStorage) !== null;
    } catch {
      /* Ask before replacing unreadable data too. */
    }
    if (
      existing &&
      !window.confirm(
        'Replace the invoice draft saved on this browser with a copy of this invoice?',
      )
    )
      return;
    // Router state also lets copying work when browser storage is unavailable.
    navigate('/generator/invoice', { state: { invoiceCopy: invoice } });
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Shared invoice</h2>
          <p className="mt-1 text-sm text-base-content/65">
            Read-only snapshot. Make a copy to edit your own version.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={copy} type="button">
            <Copy size={16} aria-hidden="true" />
            Make a copy
          </button>
          <button
            className="btn btn-primary"
            disabled={downloading}
            onClick={() => void download(invoice)}
            type="button"
          >
            <Download size={16} aria-hidden="true" />
            {downloading ? 'Generating PDF…' : 'Download PDF'}
          </button>
        </div>
      </div>
      {downloadError ? (
        <p role="alert" className="text-sm text-error">
          {downloadError}
        </p>
      ) : null}
      <InvoicePreview invoice={invoice} />
    </div>
  );
}
