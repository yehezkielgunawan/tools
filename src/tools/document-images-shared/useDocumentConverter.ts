import { useEffect, useRef, useState } from 'react';
import { checkCancelled } from './conversionLimits';
import type {
  DocumentKind,
  ImageExportOptions,
  ImageInput,
  PdfImageOptions,
  PptxImageOptions,
  RasterDocument,
} from './conversionTypes';
import { documentToImages } from './documentToImages';
import { inspectImageInputs, prepareDocumentImages } from './imageInputs';
import { baseFilename, getExportPages } from './imageLayout';
import { useConversionJob } from './useConversionJob';

export function useDocumentConverter(kind: DocumentKind) {
  const job = useConversionJob();
  const [images, setImages] = useState<ImageInput[]>([]);
  const [source, setSource] = useState<{
    file: File;
    document: RasterDocument;
  } | null>(null);
  const imagesRef = useRef<ImageInput[]>([]);
  const sourceRef = useRef<RasterDocument | null>(null);

  useEffect(
    () => () => {
      for (const image of imagesRef.current) URL.revokeObjectURL(image.url);
      void sourceRef.current?.destroy().catch(() => undefined);
    },
    [],
  );

  function changeImages(next: ImageInput[]) {
    job.invalidate();
    for (const image of imagesRef.current)
      if (!next.includes(image)) URL.revokeObjectURL(image.url);
    imagesRef.current = next;
    setImages(next);
  }

  function clear() {
    changeImages([]);
    void sourceRef.current?.destroy().catch(() => undefined);
    sourceRef.current = null;
    setSource(null);
  }

  async function addImages(files: File[]) {
    await job.run(async ({ signal }) => {
      const next = await inspectImageInputs(files, imagesRef.current, signal);
      if (signal.aborted) {
        for (const image of next) URL.revokeObjectURL(image.url);
        checkCancelled(signal);
      }
      imagesRef.current = [...imagesRef.current, ...next];
      setImages(imagesRef.current);
    });
  }

  async function openDocument(file: File) {
    clear();
    await job.run(async ({ signal }) => {
      const open =
        kind === 'pdf'
          ? (await import('../pdf-images/pdfToImages')).openPdfRasterDocument
          : (await import('../powerpoint-images/pptxRenderer'))
              .openPptxRasterDocument;
      checkCancelled(signal);
      const document = await open(file, signal);
      if (signal.aborted) {
        await document.destroy();
        checkCancelled(signal);
      }
      sourceRef.current = document;
      setSource({ file, document });
    });
  }

  async function exportImages(selection: string, options: ImageExportOptions) {
    if (!source) return;
    await job.run(async ({ signal, progress }) => {
      const pages = getExportPages(selection, source.document.count);
      return documentToImages(
        source.document,
        source.file.name,
        kind,
        pages,
        options,
        signal,
        progress,
      );
    });
  }

  async function exportDocument(
    filename: string,
    pdf: PdfImageOptions,
    pptx: PptxImageOptions,
  ) {
    await job.run(async ({ signal, progress }) => {
      const prepared = prepareDocumentImages(images, signal, progress);
      const blob =
        kind === 'pdf'
          ? await (await import('../pdf-images/imagesToPdf')).imagesToPdf(
              prepared,
              pdf,
              signal,
            )
          : await (
              await import('../powerpoint-images/imagesToPptx')
            ).imagesToPptx(prepared, pptx, signal);
      return [{ filename: `${baseFilename(filename)}.${kind}`, blob }];
    });
  }

  return {
    job,
    images,
    source,
    clear,
    changeImages,
    addImages,
    openDocument,
    exportImages,
    exportDocument,
  };
}
