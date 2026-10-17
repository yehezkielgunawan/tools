import { Plus, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import InvoiceField from './InvoiceField';
import {
  createItem,
  type InvoiceDraft,
  type InvoiceErrors,
} from './invoiceModel';

export default function InvoiceItemsEditor({
  invoice,
  update,
  errors,
}: {
  invoice: InvoiceDraft;
  update: (invoice: InvoiceDraft) => void;
  errors: InvoiceErrors;
}) {
  const container = useRef<HTMLDivElement>(null);
  const focusItem = (index: number) =>
    requestAnimationFrame(() =>
      container.current
        ?.querySelectorAll<HTMLInputElement>('input')
        ?.[index * 3]?.focus(),
    );
  return (
    <section aria-labelledby="invoice-items-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold" id="invoice-items-heading">
          Line items
        </h2>
        <span className="text-xs text-base-content/60">
          {invoice.items.length} / 100
        </span>
      </div>
      <div ref={container} className="space-y-4">
        {invoice.items.map((item, index) => {
          const change = (
            field: 'description' | 'quantity' | 'unitPrice',
            value: string,
          ) =>
            update({
              ...invoice,
              items: invoice.items.map((current) =>
                current.id === item.id
                  ? { ...current, [field]: value }
                  : current,
              ),
            });
          return (
            <div
              className="rounded-box border border-base-300 p-3"
              key={item.id}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-base-content/60">
                  Item {index + 1}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-label={`Remove item ${index + 1}`}
                  disabled={invoice.items.length === 1}
                  onClick={() => {
                    update({
                      ...invoice,
                      items: invoice.items.filter(
                        (current) => current.id !== item.id,
                      ),
                    });
                    focusItem(Math.max(0, index - 1));
                  }}
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
              <InvoiceField
                label={`Description ${index + 1}`}
                value={item.description}
                onChange={(value) => change('description', value)}
                error={errors[`items.${index}.description`]}
                maxLength={500}
              />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <InvoiceField
                  label={`Quantity ${index + 1}`}
                  value={item.quantity}
                  onChange={(value) => change('quantity', value)}
                  error={errors[`items.${index}.quantity`]}
                  numeric
                  maxLength={30}
                />
                <InvoiceField
                  label={`Unit price ${index + 1}`}
                  value={item.unitPrice}
                  onChange={(value) => change('unitPrice', value)}
                  error={errors[`items.${index}.unitPrice`]}
                  numeric
                  maxLength={30}
                />
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="btn btn-sm"
        disabled={invoice.items.length >= 100}
        onClick={() => {
          update({ ...invoice, items: [...invoice.items, createItem()] });
          focusItem(invoice.items.length);
        }}
      >
        <Plus size={16} aria-hidden="true" />
        Add line item
      </button>
    </section>
  );
}
