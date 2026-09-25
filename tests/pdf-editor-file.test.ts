import { describe, expect, it } from '@rstest/core';
import {
  getPdfOpenErrorMessage,
  readPdfFile,
} from '../src/tools/pdf-editor/pdfFiles';

describe('readPdfFile', () => {
  it('accepts a PDF signature in a locally selected file', async () => {
    const file = new File(
      [new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55])],
      'document.pdf',
      { type: 'application/pdf' },
    );

    await expect(readPdfFile(file)).resolves.toEqual(
      new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]),
    );
  });

  it('rejects empty files and files without a PDF header', async () => {
    const empty = new File([], 'empty.pdf', { type: 'application/pdf' });
    const invalid = new File(['not a document'], 'not-pdf.pdf', {
      type: 'application/pdf',
    });

    await expect(readPdfFile(empty)).rejects.toThrow(
      'The selected file is empty.',
    );
    await expect(readPdfFile(invalid)).rejects.toThrow(
      'The selected file is not a valid PDF.',
    );
  });

  it('accepts generic MIME types when the PDF header is present', async () => {
    const file = new File(
      [new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55])],
      'document.pdf',
      { type: 'application/octet-stream' },
    );

    await expect(readPdfFile(file)).resolves.toHaveLength(8);
  });
});

describe('getPdfOpenErrorMessage', () => {
  it('explains when a password-protected PDF cannot be edited', () => {
    expect(
      getPdfOpenErrorMessage(new Error('Input document is encrypted')),
    ).toMatch(/encrypted and cannot be edited/i);
    expect(
      getPdfOpenErrorMessage(
        Object.assign(new Error('Password required'), {
          name: 'PasswordException',
        }),
      ),
    ).toMatch(/encrypted and cannot be edited/i);
  });

  it('reports malformed PDFs separately from unsupported encryption', () => {
    expect(
      getPdfOpenErrorMessage(
        Object.assign(new Error('Invalid'), {
          name: 'InvalidPDFException',
        }),
      ),
    ).toMatch(/damaged/i);
  });
});
