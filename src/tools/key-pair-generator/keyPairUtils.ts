export const rsaKeySizes = [2048, 3072, 4096] as const;
export const ecCurves = ['P-256', 'P-384', 'P-521'] as const;

export type KeyPairOptions =
  | { type: 'RSA'; modulusLength: (typeof rsaKeySizes)[number] }
  | { type: 'EC'; namedCurve: (typeof ecCurves)[number] };

export interface GeneratedKeyPair {
  options: KeyPairOptions;
  publicKey: string;
  privateKey: string;
}

function encodePem(
  bytes: ArrayBuffer,
  label: 'PUBLIC KEY' | 'PRIVATE KEY',
): string {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) {
    binary += String.fromCharCode(byte);
  }
  const base64 = btoa(binary);
  const lines: string[] = [];
  for (let offset = 0; offset < base64.length; offset += 64) {
    lines.push(base64.slice(offset, offset + 64));
  }
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`;
}

export async function generateKeyPair(
  options: KeyPairOptions,
): Promise<GeneratedKeyPair> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error(
      'Open this tool over HTTPS or localhost in a browser with Web Crypto support.',
    );
  }
  if (
    (options.type !== 'RSA' && options.type !== 'EC') ||
    (options.type === 'RSA' && !rsaKeySizes.includes(options.modulusLength)) ||
    (options.type === 'EC' && !ecCurves.includes(options.namedCurve))
  ) {
    throw new Error('Select a supported RSA key size or EC curve.');
  }

  // Snapshot settings before awaiting so outputs always describe the actual pair.
  const settings = { ...options };
  try {
    const algorithm =
      settings.type === 'RSA'
        ? {
            name: 'RSASSA-PKCS1-v1_5',
            modulusLength: settings.modulusLength,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
          }
        : { name: 'ECDSA', namedCurve: settings.namedCurve };
    const pair = await subtle.generateKey(algorithm, true, ['sign', 'verify']);
    const [publicKey, privateKey] = await Promise.all([
      subtle.exportKey('spki', pair.publicKey),
      subtle.exportKey('pkcs8', pair.privateKey),
    ]);
    return {
      options: settings,
      publicKey: encodePem(publicKey, 'PUBLIC KEY'),
      privateKey: encodePem(privateKey, 'PRIVATE KEY'),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'NotSupportedError') {
      throw Object.assign(
        new Error(
          'This key type is not supported in your browser. Try another type or a current browser.',
        ),
        { cause: error },
      );
    }
    throw Object.assign(
      new Error('Could not generate or export the key pair. Please try again.'),
      { cause: error },
    );
  }
}
