import { readFileSync } from 'node:fs';
import { describe, expect, it } from '@rstest/core';
import { PDFDocument } from 'pdf-lib';
import { wrapInvoiceText } from '../src/tools/invoice/invoicePdfLayout';
import { renderInvoicePdf } from '../src/tools/invoice/renderInvoicePdf';
import { completeInvoice } from './invoiceFixture';

describe('invoice PDF', () => {
  it('wraps long unbroken text without losing characters', () => {
    expect(wrapInvoiceText('abcdefgh', (value) => value.length, 3)).toEqual([
      'abc',
      'def',
      'gh',
    ]);
    expect(
      wrapInvoiceText('first\n\nlast', (value) => value.length, 10),
    ).toEqual(['first', '', 'last']);
  });
  it('generates selectable multi-page invoices using bundled fonts', async () => {
    const invoice = completeInvoice();
    invoice.items = Array.from({ length: 25 }, (_, index) => ({
      quantity: '1.5',
      unitPrice: '10.01',
      id: String(index),
      description: `Résumé café item ${index} ${'long description '.repeat(15)}`,
    }));
    const fonts = {
      regular: new Uint8Array(
        readFileSync('public/fonts/invoice/NotoSans-Regular.ttf'),
      ),
      bold: new Uint8Array(
        readFileSync('public/fonts/invoice/NotoSans-Bold.ttf'),
      ),
    };
    const bytes = await renderInvoicePdf(invoice, fonts);
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBeGreaterThan(2);
    expect(document.getTitle()).toBe('Invoice INV-001');
    expect(document.getPages()[0]?.getSize().width).toBeCloseTo(595.28, 1);
    await expect(
      renderInvoicePdf({ ...invoice, notes: '😀' }, fonts),
    ).rejects.toThrow(/unsupported/i);
  });
});
