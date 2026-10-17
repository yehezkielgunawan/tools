// @rstest-environment happy-dom
import { afterEach, describe, expect, it, rs } from '@rstest/core';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import InvoiceGenerator from '../src/tools/invoice/InvoiceGenerator';
import { encodeInvoice } from '../src/tools/invoice/invoiceShare';
import {
  INVOICE_STORAGE_KEY,
  saveInvoice,
} from '../src/tools/invoice/invoiceStorage';
import { completeInvoice } from './invoiceFixture';

afterEach(() => {
  rs.restoreAllMocks();
  localStorage.clear();
  rs.useRealTimers();
});
function open(path = '/generator/invoice') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <InvoiceGenerator />
    </MemoryRouter>,
  );
}
describe('invoice editor and viewer', () => {
  it('restores a draft and previews its calculated total', () => {
    saveInvoice(localStorage, completeInvoice());
    open();
    expect(screen.getByLabelText('Invoice number')).toHaveValue('INV-001');
    expect(screen.getAllByText('USD 15.02').length).toBeGreaterThan(0);
  });
  it('clears only invoice data and does not resurrect a pending save', async () => {
    rs.useFakeTimers();
    rs.spyOn(window, 'confirm').mockReturnValue(true);
    localStorage.setItem('theme', 'dark');
    open();
    fireEvent.change(screen.getByLabelText('Invoice number'), {
      target: { value: 'pending' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Clear saved invoice data' }),
    );
    await act(async () => {
      await rs.advanceTimersByTimeAsync(1000);
    });
    expect(localStorage.getItem(INVOICE_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(screen.getByLabelText('Invoice number')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Invoice number'), {
      target: { value: 'new' },
    });
    await act(async () => {
      await rs.advanceTimersByTimeAsync(500);
    });
    expect(
      JSON.parse(localStorage.getItem(INVOICE_STORAGE_KEY) ?? '{}')
        .invoiceNumber,
    ).toBe('new');
  });
  it('opens snapshots read-only without changing the saved draft', async () => {
    saveInvoice(localStorage, { ...completeInvoice(), invoiceNumber: 'LOCAL' });
    const stored = localStorage.getItem(INVOICE_STORAGE_KEY);
    const url = encodeInvoice(completeInvoice(), 'https://example.com');
    open(`/generator/invoice${new URL(url).hash}`);
    expect(screen.queryByLabelText('Invoice number')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled();
    expect(localStorage.getItem(INVOICE_STORAGE_KEY)).toBe(stored);
    const confirm = rs.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Make a copy' }));
    expect(screen.queryByLabelText('Invoice number')).not.toBeInTheDocument();
    expect(localStorage.getItem(INVOICE_STORAGE_KEY)).toBe(stored);
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Make a copy' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Invoice number')).toHaveValue('INV-001'),
    );
  });
  it('keeps an invalid link separate from the local draft', () => {
    saveInvoice(localStorage, completeInvoice());
    open('/generator/invoice#invoice=v2.bad');
    expect(
      screen.getByRole('heading', { name: 'Unable to open invoice' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Invoice number')).not.toBeInTheDocument();
    expect(localStorage.getItem(INVOICE_STORAGE_KEY)).not.toBeNull();
  });
  it('reports unavailable storage and still allows editing', () => {
    rs.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('Blocked');
    });
    open();
    expect(screen.getByText(/Could not restore/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Invoice number'), {
      target: { value: 'Works' },
    });
    expect(screen.getByLabelText('Invoice number')).toHaveValue('Works');
  });
  it('consumes copied navigation state so reload cannot resurrect a cleared invoice', async () => {
    function StateProbe() {
      return (
        <output aria-label="Navigation state">
          {JSON.stringify(useLocation().state)}
        </output>
      );
    }
    rs.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/generator/invoice',
            state: { invoiceCopy: completeInvoice() },
          },
        ]}
      >
        <InvoiceGenerator />
        <StateProbe />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Invoice number')).toHaveValue('INV-001'),
    );
    expect(screen.getByLabelText('Navigation state')).toHaveTextContent('null');
    fireEvent.click(
      screen.getByRole('button', { name: 'Clear saved invoice data' }),
    );
    expect(screen.getByLabelText('Invoice number')).toHaveValue('');
    expect(localStorage.getItem(INVOICE_STORAGE_KEY)).toBeNull();
  });
  it('offers a selectable share link when clipboard access fails', async () => {
    saveInvoice(localStorage, completeInvoice());
    rs.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new Error('Denied'),
    );
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Copy share link' }));
    const input = await screen.findByLabelText('Share link');
    expect(input).toHaveAttribute('readonly');
    expect((input as HTMLInputElement).value).toContain('#invoice=v1.');
  });
  it('retains the editable copy when storage is unavailable', async () => {
    rs.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('Blocked');
    });
    rs.spyOn(window, 'confirm').mockReturnValue(true);
    const url = encodeInvoice(completeInvoice(), 'https://example.com');
    open(`/generator/invoice${new URL(url).hash}`);
    fireEvent.click(screen.getByRole('button', { name: 'Make a copy' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Invoice number')).toHaveValue('INV-001'),
    );
    expect(screen.getByText(/could not be saved/)).toBeInTheDocument();
  });
});
