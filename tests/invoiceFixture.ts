import { createInvoice } from '../src/tools/invoice/invoiceModel';

export function completeInvoice() {
  const draft = createInvoice();
  return {
    ...draft,
    invoiceNumber: 'INV-001',
    sender: { ...draft.sender, name: 'Studio' },
    client: { ...draft.client, name: 'Client' },
    items: [
      { id: 'one', description: 'Design', quantity: '1.5', unitPrice: '10.01' },
    ],
  };
}
