import { describe, expect, it } from '@rstest/core';
import {
  calculateInvoice,
  formatMoney,
} from '../src/tools/invoice/invoiceCalculations';
import {
  createInvoice,
  parseInvoice,
  validateInvoice,
} from '../src/tools/invoice/invoiceModel';

import { completeInvoice } from './invoiceFixture';

describe('invoice model and amounts', () => {
  it('allows incomplete drafts to restore but not export', () => {
    expect(
      parseInvoice(JSON.parse(JSON.stringify(createInvoice()))),
    ).toBeDefined();
    expect(
      Object.keys(validateInvoice(createInvoice())).length,
    ).toBeGreaterThan(0);
    expect(validateInvoice(completeInvoice())).toEqual({});
  });
  it('rounds lines before summing and applies discount before tax', () => {
    const invoice = completeInvoice();
    invoice.items.push({
      id: 'two',
      description: 'Support',
      quantity: '1',
      unitPrice: '0.10',
    });
    expect(
      calculateInvoice({ ...invoice, discount: '1', taxPercent: '10' }),
    ).toEqual({
      lines: ['15.02', '0.10'],
      subtotal: '15.12',
      discount: '1.00',
      taxable: '14.12',
      tax: '1.41',
      total: '15.53',
    });
  });
  it('uses currency precision and exact large amounts', () => {
    expect(
      calculateInvoice({
        ...completeInvoice(),
        currency: 'JPY',
        items: [
          { id: '1', description: 'Work', quantity: '1.5', unitPrice: '101' },
        ],
      }).total,
    ).toBe('152');
    expect(
      calculateInvoice({
        ...completeInvoice(),
        currency: 'KWD',
        items: [
          { id: '1', description: 'Work', quantity: '1.5', unitPrice: '0.001' },
        ],
      }).total,
    ).toBe('0.002');
    expect(formatMoney('99999999999999.99', 'USD')).toBe(
      'USD 99,999,999,999,999.99',
    );
  });
  it('rejects invalid dates, excessive discounts and numeric notation', () => {
    expect(
      validateInvoice({ ...completeInvoice(), issueDate: '2026-02-30' })
        .issueDate,
    ).toBeDefined();
    expect(
      validateInvoice({ ...completeInvoice(), dueDate: '2000-01-01' }).dueDate,
    ).toBeDefined();
    expect(
      validateInvoice({ ...completeInvoice(), discount: '100' }).discount,
    ).toBeDefined();
    expect(
      validateInvoice({ ...completeInvoice(), taxPercent: '1e2' }).taxPercent,
    ).toBeDefined();
    expect(
      validateInvoice({ ...completeInvoice(), currency: 'JPY' })[
        'items.0.unitPrice'
      ],
    ).toBeDefined();
  });
  it('rejects malformed and oversized draft structures and strips unknown fields', () => {
    expect(() => parseInvoice({ version: 2 })).toThrow();
    expect(() =>
      parseInvoice({ ...completeInvoice(), notes: 'x'.repeat(5001) }),
    ).toThrow();
    expect(
      parseInvoice({ ...completeInvoice(), total: '0' }),
    ).not.toHaveProperty('total');
  });
  it('validates discount bounds even before names are filled in', () => {
    const invoice = completeInvoice();
    expect(
      validateInvoice({
        ...invoice,
        sender: { ...invoice.sender, name: '' },
        discount: '100',
      }).discount,
    ).toBeDefined();
  });
});
