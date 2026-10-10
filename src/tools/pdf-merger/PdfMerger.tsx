import { ArrowDown, ArrowUp, FileText, Trash2 } from 'lucide-react';
import { useState } from 'react';
import ToolLayout from '../../components/layout/ToolLayout';
import PdfResults from '../pdf-shared/PdfResults';
import PdfUpload from '../pdf-shared/PdfUpload';
import { getPdfFilename } from '../pdf-shared/pdfDownloads';
import {
  getPdfErrorMessage,
  type LoadedPdfFile,
  loadPdfFile,
  MAX_MERGE_BYTES,
  MAX_OUTPUT_PAGES,
} from '../pdf-shared/pdfFiles';
import { mergePdfs } from '../pdf-shared/pdfOperations';
import { usePdfWorkspace } from '../pdf-shared/usePdfWorkspace';

export default function PdfMerger() {
  const [files, setFiles] = useState<LoadedPdfFile[]>([]);
  const [filename, setFilename] = useState('merged.pdf');
  const [errors, setErrors] = useState<string[]>([]);
  const [activity, setActivity] = useState('');
  const workspace = usePdfWorkspace();
  const totalPages = files.reduce((total, file) => total + file.pageCount, 0);
  const totalBytes = files.reduce((total, file) => total + file.file.size, 0);

  async function addFiles(selected: File[]) {
    if (workspace.busyRef.current || !selected.length) return;
    const job = workspace.begin();
    setActivity('Reading PDFs…');
    setErrors([]);
    const next = [...files];
    const failures: string[] = [];
    let bytes = totalBytes;
    let pages = totalPages;
    for (const file of selected) {
      if (!workspace.isCurrent(job)) return;
      try {
        if (bytes + file.size > MAX_MERGE_BYTES)
          throw new RangeError('Choose PDFs totaling 100 MB or less.');
        const loaded = await loadPdfFile(file);
        if (!workspace.isCurrent(job)) return;
        if (pages + loaded.pageCount > MAX_OUTPUT_PAGES)
          throw new RangeError('Merge 500 pages or fewer.');
        next.push(loaded);
        bytes += file.size;
        pages += loaded.pageCount;
      } catch (error) {
        failures.push(
          `${file.name}: ${error instanceof Error ? error.message : getPdfErrorMessage(error)}`,
        );
      }
    }
    if (workspace.isCurrent(job)) {
      setFiles(next);
      setErrors([...new Set(failures)]);
    }
    workspace.finish(job);
  }

  function changeQueue(next: LoadedPdfFile[]) {
    workspace.invalidate();
    setFiles(next);
    setErrors([]);
  }

  function moveFile(index: number, direction: number) {
    const next = [...files];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    changeQueue(next);
  }

  async function merge() {
    if (workspace.busyRef.current || files.length < 2) return;
    const job = workspace.begin();
    setActivity('Merging PDFs…');
    setErrors([]);
    try {
      const bytes = await mergePdfs(files.map((file) => file.bytes));
      workspace.publish(job, [
        {
          bytes,
          filename: getPdfFilename(filename, 'merged'),
          pageCount: totalPages,
        },
      ]);
    } catch (error) {
      if (workspace.isCurrent(job)) setErrors([getPdfErrorMessage(error)]);
    } finally {
      workspace.finish(job);
    }
  }

  return (
    <ToolLayout
      category="PDF"
      description="Combine PDFs into one document in the order you choose. Your files stay on this device."
      title="PDF Merger"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">
            01 <span className="mx-2 text-base-content/35">/</span> Choose your
            files
          </h2>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              changeQueue([]);
              setFilename('merged.pdf');
            }}
            type="button"
          >
            Clear all
          </button>
        </div>
        <PdfUpload
          multiple
          disabled={workspace.busy}
          onFiles={(selected) => void addFiles(selected)}
        />
        {errors.length ? (
          <div className="alert alert-error text-sm" role="alert">
            <ul className="space-y-1">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {workspace.busy ? (
          <p className="text-sm text-base-content/70" role="status">
            {activity}
          </p>
        ) : null}
        <section aria-labelledby="merge-order-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold" id="merge-order-heading">
              02 <span className="mx-2 text-base-content/35">/</span> Arrange
              the order
            </h2>
            <p className="text-xs tabular-nums text-base-content/70">
              {files.length} files · {totalPages} pages ·{' '}
              {(totalBytes / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          {files.length ? (
            <ol className="divide-y divide-base-300 rounded-box border border-base-300">
              {files.map((file, index) => (
                <li
                  className="flex flex-wrap items-center gap-3 p-3 sm:p-4"
                  key={file.id}
                >
                  <span className="w-6 text-center text-xs tabular-nums text-base-content/50">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <FileText
                    aria-hidden="true"
                    className="shrink-0 text-base-content/60"
                    size={20}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="break-all text-sm font-medium">
                      {file.file.name}
                    </p>
                    <p className="mt-1 text-xs text-base-content/70">
                      {file.pageCount} {file.pageCount === 1 ? 'page' : 'pages'}{' '}
                      · {(file.file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <div className="ml-auto flex gap-1">
                    <button
                      aria-label={`Move ${file.file.name} up`}
                      className="btn btn-ghost btn-square btn-sm"
                      disabled={workspace.busy || index === 0}
                      onClick={() => moveFile(index, -1)}
                      type="button"
                    >
                      <ArrowUp aria-hidden="true" size={16} />
                    </button>
                    <button
                      aria-label={`Move ${file.file.name} down`}
                      className="btn btn-ghost btn-square btn-sm"
                      disabled={workspace.busy || index === files.length - 1}
                      onClick={() => moveFile(index, 1)}
                      type="button"
                    >
                      <ArrowDown aria-hidden="true" size={16} />
                    </button>
                    <button
                      aria-label={`Remove ${file.file.name}`}
                      className="btn btn-ghost btn-square btn-sm"
                      disabled={workspace.busy}
                      onClick={() =>
                        changeQueue(files.filter((item) => item.id !== file.id))
                      }
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-box border border-dashed border-base-300 p-6 text-center text-sm text-base-content/60">
              Add at least two PDFs to get started.
            </p>
          )}
          <p className="text-xs leading-5 text-base-content/70">
            All pages are included, from top to bottom. Up to 100 MB and 500
            pages combined.
          </p>
        </section>
        <div className="flex flex-col gap-4 border-t border-base-300 pt-5 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <label
              className="block text-sm font-medium"
              htmlFor="merge-filename"
            >
              Output filename
            </label>
            <input
              className="input w-full"
              disabled={workspace.busy}
              id="merge-filename"
              onChange={(event) => {
                workspace.invalidate();
                setFilename(event.currentTarget.value);
              }}
              value={filename}
            />
          </div>
          <button
            className="btn"
            disabled={workspace.busy || files.length < 2}
            onClick={() => void merge()}
            type="button"
          >
            Merge PDFs
          </button>
        </div>
        <PdfResults outputs={workspace.outputs} />
      </div>
    </ToolLayout>
  );
}
