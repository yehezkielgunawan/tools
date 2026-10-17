import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppRoutes } from '../src/app/router';
import { getPageMetadata } from '../src/seo/pageMetadata';
import DocumentImages from '../src/tools/document-images-shared/DocumentImages';

describe('bidirectional document converters', () => {
  afterEach(() => rs.restoreAllMocks());

  it.each([
    ['/pdf/pdf-images', 'PDF ↔ Images'],
    ['/image/powerpoint-images', 'PowerPoint ↔ Images'],
  ])(
    'loads the registered %s route with its own metadata',
    async (path, title) => {
      render(
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>,
      );
      expect(
        await screen.findByRole('heading', { name: title, exact: true }),
      ).toBeInTheDocument();
      expect(getPageMetadata(path)?.browserTitle).toBe(
        `${title} | Yehezgun Tools`,
      );
    },
  );

  it('lets users switch directions and reorder images with keyboard-accessible controls', async () => {
    rs.spyOn(URL, 'createObjectURL').mockReturnValue('blob:input');
    const revoke = rs
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);
    const { unmount } = render(
      <MemoryRouter>
        <DocumentImages kind="pdf" />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Images → PDF' }));
    expect(
      screen.getByRole('combobox', { name: 'Page size', exact: true }),
    ).toHaveValue('a4');
    const bytes = Uint8Array.from(
      atob(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      ),
      (c) => c.charCodeAt(0),
    );
    fireEvent.change(screen.getByLabelText('Add images'), {
      target: {
        files: [
          new File([bytes], 'first.png', { type: 'image/png' }),
          new File([bytes], 'second.png', { type: 'image/png' }),
        ],
      },
    });
    await screen.findByText('second.png');
    fireEvent.click(screen.getByRole('button', { name: 'Move second.png up' }));
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('second.png');
    fireEvent.click(screen.getByRole('button', { name: 'Remove first.png' }));
    expect(screen.queryByText('first.png')).not.toBeInTheDocument();
    unmount();
    expect(revoke).toHaveBeenCalledTimes(2);
  });

  it('explains PPTX limitations and rejects legacy PPT before loading a renderer', async () => {
    render(
      <MemoryRouter>
        <DocumentImages kind="pptx" />
      </MemoryRouter>,
    );
    expect(screen.getByText(/best-effort/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Choose PPTX'), {
      target: { files: [new File(['legacy'], 'old.ppt')] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(/legacy .ppt/i);
    expect(
      screen.getByRole('button', { name: 'Convert to images' }),
    ).toBeDisabled();
  });
});
