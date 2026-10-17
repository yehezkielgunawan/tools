import { useCallback, useEffect, useRef, useState } from 'react';
import { createInvoice, type InvoiceDraft } from './invoiceModel';
import { clearInvoice, loadInvoice, saveInvoice } from './invoiceStorage';

export function useInvoiceDraft(copy?: InvoiceDraft) {
  const [initial] = useState(() => {
    if (copy) return { draft: copy, error: '' };
    try {
      return {
        draft: loadInvoice(window.localStorage) ?? createInvoice(),
        error: '',
      };
    } catch {
      return {
        draft: createInvoice(),
        error:
          'Could not restore the saved invoice. Browser storage may be unavailable or the draft is damaged. You can clear saved invoice data and continue editing.',
      };
    }
  });
  const [draft, setDraft] = useState(initial.draft);
  const [message, setMessage] = useState(initial.error);
  const [status, setStatus] = useState('Changes are saved on this browser.');
  const pending = useRef<InvoiceDraft | null>(copy ?? null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const flush = useCallback(() => {
    cancel();
    if (!pending.current) return;
    try {
      saveInvoice(window.localStorage, pending.current);
      pending.current = null;
      setMessage('');
      setStatus('Draft saved on this browser.');
    } catch {
      setMessage(
        'Your draft could not be saved. You can keep editing, download a PDF, or copy a share link.',
      );
    }
  }, [cancel]);
  const update = useCallback(
    (next: InvoiceDraft) => {
      setDraft(next);
      pending.current = next;
      setStatus('Saving draft…');
      cancel();
      timer.current = setTimeout(flush, 400);
    },
    [cancel, flush],
  );
  const reset = useCallback(() => {
    cancel();
    pending.current = null;
    setDraft(createInvoice());
    try {
      clearInvoice(window.localStorage);
      setMessage('');
      setStatus(
        'Saved invoice data cleared. Nothing is stored until you edit again.',
      );
    } catch {
      setMessage(
        'Could not remove the saved draft from browser storage. Check your browser storage settings and try clearing again.',
      );
    }
  }, [cancel]);
  useEffect(() => {
    flush();
    const hidden = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', flush);
      // Persist a pending edit on navigation, but never resurrect a reset draft.
      cancel();
      if (pending.current) {
        try {
          saveInvoice(window.localStorage, pending.current);
        } catch {
          /* The next editor visit reports unavailable storage. */
        }
      }
    };
  }, [cancel, flush]);
  return { draft, update, reset, message, status };
}
