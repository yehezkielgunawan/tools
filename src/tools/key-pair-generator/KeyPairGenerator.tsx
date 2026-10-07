import { Eraser, KeyRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ToolLayout from '../../components/layout/ToolLayout';
import KeyOutput from './KeyOutput';
import {
  ecCurves,
  type GeneratedKeyPair,
  generateKeyPair,
  type KeyPairOptions,
  rsaKeySizes,
} from './keyPairUtils';

export default function KeyPairGenerator() {
  const [keyType, setKeyType] = useState<'RSA' | 'EC'>('RSA');
  const [keySize, setKeySize] = useState<(typeof rsaKeySizes)[number]>(2048);
  const [curve, setCurve] = useState<(typeof ecCurves)[number]>('P-256');
  const [result, setResult] = useState<GeneratedKeyPair | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showPrivate, setShowPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const pending = useRef(false);

  useEffect(
    () => () => {
      generation.current += 1;
      pending.current = false;
    },
    [],
  );

  const generate = async (): Promise<void> => {
    if (pending.current) return;
    pending.current = true;
    const request = ++generation.current;
    setGenerating(true);
    setResult(null);
    setShowPrivate(false);
    setError(null);
    const options: KeyPairOptions =
      keyType === 'RSA'
        ? { type: 'RSA', modulusLength: keySize }
        : { type: 'EC', namedCurve: curve };
    try {
      const next = await generateKeyPair(options);
      if (request === generation.current) setResult(next);
    } catch (cause) {
      if (request === generation.current) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Could not generate the key pair. Please try again.',
        );
      }
    } finally {
      if (request === generation.current) {
        pending.current = false;
        setGenerating(false);
      }
    }
  };

  const clear = (): void => {
    generation.current += 1;
    pending.current = false;
    setGenerating(false);
    setResult(null);
    setShowPrivate(false);
    setError(null);
  };

  const resultLabel = result
    ? result.options.type === 'RSA'
      ? `RSA · ${result.options.modulusLength} bits`
      : `EC · ${result.options.namedCurve}`
    : null;

  return (
    <ToolLayout
      category="Developer"
      description="Generate matching RSA or elliptic-curve keys and export them as PEM files, directly in your browser."
      privacyNote="Keys are generated locally and held only in this page's memory. They are not uploaded or saved by this tool."
      title="Key Pair Generator"
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="key-type">
              Key type
            </label>
            <select
              className="select w-full"
              disabled={generating}
              id="key-type"
              onChange={(event) =>
                setKeyType(event.target.value as 'RSA' | 'EC')
              }
              value={keyType}
            >
              <option value="RSA">RSA</option>
              <option value="EC">Elliptic curve (EC)</option>
            </select>
          </div>
          {keyType === 'RSA' ? (
            <div className="space-y-2">
              <label
                className="block text-sm font-medium"
                htmlFor="rsa-key-size"
              >
                RSA key size
              </label>
              <select
                className="select w-full"
                disabled={generating}
                id="rsa-key-size"
                onChange={(event) =>
                  setKeySize(
                    Number(event.target.value) as (typeof rsaKeySizes)[number],
                  )
                }
                value={keySize}
              >
                {rsaKeySizes.map((size) => (
                  <option key={size} value={size}>
                    {size} bits
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="ec-curve">
                EC curve
              </label>
              <select
                className="select w-full"
                disabled={generating}
                id="ec-curve"
                onChange={(event) =>
                  setCurve(event.target.value as (typeof ecCurves)[number])
                }
                value={curve}
              >
                {ecCurves.map((namedCurve) => (
                  <option key={namedCurve} value={namedCurve}>
                    {namedCurve}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <p className="text-sm leading-6 text-base-content/65">
          {keyType === 'RSA'
            ? 'RSA is widely supported. Larger keys may take longer to generate.'
            : 'EC keys are compact. Their supported uses depend on the receiving application.'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn btn-primary"
            disabled={generating}
            onClick={() => void generate()}
            type="button"
          >
            <KeyRound aria-hidden="true" size={16} />
            {generating ? 'Generating…' : 'Generate key pair'}
          </button>
          <button className="btn btn-ghost" onClick={clear} type="button">
            <Eraser aria-hidden="true" size={16} />
            Clear
          </button>
        </div>
        <div aria-atomic="true" className="text-sm" role="status">
          {generating ? (
            'Generating keys on this device…'
          ) : resultLabel ? (
            <span>
              Key pair ready:{' '}
              <span className="font-mono font-medium">{resultLabel}</span>
            </span>
          ) : (
            'Choose your settings, then generate a key pair.'
          )}
        </div>
        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          <KeyOutput
            kind="public"
            onError={setError}
            value={result?.publicKey ?? ''}
            visible
          />
          <KeyOutput
            kind="private"
            onError={setError}
            onToggle={() => setShowPrivate((visible) => !visible)}
            value={result?.privateKey ?? ''}
            visible={showPrivate}
          />
        </div>
      </div>
    </ToolLayout>
  );
}
