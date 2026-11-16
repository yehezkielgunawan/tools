import { assertConverterDimensions } from './converterLimits';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MAX_SVG_BYTES = 2 * 1024 * 1024;
const ELEMENTS = new Set([
  'svg',
  'g',
  'defs',
  'title',
  'desc',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
]);
const ATTRIBUTES = new Set([
  'id',
  'version',
  'viewBox',
  'width',
  'height',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'fx',
  'fy',
  'fr',
  'd',
  'points',
  'transform',
  'preserveAspectRatio',
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'opacity',
  'clip-path',
  'clip-rule',
  'clipPathUnits',
  'gradientUnits',
  'gradientTransform',
  'spreadMethod',
  'offset',
  'stop-color',
  'stop-opacity',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-anchor',
  'dominant-baseline',
  'dx',
  'dy',
  'letter-spacing',
  'word-spacing',
  'textLength',
  'lengthAdjust',
  'vector-effect',
  'color',
]);
const STYLE_PROPERTIES = new Set([
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'opacity',
  'clip-path',
  'clip-rule',
  'stop-color',
  'stop-opacity',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-anchor',
  'dominant-baseline',
  'letter-spacing',
  'word-spacing',
  'vector-effect',
  'color',
]);

function invalidSvg(): Error {
  return new Error(
    'This SVG is invalid or contains unsupported content. Use a self-contained SVG without scripts, stylesheets, images, links, or external resources.',
  );
}

function validateValue(value: string): void {
  // Reject CSS escapes, comments, controls and resource syntax before rendering.
  // The only permitted resource value is one local fragment, e.g. url(#paint).
  if (
    Array.from(value).some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    ) ||
    /\\|\/\*|[<>]|(?:https?:|data:|javascript:|@import)/i.test(value)
  ) {
    throw invalidSvg();
  }
  if (
    /url\s*\(/i.test(value) &&
    !/^url\(#[a-zA-Z_][\w.-]*\)$/.test(value.trim())
  ) {
    throw invalidSvg();
  }
}

function length(value: string | null): number | null {
  if (value === null) return null;
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)(?:px)?$/.test(value.trim()))
    throw invalidSvg();
  const result = Number.parseFloat(value);
  if (!Number.isFinite(result) || result <= 0) throw invalidSvg();
  return result;
}

export async function prepareSvg(file: File): Promise<{
  blob: Blob;
  width: number;
  height: number;
}> {
  if (file.size > MAX_SVG_BYTES) {
    throw new Error('Choose an SVG 2 MB or smaller.');
  }
  const source = await file.text();
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw invalidSvg();
  const document = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (
    document
      .createTreeWalker(document, NodeFilter.SHOW_PROCESSING_INSTRUCTION)
      .nextNode()
  ) {
    throw invalidSvg();
  }
  const root = document.documentElement;
  if (
    root?.localName !== 'svg' ||
    (root.namespaceURI && root.namespaceURI !== SVG_NAMESPACE) ||
    document.getElementsByTagName('parsererror').length > 0
  ) {
    throw invalidSvg();
  }
  const nodes = [root, ...Array.from(root.querySelectorAll('*'))];
  if (nodes.length > 10_000) throw invalidSvg();
  for (const node of nodes) {
    if (
      !ELEMENTS.has(node.localName) ||
      (node.namespaceURI && node.namespaceURI !== SVG_NAMESPACE)
    ) {
      throw invalidSvg();
    }
    for (const attribute of Array.from(node.attributes)) {
      if (attribute.name === 'xmlns' && attribute.value === SVG_NAMESPACE)
        continue;
      if (attribute.name === 'style') {
        for (const declaration of attribute.value
          .split(';')
          .filter((part) => part.trim())) {
          const colon = declaration.indexOf(':');
          const property = declaration.slice(0, colon).trim();
          const value = declaration.slice(colon + 1).trim();
          if (colon < 1 || !STYLE_PROPERTIES.has(property) || !value)
            throw invalidSvg();
          validateValue(value);
          node.setAttribute(property, value);
        }
        node.removeAttribute('style');
        continue;
      }
      if (attribute.namespaceURI || !ATTRIBUTES.has(attribute.name))
        throw invalidSvg();
      validateValue(attribute.value);
    }
  }

  const viewBox = root.getAttribute('viewBox');
  const box = viewBox
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    box &&
    (box.length !== 4 ||
      !box.every(Number.isFinite) ||
      box[2] <= 0 ||
      box[3] <= 0)
  ) {
    throw invalidSvg();
  }
  let width = length(root.getAttribute('width'));
  let height = length(root.getAttribute('height'));
  if (box) {
    width ??= height ? (height * box[2]) / box[3] : box[2];
    height ??= (width * box[3]) / box[2];
  }
  if (!width || !height)
    throw new Error('This SVG needs valid dimensions or a viewBox.');
  width = Math.max(1, Math.round(width));
  height = Math.max(1, Math.round(height));
  assertConverterDimensions(width, height);
  root.setAttribute('xmlns', SVG_NAMESPACE);
  root.setAttribute('width', String(width));
  root.setAttribute('height', String(height));
  // Serialize the root only: no processing instructions or document-level content.
  return {
    blob: new Blob([new XMLSerializer().serializeToString(root)], {
      type: 'image/svg+xml',
    }),
    width,
    height,
  };
}
