import { calculateInvoice, formatMoney } from './invoiceCalculations';
import { type InvoiceDraft, validateInvoice } from './invoiceModel';

export default function InvoicePreview({ invoice }: { invoice: InvoiceDraft }) {
  let totals: ReturnType<typeof calculateInvoice> | null = null;
  const errors = validateInvoice(invoice);
  if (
    !Object.keys(errors).some(
      (key) =>
        key === 'invoice' ||
        key === 'discount' ||
        key === 'taxPercent' ||
        key.endsWith('.quantity') ||
        key.endsWith('.unitPrice'),
    )
  ) {
    try {
      totals = calculateInvoice(invoice);
    } catch {
      /* Incomplete numeric inputs have no total yet. */
    }
  }
  const amount = (value: string | undefined) =>
    value === undefined ? '—' : formatMoney(value, invoice.currency);
  return (
    <article
      aria-label="Invoice preview"
      className="min-w-0 overflow-hidden rounded-box border border-base-300 bg-base-100 p-5 shadow-sm sm:p-7"
    >
      <header className="border-b-2 border-base-content pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-base-content/60">
          {invoice.sender.name || 'Your business'}
        </p>
        <h2 className="mt-5 font-serif text-4xl tracking-tight">Invoice</h2>
        <p className="mt-2 break-words font-mono text-sm">
          {invoice.invoiceNumber || 'Invoice number'}
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-base-content/60">Issued</dt>
            <dd className="mt-1">{invoice.issueDate || '—'}</dd>
          </div>
          <div>
            <dt className="text-base-content/60">Due</dt>
            <dd className="mt-1">{invoice.dueDate || '—'}</dd>
          </div>
        </dl>
      </header>
      <div className="my-6 grid gap-5 sm:grid-cols-2">
        {(['sender', 'client'] as const).map((party) => (
          <section
            key={party}
            className="min-w-0 whitespace-pre-wrap break-words text-xs leading-6"
          >
            <h3 className="mb-2 font-semibold uppercase tracking-wider text-base-content/60">
              {party === 'sender' ? 'From' : 'Bill to'}
            </h3>
            <p className="font-semibold">
              {invoice[party].name ||
                (party === 'sender' ? 'Sender name' : 'Client name')}
            </p>
            <p>{invoice[party].address}</p>
            <p>{invoice[party].contact}</p>
          </section>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs leading-5">
          <caption className="sr-only">
            Invoice line items in {invoice.currency}
          </caption>
          <thead>
            <tr className="border-y border-base-300">
              <th scope="col" className="py-3 pr-3 font-medium">
                Description
              </th>
              <th scope="col" className="px-2 py-3 text-right font-medium">
                Qty
              </th>
              <th scope="col" className="px-2 py-3 text-right font-medium">
                Price
              </th>
              <th scope="col" className="py-3 pl-2 text-right font-medium">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr
                key={item.id}
                className="border-b border-base-300/60 align-top"
              >
                <td className="min-w-24 max-w-48 whitespace-pre-wrap break-words py-3 pr-3">
                  {item.description || 'Item description'}
                </td>
                <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums">
                  {item.quantity || '—'}
                </td>
                <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums">
                  {item.unitPrice || '—'}
                </td>
                <td className="whitespace-nowrap py-3 pl-2 text-right tabular-nums">
                  {amount(totals?.lines[index])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="ml-auto mt-6 max-w-sm space-y-3 text-sm tabular-nums">
        {(
          [
            ['Subtotal', totals?.subtotal],
            ['Discount', totals?.discount],
            [`Tax (${invoice.taxPercent || '0'}%)`, totals?.tax],
          ] as const
        ).map(([label, value]) => (
          <div className="flex flex-wrap justify-between gap-2" key={label}>
            <dt className="text-base-content/65">{label}</dt>
            <dd className="break-all">{amount(value)}</dd>
          </div>
        ))}
        <div className="flex flex-wrap justify-between gap-2 border-t-2 border-base-content pt-4 text-lg font-semibold">
          <dt>Total due</dt>
          <dd className="break-all">{amount(totals?.total)}</dd>
        </div>
      </dl>
      {invoice.notes ? (
        <section className="mt-8 border-t border-base-300 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/60">
            Notes / payment instructions
          </h3>
          <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-6">
            {invoice.notes}
          </p>
        </section>
      ) : null}
    </article>
  );
}
