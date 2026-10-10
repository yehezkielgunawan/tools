import { lazy, Suspense } from 'react';
import type { PdfPreviewProps } from './PdfPreview';

const PdfPreview = lazy(() => import('./PdfPreview'));

export default function PdfPreviewPanel(
  props: Omit<PdfPreviewProps, 'source'> & {
    source: PdfPreviewProps['source'] | null;
  },
) {
  if (!props.source) return null;
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-between gap-2 rounded-box border border-base-300 p-4">
          <p role="status">Loading preview controls…</p>
          <button className="btn btn-sm" onClick={props.onClose} type="button">
            Close preview
          </button>
        </div>
      }
    >
      <PdfPreview {...props} source={props.source} key={props.source.id} />
    </Suspense>
  );
}
