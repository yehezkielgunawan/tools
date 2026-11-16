import { afterEach, expect, rs, test } from '@rstest/core';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppRoutes } from '../src/app/router';
import { convertImage } from '../src/tools/image-converter/convertImage';
import ImageConverter from '../src/tools/image-converter/ImageConverter';
import { tools } from '../src/tools/registry';

rs.mock('../src/tools/image-converter/convertImage', () => ({
  convertImage: rs.fn(),
}));

function png(width = 640, height = 480): File {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return new File([bytes], 'phone-photo.png', { type: 'image/png' });
}

function renderTool() {
  return render(
    <MemoryRouter>
      <ImageConverter />
    </MemoryRouter>,
  );
}

async function selectFile(file = png()) {
  fireEvent.change(screen.getByLabelText('Choose an image file'), {
    target: { files: [file] },
  });
  await screen.findByText(file.name);
}

afterEach(() => {
  rs.restoreAllMocks();
  rs.mocked(convertImage).mockReset();
});

test('offers four input formats and defaults to original-size JPG at 92% quality', () => {
  renderTool();
  expect(
    screen.getByRole('heading', { name: 'Image Converter' }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('Choose an image file')).toHaveAttribute(
    'accept',
    expect.stringContaining('.heic'),
  );
  expect(screen.getByLabelText('Output format')).toHaveValue('image/jpeg');
  expect(screen.getByLabelText('Maximum long edge')).toHaveValue('original');
  expect(screen.getByLabelText('JPG quality')).toHaveValue('92');
  expect(screen.getByRole('button', { name: 'Convert image' })).toBeDisabled();
});

test('converts, shows a downloadable preview, and invalidates it when settings change', async () => {
  rs.mocked(convertImage).mockResolvedValue({
    blob: new Blob(['image'], { type: 'image/jpeg' }),
    width: 640,
    height: 480,
  });
  rs.spyOn(URL, 'createObjectURL').mockReturnValue('blob:converted');
  const revoke = rs.spyOn(URL, 'revokeObjectURL');
  const view = renderTool();
  await selectFile();
  fireEvent.click(screen.getByRole('button', { name: 'Convert image' }));
  const download = await screen.findByRole('link', { name: /Download JPG/i });
  expect(download).toHaveAttribute('download', 'phone-photo-converted.jpg');
  expect(screen.getByAltText('Conversion preview')).toHaveAttribute(
    'src',
    'blob:converted',
  );
  expect(convertImage).toHaveBeenCalledWith(
    expect.any(File),
    {
      outputMimeType: 'image/jpeg',
      quality: 92,
      maxEdge: 'original',
    },
    expect.any(AbortSignal),
  );
  fireEvent.change(screen.getByLabelText('Output format'), {
    target: { value: 'image/png' },
  });
  expect(
    screen.queryByRole('link', { name: /Download/i }),
  ).not.toBeInTheDocument();
  expect(screen.queryByLabelText('JPG quality')).not.toBeInTheDocument();
  expect(revoke).toHaveBeenCalledWith('blob:converted');
  view.unmount();
});

test('requires a smaller size to be chosen explicitly for large photos', async () => {
  renderTool();
  await selectFile(png(4096, 3072));
  expect(
    screen.getByText(/choose a smaller maximum long edge/i),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Convert image' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Maximum long edge'), {
    target: { value: '2048' },
  });
  expect(screen.getByRole('button', { name: 'Convert image' })).toBeEnabled();
});

test('reports invalid files and allows recovery', async () => {
  renderTool();
  fireEvent.change(screen.getByLabelText('Choose an image file'), {
    target: { files: [new File(['invalid'], 'bad.jpg')] },
  });
  expect(await screen.findByRole('alert')).toHaveTextContent(
    /Choose a supported/,
  );
  await selectFile();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Convert image' })).toBeEnabled();
});

test('reset aborts a conversion and ignores its late result', async () => {
  let resolve!: (value: { blob: Blob; width: number; height: number }) => void;
  rs.mocked(convertImage).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const objectUrl = rs.spyOn(URL, 'createObjectURL');
  renderTool();
  await selectFile();
  fireEvent.click(screen.getByRole('button', { name: 'Convert image' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
  expect(rs.mocked(convertImage).mock.calls[0][2]?.aborted).toBe(true);
  await act(async () =>
    resolve({ blob: new Blob(['late']), width: 1, height: 1 }),
  );
  expect(objectUrl).not.toHaveBeenCalled();
  expect(screen.queryByText('phone-photo.png')).not.toBeInTheDocument();
});

test('revokes the result URL when leaving the tool', async () => {
  rs.mocked(convertImage).mockResolvedValue({
    blob: new Blob(['image'], { type: 'image/jpeg' }),
    width: 640,
    height: 480,
  });
  rs.spyOn(URL, 'createObjectURL').mockReturnValue('blob:leaving');
  const revoke = rs.spyOn(URL, 'revokeObjectURL');
  const view = renderTool();
  await selectFile();
  fireEvent.click(screen.getByRole('button', { name: 'Convert image' }));
  await screen.findByRole('link', { name: /Download JPG/i });
  view.unmount();
  expect(revoke).toHaveBeenCalledWith('blob:leaving');
});

test('registers the converter and opens its lazy route', async () => {
  expect(tools).toContainEqual(
    expect.objectContaining({
      id: 'image-converter',
      path: '/image/image-converter',
      category: 'image',
    }),
  );
  render(
    <MemoryRouter initialEntries={['/image/image-converter']}>
      <AppRoutes />
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(
      screen.getByRole('heading', { name: 'Image Converter' }),
    ).toBeInTheDocument(),
  );
});
