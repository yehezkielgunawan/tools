import {
  checkCancelled,
  checkDocumentFile,
} from '../document-images-shared/conversionLimits';
import type { RasterDocument } from '../document-images-shared/conversionTypes';
import { getPdfErrorMessage, readPdfFile } from '../pdf-shared/pdfFiles';
import { loadPdfDocument } from '../pdf-shared/pdfjsClient';

export async function openPdfRasterDocument(
  file: File,
  signal: AbortSignal,
): Promise<RasterDocument> {
  checkDocumentFile(file);
  const bytes = await readPdfFile(file);
  checkCancelled(signal);
  const task = loadPdfDocument(bytes);
  const abort = () => {
    void task.destroy().catch(() => undefined);
  };
  signal.addEventListener('abort', abort, { once: true });
  try {
    const pdf = await task.promise;
    checkCancelled(signal);
    if (!pdf.numPages) throw new Error('This PDF has no pages.');
    return {
      count: pdf.numPages,
      destroy: task.destroy,
      render: async (number, canvas, maxEdge, renderSignal) => {
        checkCancelled(renderSignal);
        const page = await pdf.getPage(number);
        try {
          checkCancelled(renderSignal);
          const natural = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({
            scale: maxEdge / Math.max(natural.width, natural.height),
          });
          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas rendering is unavailable.');
          const render = page.render({
            canvas,
            canvasContext: context,
            viewport,
            background: 'white',
          });
          const cancel = () => render.cancel();
          renderSignal.addEventListener('abort', cancel, { once: true });
          try {
            await render.promise;
          } finally {
            renderSignal.removeEventListener('abort', cancel);
          }
          checkCancelled(renderSignal);
        } finally {
          page.cleanup();
        }
      },
    };
  } catch (error) {
    await task.destroy();
    checkCancelled(signal);
    throw Object.assign(new Error(getPdfErrorMessage(error)), { cause: error });
  } finally {
    signal.removeEventListener('abort', abort);
  }
}
