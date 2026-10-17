import {
  checkCancelled,
  checkDocumentFile,
} from '../document-images-shared/conversionLimits';
import type { RasterDocument } from '../document-images-shared/conversionTypes';

export async function openPptxRasterDocument(
  file: File,
  signal: AbortSignal,
): Promise<RasterDocument> {
  checkDocumentFile(file);
  if (!/\.pptx$/i.test(file.name))
    throw new Error(
      'Choose a .pptx presentation. Legacy .ppt files are not supported.',
    );
  const signature = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (
    signature[0] !== 80 ||
    signature[1] !== 75 ||
    signature[2] !== 3 ||
    signature[3] !== 4
  )
    throw new Error('This file is not a valid PPTX archive.');
  checkCancelled(signal);
  const { PptxRenderer } = await import('pptx-browser');
  const renderer = new PptxRenderer();
  try {
    await renderer.load(file);
    checkCancelled(signal);
    if (!renderer.slideCount)
      throw new Error('This presentation has no slides.');
    const { cx, cy } = renderer.slideSize;
    if (
      ![cx, cy].every((v) => Number.isSafeInteger(v) && v > 0) ||
      cx / cy > 100 ||
      cy / cx > 100
    )
      throw new Error('This presentation has unsupported slide dimensions.');
    return {
      count: renderer.slideCount,
      destroy: async () => renderer.destroy(),
      render: async (page, canvas, maxEdge, renderSignal) => {
        checkCancelled(renderSignal);
        await renderer.renderSlide(
          page - 1,
          canvas,
          Math.max(1, Math.round((maxEdge * cx) / Math.max(cx, cy))),
        );
        checkCancelled(renderSignal);
      },
    };
  } catch (error) {
    renderer.destroy();
    throw error;
  }
}
