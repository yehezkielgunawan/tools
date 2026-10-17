import { useId } from 'react';
import InvoiceField from './InvoiceField';
import InvoiceItemsEditor from './InvoiceItemsEditor';
import {
  currencies,
  type InvoiceDraft,
  type InvoiceErrors,
} from './invoiceModel';

export default function InvoiceForm({
  invoice,
  update,
  errors,
}: {
  invoice: InvoiceDraft;
  update: (invoice: InvoiceDraft) => void;
  errors: InvoiceErrors;
}) {
  const currencyId = useId();
  const field = (
    key:
      | 'invoiceNumber'
      | 'issueDate'
      | 'dueDate'
      | 'discount'
      | 'taxPercent'
      | 'notes',
    label: string,
    extra = {},
  ) => (
    <InvoiceField
      label={label}
      value={invoice[key]}
      onChange={(value) => update({ ...invoice, [key]: value })}
      error={errors[key]}
      {...extra}
    />
  );
  return (
    <div className="space-y-8">
      <section aria-labelledby="invoice-details-heading" className="space-y-4">
        <h2 id="invoice-details-heading" className="text-lg font-semibold">
          Invoice details
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {field('invoiceNumber', 'Invoice number', { maxLength: 100 })}
          <div className="space-y-1.5">
            <label htmlFor={currencyId} className="block text-sm font-medium">
              Currency
            </label>
            <select
              id={currencyId}
              className="select w-full"
              value={invoice.currency}
              onChange={(event) =>
                update({ ...invoice, currency: event.currentTarget.value })
              }
            >
              {currencies.map((currency) => (
                <option key={currency}>{currency}</option>
              ))}
            </select>
          </div>
          {field('issueDate', 'Issue date', { type: 'date', maxLength: 10 })}
          {field('dueDate', 'Due date (optional)', {
            type: 'date',
            maxLength: 10,
          })}
        </div>
      </section>
      {(['sender', 'client'] as const).map((party) => (
        <section
          key={party}
          aria-labelledby={`invoice-${party}-heading`}
          className="space-y-4 border-t border-base-300 pt-6"
        >
          <h2 id={`invoice-${party}-heading`} className="text-lg font-semibold">
            {party === 'sender' ? 'From' : 'Bill to'}
          </h2>
          {(['name', 'address', 'contact'] as const).map((key) => (
            <InvoiceField
              key={key}
              label={`${party === 'sender' ? 'Sender' : 'Client'} ${key}`}
              value={invoice[party][key]}
              onChange={(value) =>
                update({
                  ...invoice,
                  [party]: { ...invoice[party], [key]: value },
                })
              }
              error={errors[`${party}.${key}`]}
              multiline={key === 'address'}
              maxLength={key === 'name' ? 200 : 2000}
            />
          ))}
        </section>
      ))}
      <InvoiceItemsEditor invoice={invoice} update={update} errors={errors} />
      <section
        aria-labelledby="invoice-adjustments-heading"
        className="space-y-4 border-t border-base-300 pt-6"
      >
        <h2 className="text-lg font-semibold" id="invoice-adjustments-heading">
          Adjustments & notes
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {field('discount', 'Discount amount (optional)', {
            numeric: true,
            maxLength: 30,
          })}
          {field('taxPercent', 'Tax percentage (optional)', {
            numeric: true,
            maxLength: 30,
          })}
        </div>
        <p className="text-xs leading-5 text-base-content/65">
          The discount is subtracted before tax is calculated. All amounts use{' '}
          {invoice.currency}.
        </p>
        {field('notes', 'Notes / payment instructions', {
          multiline: true,
          maxLength: 5000,
        })}
      </section>
    </div>
  );
}
