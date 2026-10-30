import {
  Check,
  Copy,
  Download,
  Image as ImageIcon,
  Search,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ToolLayout from '../../components/layout/ToolLayout';
import CaptionControls from './CaptionControls';
import MemePreview from './MemePreview';
import { fetchMemeTemplates, searchMemeTemplates } from './memeApi';
import { canCopyMeme, copyMeme, downloadMeme } from './memeExport';
import { type CaptionPosition, createDefaultCaptions } from './memeGeometry';
import { exportMemePng } from './memeRenderer';
import type { MemeCaption, MemeTemplate, PreparedMemeImage } from './memeTypes';
import { prepareMemeImage } from './prepareMemeImage';

interface EditorState {
  template: MemeTemplate;
  image: PreparedMemeImage;
  captions: MemeCaption[];
}
function message(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.';
}

export default function MemeMaker() {
  const [templates, setTemplates] = useState<MemeTemplate[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(24);
  const [selected, setSelected] = useState<MemeTemplate | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [artifact, setArtifact] = useState<{
    editor: EditorState;
    blob: Blob;
  } | null>(null);
  const [copying, setCopying] = useState(false);
  const imageRequest = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const image = editor?.image;
  const blob = artifact?.editor === editor ? artifact?.blob : null;
  const filtered = searchMemeTemplates(templates, query);
  const copySupported = canCopyMeme();

  // biome-ignore lint/correctness/useExhaustiveDependencies: retry explicitly invalidates the catalog request.
  useEffect(() => {
    const controller = new AbortController();
    setCatalogLoading(true);
    setCatalogError('');
    fetchMemeTemplates(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setTemplates(result);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setCatalogError(message(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setCatalogLoading(false);
      });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => () => image?.release(), [image]);
  useEffect(
    () => () => {
      imageRequest.current?.abort();
      generation.current += 1;
    },
    [],
  );

  useEffect(() => {
    if (!editor) return;
    let cancelled = false;
    // Coalesce edits and avoid encoding a PNG for every pointer event.
    const timer = setTimeout(() => {
      exportMemePng(editor.image.canvas, editor.captions)
        .then((result) => {
          if (!cancelled) setArtifact({ editor, blob: result });
        })
        .catch((reason) => {
          if (!cancelled) setError(message(reason));
        });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [editor]);

  const selectTemplate = async (template: MemeTemplate): Promise<void> => {
    if (editor?.template.id === template.id) return;
    imageRequest.current?.abort();
    const controller = new AbortController();
    imageRequest.current = controller;
    generation.current += 1;
    setSelected(template);
    setEditor(null);
    setArtifact(null);
    setImageLoading(true);
    setError('');
    setStatus('');
    setActiveIndex(0);
    try {
      const prepared = await prepareMemeImage(template, controller.signal);
      if (controller.signal.aborted) {
        prepared.release();
        return;
      }
      setEditor({
        template,
        image: prepared,
        captions: createDefaultCaptions(template.captionCount),
      });
    } catch (reason) {
      if (!controller.signal.aborted) setError(message(reason));
    } finally {
      if (!controller.signal.aborted) setImageLoading(false);
    }
  };

  const changeCaption = (index: number, patch: Partial<MemeCaption>): void => {
    generation.current += 1;
    setStatus('');
    setError('');
    setArtifact(null);
    setEditor((current) =>
      current
        ? {
            ...current,
            captions: current.captions.map((caption, i) =>
              i === index ? { ...caption, ...patch } : caption,
            ),
          }
        : current,
    );
  };
  const moveCaption = (index: number, position: CaptionPosition): void =>
    changeCaption(index, position);

  const handleCopy = async (): Promise<void> => {
    if (!blob) return;
    const currentGeneration = generation.current;
    setCopying(true);
    setStatus('');
    setError('');
    try {
      await copyMeme(blob);
      if (currentGeneration === generation.current)
        setStatus('Image copied. Paste it into your chat or post.');
    } catch (reason) {
      if (currentGeneration === generation.current) setError(message(reason));
    } finally {
      setCopying(false);
    }
  };

  return (
    <ToolLayout
      category="Image"
      title="Meme Maker"
      description="Find a familiar face. Give it your own punchline. Make a meme without leaving your browser."
      privacyNote="Templates load from a third party. Your captions and finished memes stay on your device."
    >
      <section aria-labelledby="meme-templates-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
              01 / The setup
            </p>
            <h2 id="meme-templates-heading" className="text-xl font-semibold">
              Pick your template
            </h2>
          </div>
          <label className="input w-full sm:w-64">
            <Search aria-hidden="true" size={16} />
            <input
              aria-label="Search templates"
              type="search"
              placeholder="Search templates…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setLimit(24);
              }}
            />
          </label>
        </div>
        <p className="mt-2 text-xs leading-5 text-base-content/60">
          Blank templates from{' '}
          <a
            className="underline underline-offset-2"
            href="https://memegen.link/"
            target="_blank"
            rel="noreferrer"
          >
            Memegen.link
          </a>
          . Search covers this catalog, not the whole web.
        </p>
        {catalogLoading ? (
          <p className="py-8 text-sm" role="status">
            Loading meme templates…
          </p>
        ) : null}
        {catalogError ? (
          <div className="mt-4 rounded-box border border-error/30 p-4">
            <p role="alert">{catalogError}</p>
            <button
              className="btn btn-sm mt-3"
              type="button"
              onClick={() => setRetry((value) => value + 1)}
            >
              Retry templates
            </button>
          </div>
        ) : null}
        {!catalogLoading && !catalogError ? (
          <>
            <div className="mt-4 grid max-h-80 grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.slice(0, limit).map((template) => (
                <button
                  key={template.id}
                  type="button"
                  aria-label={`Use ${template.name}`}
                  aria-pressed={selected?.id === template.id}
                  className={`group relative overflow-hidden rounded-box border text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${selected?.id === template.id ? 'border-base-content bg-base-200' : 'border-base-300 hover:border-base-content/40'}`}
                  onClick={() => {
                    void selectTemplate(template);
                  }}
                >
                  <div className="flex aspect-[16/10] items-center justify-center overflow-hidden bg-base-200">
                    <img
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-contain transition-transform group-hover:scale-[1.03] motion-reduce:transition-none"
                      src={`${template.blankUrl}?width=240`}
                      onError={(event) => {
                        event.currentTarget.hidden = true;
                      }}
                    />
                  </div>
                  <span className="block truncate px-3 py-2 text-xs font-medium">
                    {template.name}
                  </span>
                  {selected?.id === template.id ? (
                    <span className="absolute right-2 top-2 rounded-full bg-neutral p-1 text-neutral-content">
                      <Check aria-hidden="true" size={14} />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            {!filtered.length ? (
              <p className="py-6 text-sm text-base-content/60">
                No templates match “{query}”. Try another name.
              </p>
            ) : null}
            {filtered.length > limit ? (
              <button
                className="btn btn-sm mt-3"
                type="button"
                onClick={() => setLimit((value) => value + 24)}
              >
                Show more templates ({filtered.length - limit} remaining)
              </button>
            ) : null}
          </>
        ) : null}
      </section>

      <section
        aria-labelledby="meme-editor-heading"
        className="mt-8 border-t border-base-300 pt-6"
      >
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
          02 / The punchline
        </p>
        <h2 id="meme-editor-heading" className="text-xl font-semibold">
          Make it yours
        </h2>
        {editor ? (
          <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0 lg:sticky lg:top-6">
              <MemePreview
                image={editor.image}
                templateName={editor.template.name}
                captions={editor.captions}
                activeIndex={activeIndex}
                onActivate={setActiveIndex}
                onMove={moveCaption}
              />
              <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-base-content/60">
                <span>
                  {editor.template.name} · {editor.image.width} ×{' '}
                  {editor.image.height}px
                </span>
                {editor.template.sourceUrl ? (
                  <a
                    href={editor.template.sourceUrl}
                    className="underline underline-offset-2"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Template source
                  </a>
                ) : null}
              </div>
            </div>
            <CaptionControls
              captions={editor.captions}
              activeIndex={activeIndex}
              onActivate={setActiveIndex}
              onChange={changeCaption}
            />
          </div>
        ) : (
          <div className="mt-4 flex min-h-52 flex-col items-center justify-center gap-3 rounded-box border border-dashed border-base-300 bg-base-200/40 px-6 text-center">
            <ImageIcon
              aria-hidden="true"
              size={32}
              className="text-base-content/30"
            />
            <p className="text-sm text-base-content/60" role="status">
              {imageLoading
                ? `Opening ${selected?.name}…`
                : 'Choose a template above to start your meme.'}
            </p>
          </div>
        )}
        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-box border border-error/30 bg-error/5 p-3 text-sm"
          >
            {error}
          </p>
        ) : null}
        {error && selected && !editor && !imageLoading ? (
          <button
            className="btn btn-sm mt-3"
            type="button"
            onClick={() => {
              void selectTemplate(selected);
            }}
          >
            Retry template image
          </button>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-base-300 pt-5">
          <button
            className="btn btn-primary"
            type="button"
            disabled={!blob}
            onClick={() => {
              if (!blob || !editor) return;
              try {
                downloadMeme(blob, editor.template.name);
                setStatus('PNG downloaded. Your meme is ready to share.');
              } catch (reason) {
                setError(message(reason));
              }
            }}
          >
            <Download aria-hidden="true" size={16} />
            Download PNG
          </button>
          <button
            className="btn"
            type="button"
            disabled={!blob || !copySupported || copying}
            onClick={() => {
              void handleCopy();
            }}
          >
            <Copy aria-hidden="true" size={16} />
            {copying ? 'Copying…' : 'Copy image'}
          </button>
          <span className="text-xs text-base-content/60" role="status">
            {status ||
              (editor && !blob ? 'Preparing PNG…' : 'PNG · No added watermark')}
          </span>
        </div>
        {!copySupported ? (
          <p className="mt-3 text-xs text-base-content/60">
            Image copying isn’t available in this browser. Download the PNG
            instead.
          </p>
        ) : null}
      </section>
    </ToolLayout>
  );
}
