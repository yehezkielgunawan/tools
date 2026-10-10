export { readPdfFile } from '../pdf-shared/pdfFiles';

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
