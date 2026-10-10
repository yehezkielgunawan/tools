import { Download, Eye } from 'lucide-react';
import type { PdfOutput } from './pdfDownloads';

export default function PdfResults({
  outputs,
  onPreview,
}: {
  outputs: readonly PdfOutput[];
  onPreview?: (output: PdfOutput, trigger: HTMLButtonElement) => void;
}) {
  if (!outputs.length) return null;
  return (
    <section
      aria-label="Generated PDFs"
      className="space-y-3 rounded-box border border-base-300 bg-base-200/30 p-4 sm:p-5"
    >
      <p className="text-sm font-semibold" role="status">
        {outputs.length === 1
          ? 'Your PDF is ready.'
          : `${outputs.length} PDFs are ready.`}
      </p>
      <ul className="space-y-3">
        {outputs.map((output) => (
          <li
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            key={output.url}
          >
            <div className="min-w-0">
              <p className="break-all text-sm font-medium">{output.filename}</p>
              <p className="mt-1 text-xs text-base-content/70">
                {output.pageCount} {output.pageCount === 1 ? 'page' : 'pages'}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {onPreview ? (
                <button
                  aria-label={`Preview ${output.filename}`}
                  className="btn"
                  onClick={(event) => onPreview(output, event.currentTarget)}
                  type="button"
                >
                  <Eye aria-hidden="true" size={16} />
                  Preview
                </button>
              ) : null}
              <a
                aria-label={`Download ${output.filename}`}
                className="btn shrink-0"
                download={output.filename}
                href={output.url}
              >
                <Download aria-hidden="true" size={16} />
                Download
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
