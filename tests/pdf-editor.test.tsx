import { describe, expect, it } from '@rstest/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppRoutes } from '../src/app/router';
import PdfEditor from '../src/tools/pdf-editor/PdfEditor';

describe('PDF Editor', () => {
  it('starts with a local PDF picker and a clear privacy message', () => {
    render(
      <MemoryRouter>
        <PdfEditor />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'PDF Editor' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Choose a PDF')).toBeInTheDocument();
    expect(
      screen.getByText(/your pdf stays on this device/i),
    ).toBeInTheDocument();
  });

  it('is reachable from its registered route', async () => {
    render(
      <MemoryRouter initialEntries={['/pdf/pdf-editor']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'PDF Editor' }),
    ).toBeInTheDocument();
  });

  it('rejects a non-PDF selection without leaving the upload screen', async () => {
    render(
      <MemoryRouter>
        <PdfEditor />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Choose a PDF'), {
      target: {
        files: [
          new File(['not a pdf'], 'document.pdf', { type: 'application/pdf' }),
        ],
      },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /not a valid pdf/i,
    );
    expect(screen.getByLabelText('Choose a PDF')).toBeInTheDocument();
  });
});
