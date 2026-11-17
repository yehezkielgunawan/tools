import { afterEach, beforeEach, expect, rs, test } from '@rstest/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ImageCompressor from '../src/tools/image-compressor/ImageCompressor';
import ImageConverter from '../src/tools/image-converter/ImageConverter';
import { runHeicWorker } from '../src/tools/image-shared/heic/client';

rs.mock('../src/tools/image-shared/heic/client', () => ({
  runHeicWorker: rs.fn(),
}));

function photo() {
  return new File(
    [
      new Uint8Array([
        0, 0, 0, 24, 102, 116, 121, 112, 104, 101, 105, 99, 0, 0, 0, 0, 109,
        105, 102, 49, 104, 101, 105, 99,
      ]),
    ],
    '48mp.heic',
    { type: 'image/heic' },
  );
}
beforeEach(() => {
  rs.mocked(runHeicWorker).mockClear();
  rs.mocked(runHeicWorker).mockResolvedValue({
    width: 8064,
    height: 6048,
    imageCount: 1,
  });
});
afterEach(() => rs.mocked(runHeicWorker).mockReset());

test('accepts a large HEIC for compression with 2048 px, quality 82, and automatic JPG', async () => {
  render(
    <MemoryRouter>
      <ImageCompressor />
    </MemoryRouter>,
  );
  const input = screen.getByLabelText(/choose a jpeg or png image/i);
  expect(input).toHaveAttribute('accept', expect.stringContaining('.heic'));
  fireEvent.change(input, { target: { files: [photo()] } });
  await screen.findByText('48mp.heic');
  expect(screen.getByLabelText(/maximum long edge/i)).toHaveValue('2048');
  expect(screen.getByLabelText(/jpeg quality/i)).toHaveValue('82');
  expect(
    screen.getByRole('option', { name: /JPG for HEIC/i }),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /compress image/i })).toBeEnabled();
});

test('offers compressor navigation for a supported large HEIC requiring downsizing', async () => {
  render(
    <MemoryRouter>
      <ImageConverter />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText('Choose an image file'), {
    target: { files: [photo()] },
  });
  await screen.findByText('48mp.heic');
  expect(screen.getByRole('button', { name: 'Convert image' })).toBeDisabled();
  expect(
    screen.getByRole('link', { name: /open image compressor/i }),
  ).toHaveAttribute('href', '/image/image-compressor');
  expect(screen.getByText(/select this photo again/i)).toBeInTheDocument();
});

test('cancels HEIC metadata inspection rather than leaving its worker active', async () => {
  rs.mocked(runHeicWorker).mockImplementation(
    (_file, _operation, signal) =>
      new Promise((_resolve, reject) => {
        signal?.addEventListener(
          'abort',
          () => reject(new DOMException('Cancelled', 'AbortError')),
          { once: true },
        );
      }),
  );
  render(
    <MemoryRouter>
      <ImageCompressor />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText(/choose a jpeg or png image/i), {
    target: { files: [photo()] },
  });
  await waitFor(() => expect(runHeicWorker).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
  expect(
    await screen.findByText('Image checking cancelled.'),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: /compress image/i }),
    ).toBeDisabled(),
  );
  expect(rs.mocked(runHeicWorker).mock.calls[0][2]?.aborted).toBe(true);
});
