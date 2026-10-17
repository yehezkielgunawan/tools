import { useState } from 'react';
import { getPdfFilename } from '../pdf-shared/pdfDownloads';
import type { InvoiceDraft } from './invoiceModel';

export function useInvoiceDownload() {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const download = async (invoice: InvoiceDraft) => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError('');
    try {
      const { renderInvoicePdf } = await import('./renderInvoicePdf');
      const bytes = await renderInvoicePdf(invoice);
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }),
      );
      try {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = getPdfFilename(
          `invoice-${invoice.invoiceNumber}`,
          'invoice',
        );
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : 'Unable to generate PDF. Please try again.',
      );
    } finally {
      setDownloading(false);
    }
  };
  return { download, downloading, downloadError };
}
