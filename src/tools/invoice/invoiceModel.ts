import { calculateInvoice } from './invoiceCalculations';

export interface InvoiceParty {
  name: string;
  address: string;
  contact: string;
}
export interface InvoiceItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}
export interface InvoiceDraft {
  version: 1;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  sender: InvoiceParty;
  client: InvoiceParty;
  items: InvoiceItem[];
  discount: string;
  taxPercent: string;
  notes: string;
}
export type InvoiceErrors = Record<string, string>;
export const currencies = [
  'USD',
  'IDR',
  'EUR',
  'GBP',
  'JPY',
  'SGD',
  'AUD',
  'CAD',
  'KWD',
] as const;
export function currencyDigits(currency: string): number {
  return (
    new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}
export function createItem(): InvoiceItem {
  return {
    id: crypto.randomUUID(),
    description: '',
    quantity: '1',
    unitPrice: '',
  };
}
export function createInvoice(): InvoiceDraft {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return {
    version: 1,
    invoiceNumber: '',
    issueDate: date,
    dueDate: '',
    currency: 'USD',
    sender: { name: '', address: '', contact: '' },
    client: { name: '', address: '', contact: '' },
    items: [createItem()],
    discount: '',
    taxPercent: '',
    notes: '',
  };
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid invoice data.');
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number): string {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    Array.from(value).some((character) => {
      const code = character.charCodeAt(0);
      return (code < 32 && !'\t\n\r'.includes(character)) || code === 127;
    })
  )
    throw new Error('Invalid or oversized invoice field.');
  return value;
}
function party(value: unknown): InvoiceParty {
  const source = record(value);
  return {
    name: text(source.name, 200),
    address: text(source.address, 2000),
    contact: text(source.contact, 2000),
  };
}
export function parseInvoice(value: unknown): InvoiceDraft {
  const source = record(value);
  if (source.version !== 1) throw new Error('Unsupported invoice version.');
  if (!currencies.some((currency) => currency === source.currency))
    throw new Error('Unsupported invoice currency.');
  if (
    !Array.isArray(source.items) ||
    source.items.length < 1 ||
    source.items.length > 100
  )
    throw new Error('Choose between 1 and 100 line items.');
  const items = source.items.map((value) => {
    const item = record(value);
    return {
      id: text(item.id, 100),
      description: text(item.description, 500),
      quantity: text(item.quantity, 30),
      unitPrice: text(item.unitPrice, 30),
    };
  });
  if (
    items.some((item) => !item.id) ||
    new Set(items.map((item) => item.id)).size !== items.length
  )
    throw new Error('Invalid invoice item identifiers.');
  return {
    version: 1,
    invoiceNumber: text(source.invoiceNumber, 100),
    issueDate: text(source.issueDate, 10),
    dueDate: text(source.dueDate, 10),
    currency: source.currency as string,
    sender: party(source.sender),
    client: party(source.client),
    items,
    discount: text(source.discount, 30),
    taxPercent: text(source.taxPercent, 30),
    notes: text(source.notes, 5000),
  };
}
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
function numeric(value: string, digits: number): boolean {
  return new RegExp(
    `^\\d{1,12}${digits ? `(\\.\\d{1,${digits}})?` : ''}$`,
  ).test(value);
}
export function validateInvoice(invoice: InvoiceDraft): InvoiceErrors {
  const errors: InvoiceErrors = {};
  try {
    parseInvoice(invoice);
  } catch (error) {
    return {
      invoice: error instanceof Error ? error.message : 'Invalid invoice.',
    };
  }
  if (!invoice.invoiceNumber.trim())
    errors.invoiceNumber = 'Enter an invoice number.';
  for (const field of ['sender', 'client'] as const)
    if (!invoice[field].name.trim())
      errors[`${field}.name`] = `Enter the ${field} name.`;
  if (!validDate(invoice.issueDate))
    errors.issueDate = 'Enter a valid issue date.';
  if (
    invoice.dueDate &&
    (!validDate(invoice.dueDate) || invoice.dueDate < invoice.issueDate)
  )
    errors.dueDate = 'Due date must be on or after the issue date.';
  const digits = currencyDigits(invoice.currency);
  invoice.items.forEach((item, index) => {
    if (!item.description.trim())
      errors[`items.${index}.description`] = 'Enter a description.';
    if (!numeric(item.quantity, 4) || !/[1-9]/.test(item.quantity))
      errors[`items.${index}.quantity`] =
        'Enter a positive quantity (up to 4 decimal places).';
    if (!numeric(item.unitPrice, digits))
      errors[`items.${index}.unitPrice`] =
        `Enter a nonnegative price (up to ${digits} decimal places).`;
  });
  if (invoice.discount && !numeric(invoice.discount, digits))
    errors.discount = `Enter a nonnegative discount (up to ${digits} decimal places).`;
  if (
    invoice.taxPercent &&
    (!numeric(invoice.taxPercent, 2) || Number(invoice.taxPercent) > 100)
  )
    errors.taxPercent = 'Enter a tax percentage between 0 and 100.';
  if (
    !Object.keys(errors).some(
      (key) =>
        key === 'discount' ||
        key === 'taxPercent' ||
        key.endsWith('.quantity') ||
        key.endsWith('.unitPrice'),
    )
  ) {
    if (calculateInvoice(invoice).taxable.startsWith('-'))
      errors.discount = 'Discount cannot exceed the subtotal.';
  }
  return errors;
}
