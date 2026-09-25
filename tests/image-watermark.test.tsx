import { expect, rs, test } from '@rstest/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppRoutes } from '../src/app/router';
import ImageWatermark from '../src/tools/image-watermark/ImageWatermark';
import { tools } from '../src/tools/registry';

function createPngFile(): File {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, 640);
  view.setUint32(20, 480);
  return new File([bytes], 'phone-photo.png', { type: 'image/png' });
}

function createRect(width: number, height: number): DOMRect {
  return {
    bottom: height,
    height,
    left: 0,
    right: width,
    top: 0,
    width,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;
}

test('shows mobile-friendly watermark controls and accepts HEIC and HEIF photos', () => {
  render(
    <MemoryRouter>
      <ImageWatermark />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole('heading', { name: 'Image Watermark' }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/choose a photo file/i)).toHaveAttribute(
    'accept',
    expect.stringContaining('image/heic'),
  );
  expect(screen.getByLabelText(/choose a photo file/i)).toHaveAttribute(
    'accept',
    expect.stringContaining('image/heif'),
  );
  expect(screen.getByLabelText(/watermark text/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/text size/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/text color/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/opacity/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/rotation/i)).toHaveValue('0');
  expect(
    screen.getByRole('button', { name: /create watermarked image/i }),
  ).toBeDisabled();
});

test('updates the watermark rotation control in degrees', () => {
  render(
    <MemoryRouter>
      <ImageWatermark />
    </MemoryRouter>,
  );

  const rotation = screen.getByLabelText(/rotation/i);
  fireEvent.change(rotation, { target: { value: '45' } });

  expect(rotation).toHaveValue('45');
  expect(screen.getByText('45°')).toBeInTheDocument();
});

test('registers an Image Watermark card that opens the tool route', async () => {
  expect(tools).toContainEqual(
    expect.objectContaining({
      id: 'image-watermark',
      name: 'Image Watermark',
      path: '/image/image-watermark',
      category: 'image',
    }),
  );

  const home = render(
    <MemoryRouter initialEntries={['/']}>
      <AppRoutes />
    </MemoryRouter>,
  );

  expect(
    await screen.findByRole('link', { name: 'Image Watermark' }),
  ).toHaveAttribute('href', '/image/image-watermark');
  home.unmount();

  render(
    <MemoryRouter initialEntries={['/image/image-watermark']}>
      <AppRoutes />
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole('heading', { name: 'Image Watermark' }),
  ).toBeInTheDocument();
});

test('shows a device-friendly warning when a HEIC photo cannot be decoded', async () => {
  render(
    <MemoryRouter>
      <ImageWatermark />
    </MemoryRouter>,
  );

  fireEvent.change(screen.getByLabelText(/choose a photo file/i), {
    target: {
      files: [
        new File(['not a HEIF header'], 'phone-photo.heic', {
          type: 'image/heic',
        }),
      ],
    },
  });

  expect(await screen.findByRole('alert')).toHaveTextContent(
    /this browser can.t open this heic\/heif photo/i,
  );
});

test('drags the text watermark and keeps its bounds inside the preview', async () => {
  const close = () => {};
  const createImageBitmap = rs
    .spyOn(globalThis, 'createImageBitmap')
    .mockResolvedValue({ width: 640, height: 480, close } as ImageBitmap);
  const getContext = rs
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue({
      drawImage: rs.fn(),
      measureText: () => ({
        width: 80,
        actualBoundingBoxAscent: 12,
        actualBoundingBoxDescent: 4,
      }),
    } as unknown as CanvasRenderingContext2D);
  const getBoundingClientRect = rs
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: HTMLElement) {
      return this.getAttribute('aria-label')?.startsWith('Move watermark')
        ? createRect(40, 20)
        : createRect(200, 100);
    });

  try {
    render(
      <MemoryRouter>
        <ImageWatermark />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/choose a photo file/i), {
      target: { files: [createPngFile()] },
    });
    await screen.findByRole('region', { name: /watermark preview/i });
    const watermark = await screen.findByRole('button', {
      name: /move watermark/i,
    });
    fireEvent.change(screen.getByLabelText(/rotation/i), {
      target: { value: '45' },
    });
    expect(watermark).toHaveStyle({
      transform: 'translate(-50%, -50%) rotate(45deg)',
    });

    fireEvent.pointerDown(watermark, {
      pointerId: 1,
      clientX: 100,
      clientY: 86,
    });
    fireEvent.pointerMove(watermark, {
      pointerId: 1,
      clientX: 1,
      clientY: 1,
    });

    expect(watermark).toHaveStyle({ left: '10%', top: '10%' });
  } finally {
    createImageBitmap.mockRestore();
    getContext.mockRestore();
    getBoundingClientRect.mockRestore();
  }
});
