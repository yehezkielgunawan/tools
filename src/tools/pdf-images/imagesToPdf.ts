import {
  clip,
  endPath,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
} from 'pdf-lib';
import {
  checkCancelled,
  checkResultSize,
  MAX_CONVERSION_ITEMS,
} from '../document-images-shared/conversionLimits';
import type {
  PdfImageOptions,
  PreparedDocumentImage,
} from '../document-images-shared/conversionTypes';
import { fitImage } from '../document-images-shared/imageLayout';

export async function imagesToPdf(
  images: AsyncIterable<PreparedDocumentImage>,
  options: PdfImageOptions,
  signal: AbortSignal,
): Promise<Blob> {
  const pdf = await PDFDocument.create();
  let count = 0;
  for await (const image of images) {
    checkCancelled(signal);
    if (++count > MAX_CONVERSION_ITEMS)
      throw new RangeError('Choose 50 images or fewer.');
    let [width, height] =
      options.pageSize === 'image'
        ? [image.width * 0.75, image.height * 0.75]
        : options.pageSize === 'letter'
          ? [612, 792]
          : [595.28, 841.89];
    if (options.pageSize !== 'image' && options.orientation === 'landscape')
      [width, height] = [height, width];
    const margin = options.pageSize === 'image' ? 0 : options.margin;
    const boxW = width - 2 * margin;
    const boxH = height - 2 * margin;
    const placement = fitImage(
      image.width,
      image.height,
      boxW,
      boxH,
      options.fit,
    );
    const page = pdf.addPage([width, height]);
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
    const embedded =
      image.mimeType === 'image/png'
        ? await pdf.embedPng(image.bytes)
        : await pdf.embedJpg(image.bytes);
    const scale =
      options.fit === 'cover'
        ? Math.max(boxW / image.width, boxH / image.height)
        : placement.width / image.width;
    const drawW = image.width * scale;
    const drawH = image.height * scale;
    page.pushOperators(
      pushGraphicsState(),
      rectangle(margin, margin, boxW, boxH),
      clip(),
      endPath(),
    );
    page.drawImage(embedded, {
      x: margin + (boxW - drawW) / 2,
      y: margin + (boxH - drawH) / 2,
      width: drawW,
      height: drawH,
    });
    page.pushOperators(popGraphicsState());
  }
  checkCancelled(signal);
  if (!count) throw new Error('Add at least one image.');
  const bytes = await pdf.save();
  checkCancelled(signal);
  checkResultSize(bytes.byteLength);
  return new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
}
