import { deflateSync, Inflate } from 'fflate';
import {
  type InvoiceDraft,
  parseInvoice,
  validateInvoice,
} from './invoiceModel';

export const MAX_SHARE_URL = 8000;
const MAX_JSON_BYTES = 128 * 1024;
function complete(value: unknown): InvoiceDraft {
  const draft = parseInvoice(value);
  if (Object.keys(validateInvoice(draft)).length)
    throw new Error('Complete the invoice fields before sharing.');
  return draft;
}
export function encodeInvoice(invoice: InvoiceDraft, origin: string): string {
  const data = new TextEncoder().encode(JSON.stringify(complete(invoice)));
  if (data.length > MAX_JSON_BYTES)
    throw new Error(
      'Invoice is too large for a share link. Download a PDF instead.',
    );
  const bytes = deflateSync(data);
  const encoded = btoa(
    Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''),
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const url = `${origin}/generator/invoice#invoice=v1.${encoded}`;
  if (url.length > MAX_SHARE_URL)
    throw new Error(
      'Invoice is too large for a share link. Download a PDF instead.',
    );
  return url;
}
export function decodeInvoice(hash: string): InvoiceDraft {
  if (hash.length > MAX_SHARE_URL)
    throw new Error('This invoice link is too large.');
  if (!hash.startsWith('#invoice=v1.'))
    throw new Error('Invalid or unsupported invoice link version.');
  const encoded = hash.slice('#invoice=v1.'.length);
  if (!/^[\w-]+$/.test(encoded) || encoded.length % 4 === 1)
    throw new Error('Invalid invoice link.');
  try {
    const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    const chunks: Uint8Array[] = [];
    let size = 0;
    const stream = new Inflate((chunk) => {
      size += chunk.length;
      if (size > MAX_JSON_BYTES)
        throw new Error('Invoice exceeds the decoded size limit.');
      chunks.push(chunk);
    });
    // Small input pushes bound the output produced before each size check.
    for (let offset = 0; offset < bytes.length; offset += 32)
      stream.push(
        bytes.subarray(offset, offset + 32),
        offset + 32 >= bytes.length,
      );
    const data = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.length;
    }
    return complete(
      JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data)),
    );
  } catch {
    throw new Error(
      'This invoice link is damaged, incomplete, or contains invalid data.',
    );
  }
}
