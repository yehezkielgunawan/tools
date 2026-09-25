import { expect, rs, test } from '@rstest/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ImageCompressor from '../src/tools/image-compressor/ImageCompressor';

function renderTool(): void {
  render(
    <MemoryRouter>
      <ImageCompressor />
    </MemoryRouter>,
  );
}

function createPngFile(): File {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, 640);
  view.setUint32(20, 480);
  return new File([bytes], 'phone-photo.png', { type: 'image/png' });
}

test('renders mobile-ready JPEG and PNG controls with Canvas selected by default', () => {
  renderTool();

  expect(
    screen.getByRole('heading', { name: /image compressor/i }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/choose a jpeg or png image/i)).toHaveAttribute(
    'accept',
    'image/jpeg,image/png',
  );
  expect(
    screen.getByLabelText(/choose a jpeg or png image/i),
  ).not.toHaveAttribute('multiple');
  expect(screen.getByRole('radio', { name: /html canvas/i })).toBeChecked();
  expect(screen.getByLabelText(/maximum long edge/i)).toHaveValue('2048');
  expect(
    screen.getByRole('button', { name: /compress image/i }),
  ).toBeDisabled();
});

test('shows the pixo PNG lossy option only for WASM PNG output', () => {
  renderTool();

  fireEvent.click(screen.getByRole('radio', { name: /pixo-wasm/i }));
  fireEvent.change(screen.getByLabelText(/output format/i), {
    target: { value: 'image/png' },
  });

  expect(screen.getByLabelText(/allow lossy png/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('radio', { name: /html canvas/i }));
  expect(screen.queryByLabelText(/allow lossy png/i)).not.toBeInTheDocument();
});

test('reports unsupported files without trying to decode them', async () => {
  renderTool();
  const file = new File(['not an image'], 'photo.webp', { type: 'image/webp' });

  fireEvent.change(screen.getByLabelText(/choose a jpeg or png image/i), {
    target: { files: [file] },
  });

  expect(await screen.findByRole('alert')).toHaveTextContent(/jpeg or png/i);
  expect(
    screen.getByRole('button', { name: /compress image/i }),
  ).toBeDisabled();
});

test('preflights a valid file without decoding or creating a full-size preview', async () => {
  renderTool();
  const createImageBitmap = rs.spyOn(globalThis, 'createImageBitmap');

  fireEvent.change(screen.getByLabelText(/choose a jpeg or png image/i), {
    target: { files: [createPngFile()] },
  });

  expect(await screen.findByText(/phone-photo.png/i)).toBeInTheDocument();
  expect(createImageBitmap).not.toHaveBeenCalled();
  expect(
    screen.queryByRole('img', { name: /preview/i }),
  ).not.toBeInTheDocument();

  createImageBitmap.mockRestore();
});

test('shows cancellation feedback while a Canvas encode is still finishing', async () => {
  const bitmap = { width: 640, height: 480, close: rs.fn() } as ImageBitmap;
  const createImageBitmap = rs
    .spyOn(globalThis, 'createImageBitmap')
    .mockResolvedValue(bitmap);
  const getContext = rs
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue({
      drawImage: rs.fn(),
    } as unknown as CanvasRenderingContext2D);
  let finishEncoding: BlobCallback | null = null;
  const toBlob = rs
    .spyOn(HTMLCanvasElement.prototype, 'toBlob')
    .mockImplementation((callback) => {
      finishEncoding = callback;
    });

  try {
    renderTool();
    fireEvent.change(screen.getByLabelText(/choose a jpeg or png image/i), {
      target: { files: [createPngFile()] },
    });
    await screen.findByText(/phone-photo.png/i);
    fireEvent.click(screen.getByRole('button', { name: /compress image/i }));
    await waitFor(() => expect(toBlob).toHaveBeenCalledOnce());
    expect(screen.getByRole('radio', { name: /html canvas/i })).toBeDisabled();
    expect(screen.getByLabelText(/output format/i)).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.getByRole('status')).toHaveTextContent(
      /cancellation requested/i,
    );
    finishEncoding?.(new Blob(['png'], { type: 'image/png' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      /compression cancelled/i,
    );
  } finally {
    createImageBitmap.mockRestore();
    getContext.mockRestore();
    toBlob.mockRestore();
  }
});
