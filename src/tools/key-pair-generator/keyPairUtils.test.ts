import { createPrivateKey, createPublicKey, webcrypto } from 'node:crypto';
import { afterEach, beforeEach, expect, rs, test } from '@rstest/core';
import { generateKeyPair, type KeyPairOptions } from './keyPairUtils';

beforeEach(() => {
  rs.stubGlobal('crypto', webcrypto);
});
afterEach(() => {
  rs.unstubAllGlobals();
  rs.restoreAllMocks();
});

function decodePem(pem: string): Uint8Array<ArrayBuffer> {
  const base64 = pem.split('\n').slice(1, -2).join('');
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

const options: KeyPairOptions[] = [
  { type: 'RSA', modulusLength: 2048 },
  { type: 'RSA', modulusLength: 3072 },
  { type: 'RSA', modulusLength: 4096 },
  { type: 'EC', namedCurve: 'P-256' },
  { type: 'EC', namedCurve: 'P-384' },
  { type: 'EC', namedCurve: 'P-521' },
];

test.each(options)(
  'exports usable matching PEM keys for %j',
  async (settings) => {
    const result = await generateKeyPair(settings);
    expect(result.options).toEqual(settings);
    expect(result.publicKey).toMatch(/^-----BEGIN PUBLIC KEY-----\n/);
    expect(result.privateKey).toMatch(/^-----BEGIN PRIVATE KEY-----\n/);
    for (const pem of [result.publicKey, result.privateKey]) {
      const lines = pem.trim().split('\n').slice(1, -1);
      expect(lines.slice(0, -1).every((line) => line.length === 64)).toBe(true);
      expect(lines.every((line) => /^[A-Za-z0-9+/=]{1,64}$/.test(line))).toBe(
        true,
      );
    }
    const algorithm =
      settings.type === 'RSA'
        ? { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }
        : { name: 'ECDSA', namedCurve: settings.namedCurve };
    const publicKey = await crypto.subtle.importKey(
      'spki',
      decodePem(result.publicKey),
      algorithm,
      true,
      ['verify'],
    );
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      decodePem(result.privateKey),
      algorithm,
      true,
      ['sign'],
    );
    if (settings.type === 'RSA') {
      expect((publicKey.algorithm as RsaKeyAlgorithm).modulusLength).toBe(
        settings.modulusLength,
      );
    } else {
      expect((publicKey.algorithm as EcKeyAlgorithm).namedCurve).toBe(
        settings.namedCurve,
      );
    }
    const signingAlgorithm =
      settings.type === 'RSA'
        ? { name: 'RSASSA-PKCS1-v1_5' }
        : { name: 'ECDSA', hash: 'SHA-512' };
    const message = new TextEncoder().encode('PEM round-trip');
    const signature = await crypto.subtle.sign(
      signingAlgorithm,
      privateKey,
      message,
    );
    expect(
      await crypto.subtle.verify(
        signingAlgorithm,
        publicKey,
        signature,
        message,
      ),
    ).toBe(true);
    expect(
      await crypto.subtle.verify(
        signingAlgorithm,
        publicKey,
        signature,
        new TextEncoder().encode('changed'),
      ),
    ).toBe(false);
    // Also check interoperability with OpenSSL-backed PEM parsing.
    expect(
      createPublicKey(createPrivateKey(result.privateKey)).export({
        type: 'spki',
        format: 'pem',
      }),
    ).toBe(result.publicKey);
  },
  30_000,
);

test('generates fresh keys for each request', async () => {
  const settings = { type: 'EC', namedCurve: 'P-256' } as const;
  const first = await generateKeyPair(settings);
  const second = await generateKeyPair(settings);
  expect(first.publicKey).not.toBe(second.publicKey);
  expect(first.privateKey).not.toBe(second.privateKey);
});

test('rejects unavailable Web Crypto with actionable feedback', async () => {
  rs.stubGlobal('crypto', undefined);
  await expect(
    generateKeyPair({ type: 'RSA', modulusLength: 2048 }),
  ).rejects.toThrow(/HTTPS.*Web Crypto/i);
});

test('rejects invalid parameters before generating keys', async () => {
  const generate = rs.spyOn(crypto.subtle, 'generateKey');
  for (const invalid of [
    { type: 'RSA', modulusLength: 1024 },
    { type: 'EC', namedCurve: 'secp256k1' },
    { type: 'invalid' },
  ]) {
    await expect(generateKeyPair(invalid as KeyPairOptions)).rejects.toThrow(
      /select a supported/i,
    );
  }
  expect(generate).not.toHaveBeenCalled();
});

test('reports unsupported algorithms without exposing raw errors', async () => {
  rs.spyOn(crypto.subtle, 'generateKey').mockRejectedValue(
    new DOMException('details', 'NotSupportedError'),
  );
  await expect(
    generateKeyPair({ type: 'EC', namedCurve: 'P-256' }),
  ).rejects.toThrow(/not supported.*browser/i);
});

test('does not return a partial pair when export fails', async () => {
  rs.spyOn(crypto.subtle, 'exportKey').mockRejectedValue(
    new Error('raw details'),
  );
  await expect(
    generateKeyPair({ type: 'EC', namedCurve: 'P-256' }),
  ).rejects.toThrow(/could not generate or export/i);
});
