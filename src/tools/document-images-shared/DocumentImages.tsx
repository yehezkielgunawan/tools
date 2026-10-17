import { ArrowRightLeft, FileImage, Images } from 'lucide-react';
import { useState } from 'react';
import ToolLayout from '../../components/layout/ToolLayout';
import ConversionResults from './ConversionResults';
import {
  DocumentExportSettings,
  ImageExportSettings,
  Setting,
} from './ConversionSettings';
import type {
  DocumentKind,
  ImageExportOptions,
  PdfImageOptions,
  PptxImageOptions,
} from './conversionTypes';
import ImageQueue from './ImageQueue';
import { baseFilename, getExportPages } from './imageLayout';
import SourcePreview from './SourcePreview';
import { useDocumentConverter } from './useDocumentConverter';

export default function DocumentImages({ kind }: { kind: DocumentKind }) {
  const name = kind === 'pdf' ? 'PDF' : 'PowerPoint';
  const extension = kind.toUpperCase();
  const [direction, setDirection] = useState<'to-images' | 'from-images'>(
    'to-images',
  );
  const [selection, setSelection] = useState('');
  const [filename, setFilename] = useState('images');
  const [imageOptions, setImageOptions] = useState<ImageExportOptions>({
    format: 'image/png',
    maxEdge: 1600,
    quality: 0.85,
  });
  const [pdfOptions, setPdfOptions] = useState<PdfImageOptions>({
    pageSize: 'a4',
    orientation: 'portrait',
    margin: 18,
    fit: 'contain',
  });
  const [pptxOptions, setPptxOptions] = useState<PptxImageOptions>({
    layout: 'wide',
    fit: 'contain',
  });
  const converter = useDocumentConverter(kind);
  const { job, source, images } = converter;
  const toImages = direction === 'to-images';
  let selectionError = '';
  let selectedCount = 0;
  if (source) {
    try {
      selectedCount = getExportPages(selection, source.document.count).length;
    } catch (error) {
      selectionError =
        error instanceof Error ? error.message : 'Check the page selection.';
    }
  }

  function reset() {
    converter.clear();
    setSelection('');
  }

  return (
    <ToolLayout
      category={kind === 'pdf' ? 'PDF' : 'Image'}
      title={`${name} ↔ Images`}
      description={`Turn ${kind === 'pdf' ? 'PDF pages' : 'PowerPoint slides'} into images, or assemble your images into a ${name === 'PDF' ? 'PDF' : 'presentation'}. All on your device.`}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 pb-5">
          <fieldset
            className="flex flex-wrap gap-2"
            aria-label="Conversion direction"
          >
            <button
              type="button"
              className={`btn btn-sm ${toImages ? 'btn-neutral' : 'btn-ghost'}`}
              aria-pressed={toImages}
              disabled={job.busy}
              onClick={() => {
                if (!toImages) {
                  reset();
                  setDirection('to-images');
                }
              }}
            >
              <FileImage size={16} aria-hidden="true" />
              {extension} → Images
            </button>
            <button
              type="button"
              className={`btn btn-sm ${!toImages ? 'btn-neutral' : 'btn-ghost'}`}
              aria-pressed={!toImages}
              disabled={job.busy}
              onClick={() => {
                if (toImages) {
                  reset();
                  setDirection('from-images');
                }
              }}
            >
              <Images size={16} aria-hidden="true" />
              Images → {extension}
            </button>
          </fieldset>
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            onClick={reset}
          >
            Clear all
          </button>
        </div>

        {kind === 'pptx' && toImages ? (
          <p className="rounded-box border border-base-300 bg-base-200 p-4 text-sm leading-6 text-base-content/75">
            PPTX rendering is best-effort. Fonts may be substituted; complex
            layouts, charts, SmartArt, and effects may differ or be omitted.
            Animations and media playback are not exported. Legacy .ppt files
            are not supported.
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="min-w-0 space-y-4">
            <div className="rounded-box border border-dashed border-base-content/25 bg-base-200/40 p-5 sm:p-6">
              <div className="mb-4 flex items-start gap-3">
                <span className="mt-1 text-base-content/60">
                  <FileImage size={24} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold">
                    {toImages
                      ? `Start with a ${extension}`
                      : 'Build from your images'}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-base-content/65">
                    {toImages
                      ? 'One document, up to 32 MiB. Export up to 50 pages or slides at a time.'
                      : 'JPEG and PNG · up to 50 images · 64 MiB combined.'}
                  </p>
                </div>
              </div>
              <Setting label={toImages ? `Choose ${extension}` : 'Add images'}>
                <input
                  key={direction + (source?.file.name ?? '') + images.length}
                  className="file-input w-full min-w-0"
                  type="file"
                  accept={
                    toImages
                      ? kind === 'pdf'
                        ? '.pdf,application/pdf'
                        : '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation'
                      : '.png,.jpg,.jpeg,image/png,image/jpeg'
                  }
                  multiple={!toImages}
                  disabled={job.busy}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (!files.length) return;
                    e.target.value = '';
                    if (toImages) {
                      setSelection('');
                      void converter.openDocument(files[0]);
                    } else void converter.addImages(files);
                  }}
                />
              </Setting>
            </div>
            {toImages && source ? (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="min-w-0 break-all text-sm font-medium">
                    {source.file.name}
                  </p>
                  <p className="text-xs text-base-content/60">
                    {source.document.count}{' '}
                    {kind === 'pdf' ? 'pages' : 'slides'}
                  </p>
                </div>
                {!job.busy ? (
                  <SourcePreview
                    key={source.file.name}
                    source={source.document}
                    unit={kind === 'pdf' ? 'page' : 'slide'}
                  />
                ) : null}
              </>
            ) : null}
            {!toImages && images.length ? (
              <ImageQueue
                images={images}
                disabled={job.busy}
                onChange={converter.changeImages}
              />
            ) : null}
            {!source && !images.length && !job.busy ? (
              <div className="flex min-h-32 items-center justify-center gap-3 text-sm text-base-content/50">
                <ArrowRightLeft size={18} aria-hidden="true" />
                <p>
                  {toImages
                    ? 'Your document preview will appear here.'
                    : 'Your images become pages, in order.'}
                </p>
              </div>
            ) : null}
          </div>

          <fieldset
            disabled={job.busy}
            className="min-w-0 space-y-4 rounded-box border border-base-300 bg-base-200/30 p-4"
          >
            <legend className="px-1 text-xs font-semibold uppercase tracking-widest text-base-content/65">
              Export settings
            </legend>
            {toImages ? (
              <>
                <Setting
                  label={
                    kind === 'pdf' ? 'Pages to export' : 'Slides to export'
                  }
                >
                  <input
                    className="input w-full"
                    value={selection}
                    placeholder="All, or 1-3, 5"
                    onChange={(e) => {
                      job.invalidate();
                      setSelection(e.target.value);
                    }}
                    aria-invalid={Boolean(selectionError)}
                    aria-describedby="selection-description"
                  />
                </Setting>
                <p
                  id="selection-description"
                  className={`text-xs leading-5 ${selectionError ? 'text-error' : 'text-base-content/65'}`}
                >
                  {selectionError ||
                    (source
                      ? `${selectedCount} selected. Leave blank to export all.`
                      : 'Leave blank for all, or enter page numbers and ranges.')}
                </p>
                <ImageExportSettings
                  options={imageOptions}
                  onChange={(next) => {
                    job.invalidate();
                    setImageOptions(next);
                  }}
                />
              </>
            ) : (
              <>
                <Setting label="Output filename">
                  <input
                    className="input w-full"
                    value={filename}
                    onChange={(e) => {
                      job.invalidate();
                      setFilename(e.target.value);
                    }}
                  />
                </Setting>
                <DocumentExportSettings
                  kind={kind}
                  pdf={pdfOptions}
                  pptx={pptxOptions}
                  onPdfChange={(next) => {
                    job.invalidate();
                    setPdfOptions(next);
                  }}
                  onPptxChange={(next) => {
                    job.invalidate();
                    setPptxOptions(next);
                  }}
                />
              </>
            )}
          </fieldset>
        </div>

        {job.error ? (
          <div className="alert alert-error text-sm" role="alert">
            {job.error}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 border-t border-base-300 pt-5">
          <button
            className="btn btn-primary"
            type="button"
            disabled={
              job.busy ||
              (toImages ? !source || Boolean(selectionError) : !images.length)
            }
            onClick={() => {
              if (toImages)
                void converter.exportImages(selection, imageOptions);
              else
                void converter.exportDocument(
                  filename,
                  pdfOptions,
                  pptxOptions,
                );
            }}
          >
            <ArrowRightLeft size={16} aria-hidden="true" />
            {job.busy
              ? 'Processing…'
              : toImages
                ? 'Convert to images'
                : `Create ${extension}`}
          </button>
          {job.busy ? (
            <>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={job.cancel}
              >
                Cancel
              </button>
              <p className="text-sm text-base-content/65" role="status">
                {job.progress.total
                  ? `${job.progress.done} of ${job.progress.total} processed`
                  : 'Preparing files…'}
              </p>
            </>
          ) : (
            <p className="text-xs text-base-content/60">
              Files stay in this tab and are cleared when you leave.
            </p>
          )}
        </div>
        {job.busy ? (
          <progress
            className="progress w-full"
            value={job.progress.done}
            max={job.progress.total || 1}
            aria-label="Conversion progress"
          />
        ) : null}
        {job.outputs.length ? (
          <ConversionResults
            key={job.outputs[0].url}
            outputs={job.outputs}
            zipName={`${baseFilename(source?.file.name ?? filename)}-images.zip`}
          />
        ) : null}
      </div>
    </ToolLayout>
  );
}
