import {
  checkCancelled,
  checkResultSize,
  MAX_CONVERSION_ITEMS,
} from '../document-images-shared/conversionLimits';
import type {
  PptxImageOptions,
  PreparedDocumentImage,
} from '../document-images-shared/conversionTypes';
import { fitImage } from '../document-images-shared/imageLayout';

export async function imagesToPptx(
  images: AsyncIterable<PreparedDocumentImage>,
  options: PptxImageOptions,
  signal: AbortSignal,
): Promise<Blob> {
  const { default: PptxGenJS } = await import('pptxgenjs');
  checkCancelled(signal);
  const pptx = new PptxGenJS();
  pptx.layout = options.layout === 'wide' ? 'LAYOUT_WIDE' : 'LAYOUT_4x3';
  pptx.author = 'Yehezgun Tools';
  pptx.subject = 'Created locally from images';
  const width = options.layout === 'wide' ? 13.333333 : 10;
  const height = 7.5;
  let count = 0;
  for await (const image of images) {
    checkCancelled(signal);
    if (++count > MAX_CONVERSION_ITEMS)
      throw new RangeError('Choose 50 images or fewer.');
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Could not read the image.'));
      reader.readAsDataURL(
        new Blob([new Uint8Array(image.bytes)], { type: image.mimeType }),
      );
    });
    checkCancelled(signal);
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };
    if (options.fit === 'cover') {
      slide.addImage({
        data,
        x: 0,
        y: 0,
        w: image.width / 96,
        h: image.height / 96,
        sizing: { type: 'cover', w: width, h: height },
        altText: `Image ${count}`,
      });
    } else {
      const fitted = fitImage(
        image.width,
        image.height,
        width,
        height,
        'contain',
      );
      slide.addImage({
        data,
        x: fitted.x,
        y: fitted.y,
        w: fitted.width,
        h: fitted.height,
        altText: `Image ${count}`,
      });
    }
  }
  if (!count) throw new Error('Add at least one image.');
  checkCancelled(signal);
  const blob = (await pptx.write({
    outputType: 'blob',
    compression: true,
  })) as Blob;
  checkCancelled(signal);
  checkResultSize(blob.size);
  return blob;
}
