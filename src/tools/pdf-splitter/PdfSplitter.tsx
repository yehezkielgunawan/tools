import { Eye, FileText, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import ToolLayout from '../../components/layout/ToolLayout';
import PdfPreviewPanel from '../pdf-shared/PdfPreviewPanel';
import PdfResults from '../pdf-shared/PdfResults';
import PdfUpload from '../pdf-shared/PdfUpload';
import { parsePageSelection, parseSplitRanges } from '../pdf-shared/pageRanges';
import { getPdfFilename, getSplitFilename } from '../pdf-shared/pdfDownloads';
import {
  getPdfErrorMessage,
  type LoadedPdfFile,
  loadPdfFile,
  MAX_SPLIT_OUTPUTS,
} from '../pdf-shared/pdfFiles';
import { splitPdf } from '../pdf-shared/pdfOperations';
import { usePdfPreviewSelection } from '../pdf-shared/usePdfPreviewSelection';
import { usePdfWorkspace } from '../pdf-shared/usePdfWorkspace';

type SplitMode = 'extract' | 'ranges';
interface RangeRow {
  id: string;
  value: string;
}

function validateSelection(value: string, pageCount: number, mode: SplitMode) {
  try {
    const pages =
      mode === 'extract'
        ? parsePageSelection(value, pageCount)
        : parseSplitRanges([value], pageCount)[0];
    return { pages, error: '' };
  } catch (error) {
    return {
      pages: [] as number[],
      error:
        error instanceof Error ? error.message : 'Check your page selection.',
    };
  }
}

export default function PdfSplitter() {
  const [selected, setSelected] = useState<LoadedPdfFile | null>(null);
  const [mode, setMode] = useState<SplitMode>('extract');
  const [selection, setSelection] = useState('');
  const [ranges, setRanges] = useState<RangeRow[]>([
    { id: 'initial', value: '' },
  ]);
  const [error, setError] = useState('');
  const [activity, setActivity] = useState('');
  const workspace = usePdfWorkspace();
  const preview = usePdfPreviewSelection();
  const [inspectedRange, setInspectedRange] = useState(0);
  const rangeIndex = Math.min(inspectedRange, ranges.length - 1);
  const values =
    mode === 'extract' ? [selection] : ranges.map((range) => range.value);
  const validations = values.map((value) =>
    validateSelection(value, selected?.pageCount ?? 0, mode),
  );
  let groups: number[][] = [];
  let totalError = '';
  if (selected && validations.every((validation) => !validation.error)) {
    try {
      groups =
        mode === 'extract'
          ? [validations[0].pages]
          : parseSplitRanges(values, selected.pageCount);
    } catch (error) {
      totalError =
        error instanceof Error ? error.message : 'Check your ranges.';
    }
  }
  const outputPages = groups.reduce((total, pages) => total + pages.length, 0);

  function invalidate() {
    preview.clearOutput();
    workspace.invalidate();
    setError('');
  }

  async function openFile(files: File[]) {
    if (workspace.busyRef.current || !files.length) return;
    if (files.length !== 1) {
      invalidate();
      setError('Choose one PDF at a time to split.');
      return;
    }
    const job = workspace.begin();
    preview.clearOutput();
    setError('');
    setActivity('Reading PDF…');
    try {
      const loaded = await loadPdfFile(files[0]);
      if (workspace.isCurrent(job)) {
        setSelected(loaded);
        setSelection('');
        setRanges([{ id: crypto.randomUUID(), value: '' }]);
        setInspectedRange(0);
        preview.open({
          id: loaded.id,
          filename: loaded.file.name,
          kind: 'source',
          data: loaded.bytes,
        });
      }
    } catch (error) {
      if (workspace.isCurrent(job))
        setError(
          error instanceof Error ? error.message : getPdfErrorMessage(error),
        );
    } finally {
      workspace.finish(job);
    }
  }

  async function generate() {
    if (!selected || !groups.length || workspace.busyRef.current) return;
    preview.clearOutput();
    const job = workspace.begin();
    setError('');
    setActivity(mode === 'extract' ? 'Extracting pages…' : 'Splitting PDF…');
    try {
      const outputs = await splitPdf(selected.bytes, groups);
      const base = getPdfFilename(selected.file.name, 'document').slice(0, -4);
      workspace.publish(
        job,
        outputs.map((bytes, index) => ({
          bytes,
          filename:
            mode === 'extract'
              ? `${base}-extracted.pdf`
              : getSplitFilename(selected.file.name, groups[index], index + 1),
          pageCount: groups[index].length,
          originalPages: groups[index],
        })),
      );
    } catch (error) {
      if (workspace.isCurrent(job)) setError(getPdfErrorMessage(error));
    } finally {
      workspace.finish(job);
    }
  }

  return (
    <ToolLayout
      category="PDF"
      description="Extract the pages you need, or divide a PDF into separate page ranges. Your file stays on this device."
      title="PDF Splitter"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">
            01 <span className="mx-2 text-base-content/35">/</span> Choose a
            document
          </h2>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              invalidate();
              preview.close(false);
              setSelected(null);
              setSelection('');
              setRanges([{ id: crypto.randomUUID(), value: '' }]);
              setMode('extract');
            }}
            type="button"
          >
            Reset
          </button>
        </div>
        <PdfUpload
          disabled={workspace.busy}
          onFiles={(files) => void openFile(files)}
        />
        {error ? (
          <div className="alert alert-error text-sm" role="alert">
            {error}
          </div>
        ) : null}
        {workspace.busy ? (
          <p className="text-sm text-base-content/70" role="status">
            {activity}
          </p>
        ) : null}
        {selected ? (
          <div className="flex items-center gap-3 rounded-box border border-base-300 p-4">
            <FileText
              aria-hidden="true"
              className="shrink-0 text-base-content/60"
              size={22}
            />
            <div className="min-w-0">
              <p className="break-all text-sm font-medium">
                {selected.file.name}
              </p>
              <p className="mt-1 text-xs text-base-content/70">
                {selected.pageCount}{' '}
                {selected.pageCount === 1 ? 'page' : 'pages'} ·{' '}
                {(selected.file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            <button
              aria-label={`Preview ${selected.file.name}`}
              className="btn btn-sm ml-auto shrink-0"
              onClick={(event) =>
                preview.open(
                  {
                    id: selected.id,
                    filename: selected.file.name,
                    kind: 'source',
                    data: selected.bytes,
                  },
                  event.currentTarget,
                )
              }
              type="button"
            >
              <Eye aria-hidden="true" size={16} />
              Preview
            </button>
          </div>
        ) : null}
        <fieldset className="space-y-3" disabled={workspace.busy || !selected}>
          <legend className="mb-3 text-sm font-semibold">
            02 <span className="mx-2 text-base-content/35">/</span> Choose how
            to split
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-box border border-base-300 p-4 has-[:checked]:border-base-content/50 has-[:checked]:bg-base-200/50">
              <input
                checked={mode === 'extract'}
                className="radio radio-sm mt-0.5"
                name="pdf-split-mode"
                onChange={() => {
                  invalidate();
                  setMode('extract');
                }}
                type="radio"
              />
              <span>
                <span className="block text-sm font-semibold">
                  Extract selected pages
                </span>
                <span className="mt-1 block text-xs leading-5 text-base-content/70">
                  Keep your chosen pages in one PDF.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-box border border-base-300 p-4 has-[:checked]:border-base-content/50 has-[:checked]:bg-base-200/50">
              <input
                checked={mode === 'ranges'}
                className="radio radio-sm mt-0.5"
                name="pdf-split-mode"
                onChange={() => {
                  invalidate();
                  setMode('ranges');
                }}
                type="radio"
              />
              <span>
                <span className="block text-sm font-semibold">
                  Split into ranges
                </span>
                <span className="mt-1 block text-xs leading-5 text-base-content/70">
                  Make a separate PDF for each range.
                </span>
              </span>
            </label>
          </div>
        </fieldset>
        {selected ? (
          <section
            aria-labelledby="pdf-selection-heading"
            className="space-y-4"
          >
            <h2 className="text-sm font-semibold" id="pdf-selection-heading">
              03 <span className="mx-2 text-base-content/35">/</span>{' '}
              {mode === 'extract' ? 'Select your pages' : 'Set your ranges'}
            </h2>
            {mode === 'extract' ? (
              <div className="space-y-2">
                <label
                  className="block text-sm font-medium"
                  htmlFor="extract-pages"
                >
                  Pages to extract
                </label>
                <input
                  aria-describedby="extract-pages-help extract-pages-feedback"
                  aria-invalid={Boolean(selection && validations[0].error)}
                  className="input w-full"
                  disabled={workspace.busy}
                  id="extract-pages"
                  onChange={(event) => {
                    invalidate();
                    setSelection(event.currentTarget.value);
                  }}
                  placeholder="1-3, 5, 8-10"
                  value={selection}
                />
                <p
                  className="text-xs leading-5 text-base-content/70"
                  id="extract-pages-help"
                >
                  Use pages 1–{selected.pageCount}. Pages keep the order you
                  enter. Repeated pages are not allowed.
                </p>
                <p
                  aria-live="polite"
                  className={`text-xs ${selection && validations[0].error ? 'text-error' : 'text-base-content/70'}`}
                  id="extract-pages-feedback"
                >
                  {selection
                    ? validations[0].error ||
                      `${validations[0].pages.length} pages selected`
                    : 'Enter pages or ranges separated by commas.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {ranges.map((range, index) => {
                  const validation = validations[index];
                  const inputId = `split-range-${range.id}`;
                  return (
                    <div
                      className="rounded-box border border-base-300 p-4"
                      key={range.id}
                    >
                      <div className="flex items-end gap-3">
                        <div className="min-w-0 flex-1 space-y-2">
                          <label
                            className="block text-sm font-medium"
                            htmlFor={inputId}
                          >
                            Range {index + 1}
                          </label>
                          <input
                            aria-describedby={`${inputId}-feedback`}
                            aria-invalid={Boolean(
                              range.value && validation.error,
                            )}
                            className="input w-full"
                            disabled={workspace.busy}
                            id={inputId}
                            onChange={(event) => {
                              invalidate();
                              const value = event.currentTarget.value;
                              setRanges(
                                ranges.map((row) =>
                                  row.id === range.id ? { ...row, value } : row,
                                ),
                              );
                            }}
                            placeholder="1-3"
                            value={range.value}
                          />
                        </div>
                        <button
                          aria-label={`Remove range ${index + 1}`}
                          className="btn btn-ghost btn-square"
                          disabled={workspace.busy || ranges.length === 1}
                          onClick={() => {
                            invalidate();
                            setRanges(
                              ranges.filter((row) => row.id !== range.id),
                            );
                          }}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" size={16} />
                        </button>
                      </div>
                      <p
                        aria-live="polite"
                        className={`mt-2 text-xs ${range.value && validation.error ? 'text-error' : 'text-base-content/70'}`}
                        id={`${inputId}-feedback`}
                      >
                        {range.value
                          ? validation.error ||
                            `${validation.pages.length} pages in this PDF`
                          : `One page or range, from 1 to ${selected.pageCount}.`}
                      </p>
                    </div>
                  );
                })}
                <button
                  className="btn btn-sm"
                  disabled={
                    workspace.busy || ranges.length >= MAX_SPLIT_OUTPUTS
                  }
                  onClick={() => {
                    invalidate();
                    setRanges([
                      ...ranges,
                      { id: crypto.randomUUID(), value: '' },
                    ]);
                  }}
                  type="button"
                >
                  <Plus aria-hidden="true" size={15} />
                  Add range
                </button>
                <p className="text-xs leading-5 text-base-content/70">
                  Each row creates one PDF. Ranges may overlap; unselected pages
                  are omitted. Up to 20 outputs.
                </p>
              </div>
            )}
            {totalError ? (
              <p className="text-sm text-error" role="alert">
                {totalError}
              </p>
            ) : null}
            <div className="flex flex-col gap-3 border-t border-base-300 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-base-content/70">
                {groups.length
                  ? `${groups.length} ${groups.length === 1 ? 'PDF' : 'PDFs'} · ${outputPages} output pages`
                  : 'Choose valid pages to continue.'}{' '}
                <span className="block mt-1">
                  Up to 500 output pages combined.
                </span>
              </p>
              <button
                className="btn"
                disabled={workspace.busy || !groups.length}
                onClick={() => void generate()}
                type="button"
              >
                {mode === 'extract' ? 'Extract pages' : 'Split PDF'}
              </button>
            </div>
          </section>
        ) : (
          <p className="rounded-box border border-dashed border-base-300 p-6 text-center text-sm text-base-content/60">
            Choose a PDF to select its pages.
          </p>
        )}
        <PdfResults
          outputs={workspace.outputs}
          onPreview={(output, trigger) =>
            preview.open(
              {
                id: output.url,
                filename: output.filename,
                kind: 'output',
                data: output.blob,
                originalPages: output.originalPages,
              },
              trigger,
            )
          }
        />
        {preview.source?.kind === 'source' && mode === 'ranges' ? (
          <div className="space-y-2">
            <label
              className="block text-sm font-medium"
              htmlFor="preview-range"
            >
              Range to inspect
            </label>
            <select
              className="select w-full sm:w-64"
              id="preview-range"
              onChange={(event) =>
                setInspectedRange(Number(event.currentTarget.value))
              }
              value={rangeIndex}
            >
              {ranges.map((range, index) => (
                <option key={range.id} value={index}>
                  Range {index + 1}
                  {range.value ? ` · ${range.value}` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <PdfPreviewPanel
          source={preview.source}
          autoFocus={preview.autoFocus}
          onClose={() => preview.close()}
          describePage={
            preview.source?.kind === 'source'
              ? (number) => {
                  const validation =
                    validations[mode === 'extract' ? 0 : rangeIndex];
                  if (!validation || validation.error || totalError)
                    return 'Selection is invalid.';
                  const included = validation.pages.includes(number);
                  return `${included ? 'Included' : 'Not included'} in ${mode === 'extract' ? 'extraction' : `range ${rangeIndex + 1}`}.`;
                }
              : undefined
          }
        />
      </div>
    </ToolLayout>
  );
}
