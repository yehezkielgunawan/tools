import { describe, expect, it } from '@rstest/core';
import { fireEvent, render, screen } from '@testing-library/react';
import PdfUpload from '../src/tools/pdf-shared/PdfUpload';

describe('PDF picker focus during loading', () => {
  it('restores picker focus lost when temporarily disabled', () => {
    const onFiles = () => undefined;
    const view = render(<PdfUpload disabled={false} onFiles={onFiles} />);
    const picker = screen.getByLabelText('Choose a PDF') as HTMLInputElement;
    picker.focus();
    fireEvent.change(picker, {
      target: { files: [new File(['pdf'], 'report.pdf')] },
    });
    view.rerender(<PdfUpload disabled onFiles={onFiles} />);
    const temporaryControl = document.createElement('button');
    document.body.append(temporaryControl);
    temporaryControl.focus();
    temporaryControl.remove();
    expect(document.body).toHaveFocus();
    view.rerender(<PdfUpload disabled={false} onFiles={onFiles} />);
    expect(picker).toHaveFocus();
  });

  it('does not reclaim focus if the user moves to another control', () => {
    const onFiles = () => undefined;
    const view = render(
      <>
        <PdfUpload disabled={false} onFiles={onFiles} />
        <button type="button">Reset</button>
      </>,
    );
    const picker = screen.getByLabelText('Choose a PDF');
    picker.focus();
    fireEvent.change(picker, {
      target: { files: [new File(['pdf'], 'report.pdf')] },
    });
    view.rerender(
      <>
        <PdfUpload disabled onFiles={onFiles} />
        <button type="button">Reset</button>
      </>,
    );
    screen.getByRole('button', { name: 'Reset' }).focus();
    view.rerender(
      <>
        <PdfUpload disabled={false} onFiles={onFiles} />
        <button type="button">Reset</button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Reset' })).toHaveFocus();
  });
});
