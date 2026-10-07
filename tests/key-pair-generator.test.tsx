import { afterEach, beforeEach, expect, rs, test } from '@rstest/core';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import KeyPairGenerator from '../src/tools/key-pair-generator/KeyPairGenerator';
import * as actualUtils from '../src/tools/key-pair-generator/keyPairUtils' with {
  rstest: 'importActual',
};
import type { GeneratedKeyPair } from '../src/tools/key-pair-generator/keyPairUtils';

const mocks = rs.hoisted(() => ({ generate: rs.fn() }));
rs.mock('../src/tools/key-pair-generator/keyPairUtils', () => ({
  ...actualUtils,
  generateKeyPair: mocks.generate,
}));

const pair: GeneratedKeyPair = {
  options: { type: 'RSA', modulusLength: 2048 },
  publicKey: '-----BEGIN PUBLIC KEY-----\npublic\n-----END PUBLIC KEY-----\n',
  privateKey:
    '-----BEGIN PRIVATE KEY-----\nprivate\n-----END PRIVATE KEY-----\n',
};

beforeEach(() => {
  mocks.generate.mockReset().mockResolvedValue(pair);
  rs.spyOn(URL, 'createObjectURL').mockReturnValue('blob:key-pair');
  rs.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});
afterEach(() => {
  rs.restoreAllMocks();
  rs.unstubAllGlobals();
});

function renderTool() {
  return render(
    <MemoryRouter>
      <KeyPairGenerator />
    </MemoryRouter>,
  );
}

async function generate() {
  fireEvent.click(screen.getByRole('button', { name: /^generate key pair$/i }));
  await screen.findByText('RSA · 2048 bits');
}

test('starts without generating and switches between RSA sizes and EC curves', () => {
  renderTool();
  expect(mocks.generate).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Key type')).toHaveValue('RSA');
  expect(screen.getByLabelText('RSA key size')).toHaveValue('2048');
  expect(
    screen.getByRole('button', { name: /download public key/i }),
  ).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Key type'), {
    target: { value: 'EC' },
  });
  expect(screen.queryByLabelText('RSA key size')).not.toBeInTheDocument();
  expect(screen.getByLabelText('EC curve')).toHaveValue('P-256');
  fireEvent.change(screen.getByLabelText('EC curve'), {
    target: { value: 'P-384' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^generate key pair$/i }));
  expect(mocks.generate).toHaveBeenCalledWith({
    type: 'EC',
    namedCurve: 'P-384',
  });
});

test('shows the public key and keeps private output hidden until requested', async () => {
  renderTool();
  await generate();
  expect(screen.getByRole('textbox', { name: 'Public key' })).toHaveValue(
    pair.publicKey,
  );
  expect(screen.queryByDisplayValue(pair.privateKey)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /show private key/i }));
  expect(screen.getByRole('textbox', { name: 'Private key' })).toHaveValue(
    pair.privateKey,
  );
  fireEvent.click(screen.getByRole('button', { name: /hide private key/i }));
  expect(screen.queryByDisplayValue(pair.privateKey)).not.toBeInTheDocument();
  expect(
    screen.getByText(/private key downloads are unencrypted/i),
  ).toBeInTheDocument();
});

test('copies each key independently, including the hidden private key', async () => {
  const writeText = rs.fn().mockResolvedValue(undefined);
  rs.stubGlobal('navigator', { clipboard: { writeText } });
  renderTool();
  await generate();
  const publicPanel = screen.getByRole('region', { name: 'Public key' });
  const privatePanel = screen.getByRole('region', { name: 'Private key' });
  fireEvent.click(within(publicPanel).getByRole('button', { name: /^copy$/i }));
  await within(publicPanel).findByRole('button', { name: 'Copied' });
  expect(writeText).toHaveBeenLastCalledWith(pair.publicKey);
  fireEvent.click(
    within(privatePanel).getByRole('button', { name: /^copy$/i }),
  );
  await within(privatePanel).findByRole('button', { name: 'Copied' });
  expect(writeText).toHaveBeenLastCalledWith(pair.privateKey);
});

test('downloads the matching PEM contents and releases download URLs', async () => {
  const click = rs
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {});
  renderTool();
  await generate();
  for (const kind of ['public', 'private'] as const) {
    fireEvent.click(
      screen.getByRole('button', { name: `Download ${kind} key` }),
    );
    const anchor = click.mock.instances.at(-1);
    expect(anchor).toHaveProperty('download', `${kind}-key.pem`);
    expect(anchor).toHaveProperty('href', 'blob:key-pair');
    const blob = rs.mocked(URL.createObjectURL).mock.calls.at(-1)?.[0] as Blob;
    expect(await blob.text()).toBe(
      kind === 'public' ? pair.publicKey : pair.privateKey,
    );
  }
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
});

test('keeps generated settings accurate when selectors change', async () => {
  renderTool();
  await generate();
  fireEvent.change(screen.getByLabelText('RSA key size'), {
    target: { value: '4096' },
  });
  expect(screen.getByText('RSA · 2048 bits')).toBeInTheDocument();
  expect(screen.queryByText('RSA · 4096 bits')).not.toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Public key' })).toHaveValue(
    pair.publicKey,
  );
});

test('prevents duplicate generation and ignores results after clearing', async () => {
  let resolve: (value: GeneratedKeyPair) => void = () => {};
  mocks.generate.mockReturnValue(
    new Promise<GeneratedKeyPair>((done) => {
      resolve = done;
    }),
  );
  renderTool();
  fireEvent.click(screen.getByRole('button', { name: /^generate key pair$/i }));
  expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
  expect(screen.getByLabelText('Key type')).toBeDisabled();
  expect(mocks.generate).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: /^clear$/i }));
  await act(async () => {
    resolve(pair);
  });
  expect(screen.getByRole('textbox', { name: 'Public key' })).toHaveValue('');
  expect(
    screen.getByRole('button', { name: /download private key/i }),
  ).toBeDisabled();
  expect(
    screen.getByRole('button', { name: /^generate key pair$/i }),
  ).toBeEnabled();
});

test('clears generated keys and resets private-key visibility', async () => {
  const writeText = rs.fn().mockResolvedValue(undefined);
  rs.stubGlobal('navigator', { clipboard: { writeText } });
  renderTool();
  await generate();
  const publicPanel = screen.getByRole('region', { name: 'Public key' });
  fireEvent.click(within(publicPanel).getByRole('button', { name: /^copy$/i }));
  await within(publicPanel).findByRole('button', { name: 'Copied' });
  fireEvent.click(screen.getByRole('button', { name: /show private key/i }));
  fireEvent.click(screen.getByRole('button', { name: /^clear$/i }));
  expect(
    within(publicPanel).getByRole('button', { name: /^copy$/i }),
  ).toBeDisabled();
  expect(screen.getByRole('textbox', { name: 'Public key' })).toHaveValue('');
  await generate();
  expect(screen.queryByDisplayValue(pair.privateKey)).not.toBeInTheDocument();
});

test('reports failures and allows retrying without partial or old output', async () => {
  renderTool();
  await generate();
  mocks.generate.mockRejectedValueOnce(
    new Error('Could not generate or export the key pair. Please try again.'),
  );
  fireEvent.click(screen.getByRole('button', { name: /^generate key pair$/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    /could not generate or export/i,
  );
  expect(screen.getByRole('textbox', { name: 'Public key' })).toHaveValue('');
  expect(
    screen.getByRole('button', { name: /download public key/i }),
  ).toBeDisabled();
  await generate();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('shows actionable feedback when Web Crypto is unavailable', async () => {
  mocks.generate.mockRejectedValueOnce(
    new Error(
      'Open this tool over HTTPS or localhost in a browser with Web Crypto support.',
    ),
  );
  renderTool();
  fireEvent.click(screen.getByRole('button', { name: /^generate key pair$/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    /HTTPS.*Web Crypto/i,
  );
});
