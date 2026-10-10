import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { useCallback, useEffect, useState } from 'react';
import { type LocalPdfLoadingTask, loadPdfDocument } from './pdfjsClient';
import type { PdfPreviewSource } from './pdfPreviewModel';

export function usePdfPreview(source: PdfPreviewSource) {
  const [session, setSession] = useState<{
    id: string;
    attempt: number;
    document: PDFDocumentProxy;
  } | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageState, setPageState] = useState<{
    document: PDFDocumentProxy;
    page: PDFPageProxy;
  } | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const document =
    session?.id === source.id && session.attempt === attempt
      ? session.document
      : null;
  const page =
    pageState?.document === document && pageState.page.pageNumber === pageNumber
      ? pageState.page
      : null;
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    let task: LocalPdfLoadingTask | null = null;
    setSession(null);
    setPageNumber(1);
    setError('');
    const open = async () => {
      try {
        const bytes =
          source.data instanceof Uint8Array
            ? source.data
            : new Uint8Array(await source.data.arrayBuffer());
        if (cancelled) return;
        task = loadPdfDocument(bytes);
        const document = await task.promise;
        if (!cancelled) setSession({ id: source.id, attempt, document });
      } catch {
        if (!cancelled)
          setError(
            'Could not preview this PDF. Your file and downloads are still available.',
          );
        void task?.destroy().catch(() => undefined);
      }
    };
    void open();
    return () => {
      cancelled = true;
      void task?.destroy().catch(() => undefined);
    };
  }, [source.id, source.data, attempt]);

  useEffect(() => {
    if (!document) return;
    let cancelled = false;
    setError('');
    void document
      .getPage(pageNumber)
      .then((page) => {
        if (!cancelled) setPageState({ document, page });
      })
      .catch(() => {
        if (!cancelled)
          setError(
            'This page could not be previewed. Your file and downloads are still available.',
          );
      });
    return () => {
      cancelled = true;
    };
  }, [document, pageNumber]);

  return { document, page, pageNumber, setPageNumber, error, retry };
}
