import { beforeEach, expect, rs, test } from '@rstest/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as QRCode from 'qrcode';
import { MemoryRouter } from 'react-router';
import { AppRoutes } from '../src/app/router';
import QrCodeGenerator from '../src/tools/qr-code/QrCodeGenerator';
import { tools } from '../src/tools/registry';

rs.mock('qrcode', () => ({
  toDataURL: rs.fn(),
}));

const png = 'data:image/png;base64,AAAA';
const toDataURL = rs.mocked(QRCode.toDataURL);

function renderTool() {
  return render(
    <MemoryRouter>
      <QrCodeGenerator />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  toDataURL.mockReset();
  toDataURL.mockResolvedValue(png);
});

test('previews a normalized URL live and enables PNG download', async () => {
  renderTool();
  expect(screen.getByRole('button', { name: /download png/i })).toBeDisabled();

  fireEvent.change(screen.getByRole('textbox', { name: /^url$/i }), {
    target: { value: 'example.com' },
  });

  expect(
    await screen.findByRole('img', { name: /qr code preview/i }),
  ).toHaveAttribute('src', png);
  expect(toDataURL).toHaveBeenCalledWith('https://example.com/', {
    width: 1024,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000ff', light: '#ffffffff' },
  });
  expect(screen.getByRole('button', { name: /download png/i })).toBeEnabled();
});

test('downloads the rendered PNG with a descriptive filename', async () => {
  const click = rs
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {});
  try {
    renderTool();
    fireEvent.change(screen.getByRole('textbox', { name: /^url$/i }), {
      target: { value: 'example.com' },
    });
    await screen.findByRole('img', { name: /qr code preview/i });
    fireEvent.click(screen.getByRole('button', { name: /download png/i }));

    expect(click).toHaveBeenCalledTimes(1);
    expect(click.mock.instances[0]).toHaveProperty('download', 'url-qr.png');
    expect(click.mock.instances[0]).toHaveProperty('href', png);
  } finally {
    click.mockRestore();
  }
});

test('switches to vCard and previews contact details without sending data away', async () => {
  renderTool();
  fireEvent.click(screen.getByRole('tab', { name: /vcard/i }));
  fireEvent.change(screen.getByRole('textbox', { name: /full name/i }), {
    target: { value: 'Ada Lovelace' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
    target: { value: 'ada@example.com' },
  });

  await screen.findByRole('img', { name: /qr code preview/i });
  expect(toDataURL).toHaveBeenLastCalledWith(
    expect.stringContaining('FN:Ada Lovelace\r\nEMAIL:ada@example.com'),
    expect.any(Object),
  );
});

test('clears stale previews and reports invalid URLs', async () => {
  renderTool();
  const input = screen.getByRole('textbox', { name: /^url$/i });
  fireEvent.change(input, { target: { value: 'example.com' } });
  await screen.findByRole('img', { name: /qr code preview/i });

  fireEvent.change(input, { target: { value: 'https://' } });
  expect(
    screen.queryByRole('img', { name: /qr code preview/i }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent(/valid http/i);
  expect(screen.getByRole('button', { name: /download png/i })).toBeDisabled();
});

test('reports QR capacity errors and never offers a stale download', async () => {
  toDataURL.mockRejectedValue(new Error('The amount of data is too big'));
  renderTool();
  fireEvent.change(screen.getByRole('textbox', { name: /^url$/i }), {
    target: { value: 'example.com' },
  });

  expect(await screen.findByRole('alert')).toHaveTextContent(/too much data/i);
  expect(screen.getByRole('button', { name: /download png/i })).toBeDisabled();
});

test('ignores a finished render after inputs change', async () => {
  let finish!: (value: string) => void;
  toDataURL.mockImplementationOnce(
    () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
  );
  renderTool();
  const input = screen.getByRole('textbox', { name: /^url$/i });
  fireEvent.change(input, { target: { value: 'example.com' } });
  await waitFor(() => expect(toDataURL).toHaveBeenCalledTimes(1));
  fireEvent.change(input, { target: { value: '' } });
  finish(png);

  await waitFor(() => {
    expect(
      screen.queryByRole('img', { name: /qr code preview/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /download png/i }),
    ).toBeDisabled();
  });
});

test('registers a QR Generator card and routes to the tool', async () => {
  expect(tools).toContainEqual(
    expect.objectContaining({
      name: 'QR Code Generator',
      path: '/generator/qr-code',
    }),
  );

  render(
    <MemoryRouter initialEntries={['/generator/qr-code']}>
      <AppRoutes />
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole('heading', { name: 'QR Code Generator' }),
  ).toBeInTheDocument();
});
