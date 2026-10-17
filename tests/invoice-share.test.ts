import { describe, expect, it } from '@rstest/core';
import { deflateSync, strToU8 } from 'fflate';
import {
  decodeInvoice,
  encodeInvoice,
  MAX_SHARE_URL,
} from '../src/tools/invoice/invoiceShare';
import { completeInvoice } from './invoiceFixture';

describe('invoice share snapshots', () => {
  it('round trips Unicode as an independent snapshot', () => {
    const invoice = { ...completeInvoice(), notes: 'Résumé — café 日本語' };
    const url = encodeInvoice(invoice, 'https://tools.yehezgun.com');
    expect(url).toContain('/generator/invoice#invoice=v1.');
    invoice.notes = 'Changed';
    expect(decodeInvoice(new URL(url).hash).notes).toBe('Résumé — café 日本語');
  });
  it('rejects invalid, unsupported and incomplete snapshots', () => {
    for (const hash of [
      '#invoice=v2.abc',
      '#invoice=v1.!!!!',
      '#invoice=v1.AAAA',
      '#other=abc',
    ])
      expect(() => decodeInvoice(hash)).toThrow();
    expect(() =>
      encodeInvoice(
        { ...completeInvoice(), invoiceNumber: '' },
        'https://example.com',
      ),
    ).toThrow();
    expect(() =>
      decodeInvoice(`#invoice=v1.${'a'.repeat(MAX_SHARE_URL)}`),
    ).toThrow();
  });
  it('enforces the complete URL limit', () => {
    expect(() =>
      encodeInvoice(
        completeInvoice(),
        `https://example.com/${'a'.repeat(MAX_SHARE_URL)}`,
      ),
    ).toThrow();
  });
  it('rejects highly compressed data beyond the decoded size limit', () => {
    const bytes = deflateSync(strToU8('x'.repeat(200_000)));
    const encoded = btoa(
      Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''),
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(() => decodeInvoice(`#invoice=v1.${encoded}`)).toThrow();
  });
});
