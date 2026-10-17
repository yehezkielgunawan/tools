import Decimal from 'decimal.js';
import { currencyDigits, type InvoiceDraft } from './invoiceModel';

const Money = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export function calculateInvoice(invoice: InvoiceDraft) {
  const digits = currencyDigits(invoice.currency);
  const lines = invoice.items.map((item) =>
    new Money(item.quantity).times(item.unitPrice).toFixed(digits),
  );
  const subtotal = lines.reduce((sum, value) => sum.plus(value), new Money(0));
  const discount = new Money(invoice.discount || '0');
  const taxable = subtotal.minus(discount);
  const tax = taxable
    .times(invoice.taxPercent || '0')
    .div(100)
    .toDecimalPlaces(digits);
  return {
    lines,
    subtotal: subtotal.toFixed(digits),
    discount: discount.toFixed(digits),
    taxable: taxable.toFixed(digits),
    tax: tax.toFixed(digits),
    total: taxable.plus(tax).toFixed(digits),
  };
}
export type InvoiceTotals = ReturnType<typeof calculateInvoice>;
export function formatMoney(value: string, currency: string): string {
  const [integer = '0', fraction] = value.split('.');
  const grouped = new Intl.NumberFormat('en-US').format(BigInt(integer));
  return `${currency} ${grouped}${fraction === undefined ? '' : `.${fraction}`}`;
}
