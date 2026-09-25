const PDF_HEADER = [37, 80, 68, 70, 45] as const;
const HEADER_SCAN_BYTES = 1024;

function hasPdfHeader(bytes: Uint8Array): boolean {
  for (let start = 0; start <= bytes.length - PDF_HEADER.length; start += 1) {
    if (PDF_HEADER.every((byte, offset) => bytes[start + offset] === byte)) {
      return true;
    }
  }

  return false;
}

export function getPdfOpenErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Could not open this PDF. It may be damaged or unsupported.';
  }

  if (
    error.name === 'PasswordException' ||
    /encrypt|password/i.test(error.message)
  ) {
    return 'This PDF is encrypted and cannot be edited here. Remove its password and try again.';
  }

  if (error.name === 'InvalidPDFException') {
    return 'This PDF appears damaged or uses a format the editor cannot read.';
  }

  if (
    error.message === 'The selected file is empty.' ||
    error.message === 'Choose a PDF file.' ||
    error.message === 'The selected file is not a valid PDF.'
  ) {
    return error.message;
  }

  return 'Could not open this PDF. It may be damaged or unsupported.';
}

export async function readPdfFile(file: File): Promise<Uint8Array> {
  if (file.size === 0) {
    throw new Error('The selected file is empty.');
  }

  const type = file.type.toLowerCase();
  if (
    type &&
    type !== 'application/pdf' &&
    type !== 'application/octet-stream'
  ) {
    throw new Error('Choose a PDF file.');
  }

  const prefix = new Uint8Array(
    await file.slice(0, HEADER_SCAN_BYTES).arrayBuffer(),
  );
  if (!hasPdfHeader(prefix)) {
    throw new Error('The selected file is not a valid PDF.');
  }

  return new Uint8Array(await file.arrayBuffer());
}
