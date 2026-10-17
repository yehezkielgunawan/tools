import { type InvoiceDraft, parseInvoice } from './invoiceModel';

export const INVOICE_STORAGE_KEY = 'yehezgun-tools:invoice:draft:v1';
export type InvoiceStorage = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>;
export function loadInvoice(storage: InvoiceStorage): InvoiceDraft | null {
  const value = storage.getItem(INVOICE_STORAGE_KEY);
  if (value === null) return null;
  if (value.length > 512_000)
    throw new Error(
      'Saved invoice is too large. Clear saved invoice data to start again.',
    );
  return parseInvoice(JSON.parse(value));
}
export function saveInvoice(
  storage: InvoiceStorage,
  draft: InvoiceDraft,
): void {
  storage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(parseInvoice(draft)));
}
export function clearInvoice(storage: InvoiceStorage): void {
  storage.removeItem(INVOICE_STORAGE_KEY);
}
