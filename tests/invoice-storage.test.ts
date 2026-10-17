import { describe, expect, it } from '@rstest/core';
import { createInvoice } from '../src/tools/invoice/invoiceModel';
import {
  clearInvoice,
  INVOICE_STORAGE_KEY,
  loadInvoice,
  saveInvoice,
} from '../src/tools/invoice/invoiceStorage';

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}
describe('invoice storage', () => {
  it('restores incomplete drafts and clears only its own key', () => {
    const store = storage();
    store.setItem('theme', 'dark');
    const draft = createInvoice();
    saveInvoice(store, draft);
    expect(loadInvoice(store)).toEqual(draft);
    clearInvoice(store);
    expect(loadInvoice(store)).toBeNull();
    expect(store.getItem('theme')).toBe('dark');
  });
  it('reports malformed data and unavailable storage', () => {
    const store = storage();
    store.setItem(INVOICE_STORAGE_KEY, '{');
    expect(() => loadInvoice(store)).toThrow();
    expect(() =>
      saveInvoice(
        {
          ...store,
          setItem: () => {
            throw new Error('Quota exceeded');
          },
        },
        createInvoice(),
      ),
    ).toThrow('Quota exceeded');
  });
});
