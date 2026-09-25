import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileUp,
  MousePointer2,
  PenLine,
  Redo2,
  ShieldCheck,
  Trash2,
  Type,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import ToolLayout from '../../components/layout/ToolLayout';
import {
  type EditHistoryState,
  editHistoryReducer,
  type NormalizedPoint,
  type PdfEdit,
  type PdfSignatureEdit,
  type PdfTextEdit,
} from './editModel';
import PdfPageView, { type PdfToolMode } from './PdfPageView';
import { createEditedPdf, validatePdfCanEdit } from './pdfEngine';
import { getPdfOpenErrorMessage, readPdfFile } from './pdfFiles';
import { type LocalPdfLoadingTask, loadPdfDocument } from './pdfjsClient';
import SignaturePad from './SignaturePad';

interface OpenDocument {
  bytes: Uint8Array;
  document: PDFDocumentProxy;
  file: File;
  task: LocalPdfLoadingTask;
}

interface EditorStatus {
  kind: 'error' | 'info' | 'success';
  message: string;
}

const EMPTY_HISTORY: EditHistoryState = {
  past: [],
  edits: [],
  future: [],
};
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;

function makeEditId(): string {
  return `pdf-edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getExportErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('WinAnsi cannot encode')) {
    return 'Some text uses characters outside the built-in PDF font set. Try standard Latin characters.';
  }
  return 'Could not export this PDF. The original file and your edits are still available.';
}

function getDownloadName(fileName: string): string {
  const baseName = fileName.replace(/\.pdf$/i, '') || 'document';
  return `${baseName}-edited.pdf`;
}

function getSignatureBounds(strokes: readonly NormalizedPoint[][]): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const points = strokes.flat();
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    left: Math.min(...xs),
    top: Math.min(...ys),
    width: Math.max(0.02, Math.max(...xs) - Math.min(...xs)),
    height: Math.max(0.02, Math.max(...ys) - Math.min(...ys)),
  };
}

function getSelectedEdit(
  edits: readonly PdfEdit[],
  selectedEditId: string | null,
): PdfEdit | null {
  return edits.find((edit) => edit.id === selectedEditId) ?? null;
}

export default function PdfEditor() {
  const [loaded, setLoaded] = useState<OpenDocument | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [zoom, setZoom] = useState(1);
  const [toolMode, setToolMode] = useState<PdfToolMode>('select');
  const [color, setColor] = useState('#202124');
  const [penWidth, setPenWidth] = useState(2.5);
  const [textSize, setTextSize] = useState(18);
  const [textDraft, setTextDraft] = useState('Text');
  const [selectedEditId, setSelectedEditId] = useState<string | null>(null);
  const [signatureDraft, setSignatureDraft] = useState<Omit<
    PdfSignatureEdit,
    'id' | 'pageIndex' | 'x' | 'y'
  > | null>(null);
  const [isSignaturePadOpen, setIsSignaturePadOpen] = useState(false);
  const [status, setStatus] = useState<EditorStatus | null>(null);
  const [history, dispatch] = useReducer(editHistoryReducer, EMPTY_HISTORY);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadGenerationRef = useRef(0);
  const activeTaskRef = useRef<LocalPdfLoadingTask | null>(null);
  const edits = history.edits;
  const selectedEdit = getSelectedEdit(edits, selectedEditId);

  useEffect(() => {
    return () => {
      if (loaded) {
        void loaded.task
          .destroy()
          .catch((error) => console.error('Could not stop PDF worker', error));
      }
    };
  }, [loaded]);

  useEffect(() => {
    return () => {
      loadGenerationRef.current += 1;
      const activeTask = activeTaskRef.current;
      activeTaskRef.current = null;
      if (activeTask) {
        void activeTask
          .destroy()
          .catch((error) => console.error('Could not stop PDF worker', error));
      }
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;

    let cancelled = false;
    setPage(null);
    void loaded.document
      .getPage(pageNumber)
      .then((nextPage) => {
        if (!cancelled) setPage(nextPage);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStatus({
            kind: 'error',
            message: 'This page could not be rendered.',
          });
          console.error('Could not render PDF page', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loaded, pageNumber]);

  const handleOpenFile = async (file: File | undefined) => {
    if (!file) return;
    const activeTask = activeTaskRef.current;
    activeTaskRef.current = null;
    if (activeTask) void activeTask.destroy().catch(() => undefined);
    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    setIsOpening(true);
    setStatus(null);

    try {
      const bytes = await readPdfFile(file);
      if (generation !== loadGenerationRef.current) return;
      const task = loadPdfDocument(bytes);
      activeTaskRef.current = task;
      let document: PDFDocumentProxy;
      try {
        [document] = await Promise.all([
          task.promise,
          validatePdfCanEdit(bytes),
        ]);
      } catch (error) {
        await task.destroy().catch(() => undefined);
        if (activeTaskRef.current === task) activeTaskRef.current = null;
        throw error;
      }

      if (generation !== loadGenerationRef.current) {
        await task.destroy();
        if (activeTaskRef.current === task) activeTaskRef.current = null;
        return;
      }

      if (activeTaskRef.current === task) activeTaskRef.current = null;
      setLoaded({ bytes, document, file, task });
      dispatch({ type: 'reset' });
      setPageNumber(1);
      setSelectedEditId(null);
      setSignatureDraft(null);
      setToolMode('select');
      setZoom(1);
      setStatus({
        kind: 'info',
        message: 'Your PDF is open locally in this tab.',
      });
    } catch (error) {
      if (generation === loadGenerationRef.current) {
        setStatus({ kind: 'error', message: getPdfOpenErrorMessage(error) });
      }
    } finally {
      if (generation === loadGenerationRef.current) setIsOpening(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRenderError = useCallback((error: unknown) => {
    console.error('Could not render PDF page', error);
    setStatus({ kind: 'error', message: 'This page could not be rendered.' });
  }, []);

  const addEdit = (edit: PdfEdit) => {
    dispatch({ type: 'replace', edits: [...edits, edit] });
    setSelectedEditId(edit.id);
  };

  const addTextAt = (point: NormalizedPoint) => {
    if (!textDraft.trim()) {
      setStatus({
        kind: 'info',
        message: 'Enter some text before placing it.',
      });
      return;
    }
    addEdit({
      id: makeEditId(),
      pageIndex: pageNumber - 1,
      kind: 'text',
      x: point.x,
      y: point.y,
      text: textDraft,
      fontSize: textSize,
      color,
    });
    setToolMode('select');
    setStatus({
      kind: 'info',
      message: 'Text added. Drag it to adjust its position.',
    });
  };

  const addPenStroke = (points: NormalizedPoint[]) => {
    addEdit({
      id: makeEditId(),
      pageIndex: pageNumber - 1,
      kind: 'pen',
      points,
      color,
      width: penWidth,
    });
  };

  const placeSignature = (point: NormalizedPoint) => {
    if (!signatureDraft) return;
    addEdit({
      ...signatureDraft,
      id: makeEditId(),
      pageIndex: pageNumber - 1,
      x: Math.min(point.x, 1 - signatureDraft.width),
      y: Math.min(point.y, 1 - signatureDraft.height),
    });
    setStatus({
      kind: 'info',
      message:
        'Signature placed. You can add it to another page or move this one.',
    });
  };

  const updateEdit = (updatedEdit: PdfEdit) => {
    dispatch({
      type: 'replace',
      edits: edits.map((edit) =>
        edit.id === updatedEdit.id ? updatedEdit : edit,
      ),
    });
  };

  const updateSelectedText = (update: (edit: PdfTextEdit) => PdfTextEdit) => {
    if (selectedEdit?.kind !== 'text') return;
    updateEdit(update(selectedEdit));
  };

  const updateColor = (nextColor: string) => {
    setColor(nextColor);
    if (selectedEdit) {
      updateEdit({ ...selectedEdit, color: nextColor });
    }
  };

  const deleteSelectedEdit = () => {
    if (!selectedEditId) return;
    dispatch({
      type: 'replace',
      edits: edits.filter((edit) => edit.id !== selectedEditId),
    });
    setSelectedEditId(null);
  };

  const applySignature = (strokes: NormalizedPoint[][]) => {
    const bounds = getSignatureBounds(strokes);
    const pageWidth = 0.3;
    const aspectRatio = (bounds.width * 720) / (bounds.height * 220);
    const pageViewport = page?.getViewport({ scale: 1 });
    const pageAspect = pageViewport
      ? pageViewport.width / pageViewport.height
      : 0.77;
    const pageHeight = Math.min(
      0.18,
      (pageWidth * pageAspect) / Math.max(aspectRatio, 0.5),
    );

    setSignatureDraft({
      kind: 'signature',
      width: pageWidth,
      height: pageHeight,
      strokes: strokes.map((stroke) =>
        stroke.map((point) => ({
          x: (point.x - bounds.left) / bounds.width,
          y: (point.y - bounds.top) / bounds.height,
        })),
      ),
      color,
      strokeWidth: 2.5,
    });
    setToolMode('signature');
    setIsSignaturePadOpen(false);
    setStatus({
      kind: 'info',
      message: 'Signature ready. Click a page to place it.',
    });
  };

  const exportPdf = async () => {
    if (!loaded) return;
    setIsExporting(true);
    setStatus(null);

    try {
      const pages = await Promise.all(
        Array.from({ length: loaded.document.numPages }, (_, index) =>
          loaded.document.getPage(index + 1),
        ),
      );
      const pageViewports = pages.map((pdfPage) =>
        pdfPage.getViewport({ scale: 1 }),
      );
      const result = await createEditedPdf(loaded.bytes, edits, pageViewports);
      const blob = new Blob([result.slice().buffer], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getDownloadName(loaded.file.name);
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus({
        kind: 'success',
        message:
          'Your edited PDF was downloaded. The original file is unchanged.',
      });
    } catch (error) {
      setStatus({ kind: 'error', message: getExportErrorMessage(error) });
    } finally {
      setIsExporting(false);
    }
  };

  const selectedText = selectedEdit?.kind === 'text' ? selectedEdit : null;
  const selectTool = (mode: PdfToolMode) => {
    if (mode === 'signature' && !signatureDraft) {
      setIsSignaturePadOpen(true);
      return;
    }
    setSelectedEditId(null);
    setToolMode(mode);
    if (mode === 'text') {
      setStatus({
        kind: 'info',
        message: 'Click the page to place your text.',
      });
    } else if (mode === 'pen') {
      setStatus({
        kind: 'info',
        message: 'Draw on the page. Each stroke can be undone.',
      });
    } else if (mode === 'signature') {
      setStatus({
        kind: 'info',
        message: 'Click the page to place your signature.',
      });
    } else {
      setStatus(null);
    }
  };

  const openInput = () => fileInputRef.current?.click();

  return (
    <ToolLayout
      category="PDF"
      description="Add text, draw, and sign a PDF without sending it anywhere."
      title="PDF Editor"
    >
      <div className="space-y-4">
        {!loaded ? (
          <div className="space-y-4">
            <label
              className="group flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-box border border-dashed border-base-content/20 bg-base-200/45 px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void handleOpenFile(event.dataTransfer.files[0]);
              }}
            >
              <input
                accept="application/pdf,.pdf"
                aria-label="Choose a PDF"
                className="sr-only"
                onChange={(event) => {
                  void handleOpenFile(event.currentTarget.files?.[0]);
                }}
                ref={fileInputRef}
                type="file"
              />
              <span className="mb-5 grid size-14 place-items-center rounded-box border border-base-300 bg-base-100 text-base-content/70 shadow-sm transition-transform group-hover:-translate-y-0.5">
                {isOpening ? (
                  <span className="loading loading-spinner loading-md" />
                ) : (
                  <FileUp aria-hidden="true" size={24} strokeWidth={1.6} />
                )}
              </span>
              <span className="text-lg font-semibold tracking-tight">
                {isOpening ? 'Opening your PDF…' : 'Open a PDF to begin'}
              </span>
              <span className="mt-2 max-w-sm text-sm leading-6 text-base-content/55">
                Choose a file from your device or drop it here. Your PDF stays
                on this device.
              </span>
              <span className="btn btn-sm btn-outline mt-6">Choose PDF</span>
            </label>
            <p className="flex items-start justify-center gap-2 px-2 text-center text-xs leading-5 text-base-content/45">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 shrink-0"
                size={14}
              />
              Your document and signature are processed locally and cleared when
              this session ends.
            </p>
          </div>
        ) : (
          <>
            <div className="flex min-w-0 items-center justify-between gap-3 border-b border-base-300 pb-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-field bg-primary/10 text-primary">
                  <FileUp aria-hidden="true" size={17} />
                </span>
                <div className="min-w-0">
                  <p
                    className="truncate text-sm font-semibold"
                    title={loaded.file.name}
                  >
                    {loaded.file.name}
                  </p>
                  <p className="text-xs text-base-content/50">
                    {loaded.document.numPages}{' '}
                    {loaded.document.numPages === 1 ? 'page' : 'pages'}
                    <span className="mx-1.5">·</span>
                    {Math.max(
                      1,
                      Math.round(loaded.file.size / 1024),
                    ).toLocaleString()}{' '}
                    KB
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <input
                  accept="application/pdf,.pdf"
                  aria-label="Choose another PDF"
                  className="sr-only"
                  onChange={(event) => {
                    void handleOpenFile(event.currentTarget.files?.[0]);
                  }}
                  ref={fileInputRef}
                  type="file"
                />
                <button
                  className="btn btn-sm btn-ghost"
                  disabled={isOpening}
                  onClick={openInput}
                  type="button"
                >
                  <FileUp aria-hidden="true" size={15} />
                  <span className="hidden sm:inline">Open another</span>
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  disabled={isExporting}
                  onClick={() => void exportPdf()}
                  type="button"
                >
                  {isExporting ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <Download aria-hidden="true" size={15} />
                  )}
                  <span className="hidden sm:inline">
                    {isExporting ? 'Saving…' : 'Download PDF'}
                  </span>
                  <span className="sm:hidden">Save</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-box border border-base-300 bg-base-200/40 p-2">
              <div className="flex flex-wrap items-center gap-1">
                <fieldset className="join">
                  <legend className="sr-only">Editing tools</legend>
                  <button
                    aria-label="Select and move"
                    aria-pressed={toolMode === 'select'}
                    className={`btn btn-sm join-item ${toolMode === 'select' ? 'btn-active' : 'btn-ghost'}`}
                    onClick={() => selectTool('select')}
                    title="Select and move"
                    type="button"
                  >
                    <MousePointer2 aria-hidden="true" size={16} />
                    <span className="hidden md:inline">Select</span>
                  </button>
                  <button
                    aria-label="Add text"
                    aria-pressed={toolMode === 'text'}
                    className={`btn btn-sm join-item ${toolMode === 'text' ? 'btn-active' : 'btn-ghost'}`}
                    onClick={() => selectTool('text')}
                    title="Add text"
                    type="button"
                  >
                    <Type aria-hidden="true" size={16} />
                    <span className="hidden md:inline">Text</span>
                  </button>
                  <button
                    aria-label="Draw with pen"
                    aria-pressed={toolMode === 'pen'}
                    className={`btn btn-sm join-item ${toolMode === 'pen' ? 'btn-active' : 'btn-ghost'}`}
                    onClick={() => selectTool('pen')}
                    title="Draw with pen"
                    type="button"
                  >
                    <PenLine aria-hidden="true" size={16} />
                    <span className="hidden md:inline">Pen</span>
                  </button>
                  <button
                    aria-label="Draw or place signature"
                    aria-pressed={toolMode === 'signature'}
                    className={`btn btn-sm join-item ${toolMode === 'signature' ? 'btn-active' : 'btn-ghost'}`}
                    onClick={() => selectTool('signature')}
                    title="Draw or place signature"
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className="font-serif text-lg italic"
                    >
                      S
                    </span>
                    <span className="hidden md:inline">Sign</span>
                  </button>
                </fieldset>
                {toolMode === 'signature' && signatureDraft ? (
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setIsSignaturePadOpen(true)}
                    type="button"
                  >
                    Redraw
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {selectedText ? (
                  <input
                    aria-label="Edit selected text"
                    className="input input-sm input-bordered w-32 sm:w-44"
                    onChange={(event) =>
                      updateSelectedText((edit) => ({
                        ...edit,
                        text: event.currentTarget.value,
                      }))
                    }
                    value={selectedText.text}
                  />
                ) : toolMode === 'text' ? (
                  <input
                    aria-label="Text to place"
                    className="input input-sm input-bordered w-32 sm:w-40"
                    onChange={(event) =>
                      setTextDraft(event.currentTarget.value)
                    }
                    value={textDraft}
                  />
                ) : null}
                {toolMode === 'text' || selectedText ? (
                  <select
                    aria-label="Text size"
                    className="select select-sm select-bordered w-20"
                    onChange={(event) => {
                      const nextSize = Number(event.currentTarget.value);
                      setTextSize(nextSize);
                      updateSelectedText((edit) => ({
                        ...edit,
                        fontSize: nextSize,
                      }));
                    }}
                    value={selectedText?.fontSize ?? textSize}
                  >
                    {[12, 14, 16, 18, 22, 28, 36].map((size) => (
                      <option key={size} value={size}>
                        {size} pt
                      </option>
                    ))}
                  </select>
                ) : null}
                {toolMode === 'pen' ? (
                  <select
                    aria-label="Pen width"
                    className="select select-sm select-bordered w-24"
                    onChange={(event) =>
                      setPenWidth(Number(event.currentTarget.value))
                    }
                    value={penWidth}
                  >
                    {[1, 2.5, 4, 6].map((width) => (
                      <option key={width} value={width}>
                        {width} pt
                      </option>
                    ))}
                  </select>
                ) : null}
                <label
                  className="btn btn-sm btn-ghost gap-2 px-2"
                  title="Ink color"
                >
                  <input
                    aria-label="Ink color"
                    className="size-5 cursor-pointer rounded-full border-0 bg-transparent p-0"
                    onChange={(event) => updateColor(event.currentTarget.value)}
                    type="color"
                    value={selectedEdit?.color ?? color}
                  />
                </label>
                {selectedEdit ? (
                  <button
                    aria-label="Delete selected edit"
                    className="btn btn-sm btn-ghost text-error"
                    onClick={deleteSelectedEdit}
                    title="Delete selected edit"
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={15} />
                  </button>
                ) : null}
                <span className="mx-1 h-6 w-px bg-base-300" />
                <button
                  aria-label="Undo"
                  className="btn btn-sm btn-square btn-ghost"
                  disabled={history.past.length === 0}
                  onClick={() => {
                    dispatch({ type: 'undo' });
                    setSelectedEditId(null);
                  }}
                  title="Undo"
                  type="button"
                >
                  <Undo2 aria-hidden="true" size={16} />
                </button>
                <button
                  aria-label="Redo"
                  className="btn btn-sm btn-square btn-ghost"
                  disabled={history.future.length === 0}
                  onClick={() => {
                    dispatch({ type: 'redo' });
                    setSelectedEditId(null);
                  }}
                  title="Redo"
                  type="button"
                >
                  <Redo2 aria-hidden="true" size={16} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-1">
                <button
                  aria-label="Previous page"
                  className="btn btn-sm btn-square btn-ghost"
                  disabled={pageNumber <= 1}
                  onClick={() => {
                    setPageNumber((number) => Math.max(1, number - 1));
                    setSelectedEditId(null);
                  }}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" size={17} />
                </button>
                <span className="min-w-24 text-center text-sm tabular-nums text-base-content/70">
                  Page {pageNumber} of {loaded.document.numPages}
                </span>
                <button
                  aria-label="Next page"
                  className="btn btn-sm btn-square btn-ghost"
                  disabled={pageNumber >= loaded.document.numPages}
                  onClick={() => {
                    setPageNumber((number) =>
                      Math.min(loaded.document.numPages, number + 1),
                    );
                    setSelectedEditId(null);
                  }}
                  type="button"
                >
                  <ChevronRight aria-hidden="true" size={17} />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  aria-label="Zoom out"
                  className="btn btn-sm btn-square btn-ghost"
                  disabled={zoom <= ZOOM_MIN}
                  onClick={() =>
                    setZoom((value) => Math.max(ZOOM_MIN, value - 0.1))
                  }
                  type="button"
                >
                  <ZoomOut aria-hidden="true" size={16} />
                </button>
                <span className="min-w-12 text-center text-xs tabular-nums text-base-content/65">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  aria-label="Zoom in"
                  className="btn btn-sm btn-square btn-ghost"
                  disabled={zoom >= ZOOM_MAX}
                  onClick={() =>
                    setZoom((value) => Math.min(ZOOM_MAX, value + 0.1))
                  }
                  type="button"
                >
                  <ZoomIn aria-hidden="true" size={16} />
                </button>
              </div>
            </div>

            <div className="flex min-h-80 max-h-[68vh] min-w-0 items-start overflow-auto rounded-box border border-base-300 bg-base-200/80 p-4 sm:p-6">
              {page ? (
                <PdfPageView
                  color={color}
                  edits={edits.filter(
                    (edit) => edit.pageIndex === pageNumber - 1,
                  )}
                  onCreatePen={addPenStroke}
                  onCreateText={addTextAt}
                  onMoveEdit={updateEdit}
                  onPlaceSignature={placeSignature}
                  onRenderError={handleRenderError}
                  onSelectEdit={setSelectedEditId}
                  page={page}
                  selectedEditId={selectedEditId}
                  signature={signatureDraft}
                  toolMode={toolMode}
                  zoom={zoom}
                />
              ) : (
                <div className="mx-auto flex min-h-72 items-center gap-3 text-sm text-base-content/55">
                  <span className="loading loading-spinner loading-sm" />
                  Preparing page…
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-base-content/45">
              <span>
                {toolMode === 'select'
                  ? 'Select an edit to move or delete it.'
                  : toolMode === 'text'
                    ? 'Click the page to place text.'
                    : toolMode === 'pen'
                      ? 'Draw directly on the page.'
                      : 'Click the page to place your signature.'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck aria-hidden="true" size={13} />
                Edits stay in this tab until you download or leave.
              </span>
            </div>

            <p className="px-1 text-xs leading-5 text-base-content/40">
              Editing creates a new copy; existing digital signatures may no
              longer be valid.
            </p>

            {status ? (
              <div
                className={`alert alert-${status.kind === 'error' ? 'error' : status.kind === 'success' ? 'success' : 'info'} py-2 text-sm`}
                role={status.kind === 'error' ? 'alert' : 'status'}
              >
                <span>{status.message}</span>
                <button
                  aria-label="Dismiss message"
                  className="btn btn-xs btn-ghost btn-square"
                  onClick={() => setStatus(null)}
                  type="button"
                >
                  <X aria-hidden="true" size={14} />
                </button>
              </div>
            ) : null}
          </>
        )}

        {status?.kind === 'error' && !loaded ? (
          <div className="alert alert-error py-2 text-sm" role="alert">
            <span>{status.message}</span>
            <button
              aria-label="Dismiss message"
              className="btn btn-xs btn-ghost btn-square"
              onClick={() => setStatus(null)}
              type="button"
            >
              <X aria-hidden="true" size={14} />
            </button>
          </div>
        ) : null}
      </div>

      {isSignaturePadOpen ? (
        <SignaturePad
          color={color}
          onApply={applySignature}
          onClose={() => setIsSignaturePadOpen(false)}
        />
      ) : null}
    </ToolLayout>
  );
}
