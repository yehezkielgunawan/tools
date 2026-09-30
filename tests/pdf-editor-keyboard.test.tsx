import { expect, rs, test } from '@rstest/core';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PDFDocument } from 'pdf-lib';
import { MemoryRouter } from 'react-router';
import PdfEditor from '../src/tools/pdf-editor/PdfEditor';

rs.mock('../src/tools/pdf-editor/pdfjsClient', () => ({
  loadPdfDocument: () => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({
        pageNumber: 1,
        getViewport: () => ({ width: 600, height: 800 }),
      }),
    }),
    destroy: async () => undefined,
  }),
}));

test('adds and repositions PDF edits using only form controls', async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage([600, 800]);
  const bytes = await pdf.save();
  render(
    <MemoryRouter>
      <PdfEditor />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText('Choose a PDF'), {
    target: {
      files: [
        new File([bytes.slice().buffer as ArrayBuffer], 'example.pdf', {
          type: 'application/pdf',
        }),
      ],
    },
  });

  const section = await screen.findByRole('region', {
    name: 'Edit without dragging',
  });
  expect(
    await screen.findByRole('img', { name: /visual preview of PDF page 1/i }),
  ).toBeInTheDocument();
  fireEvent.change(
    within(section).getByRole('textbox', { name: 'Text to add' }),
    { target: { value: 'Approved' } },
  );
  fireEvent.click(
    within(section).getByRole('button', { name: 'Add text at position' }),
  );
  expect(
    within(section).getByRole('combobox', { name: 'Edit on this page' }),
  ).not.toHaveValue('');
  expect(
    within(section).getByRole('option', { name: /Text: Approved/ }),
  ).toBeInTheDocument();
  fireEvent.click(
    within(section).getByRole('button', { name: 'Move right 1%' }),
  );
  fireEvent.click(
    within(section).getByRole('button', { name: 'Delete selected edit' }),
  );
  expect(
    within(section).queryByRole('option', { name: /Text: Approved/ }),
  ).not.toBeInTheDocument();
});
