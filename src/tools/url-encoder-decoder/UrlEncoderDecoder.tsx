import { ArrowLeftRight, Eraser } from 'lucide-react';
import { useState } from 'react';
import ToolLayout from '../../components/layout/ToolLayout';
import TextConversionPanels from '../text-shared/TextConversionPanels';
import { transformUrl, type UrlEncodingMode } from './urlUtils';

export default function UrlEncoderDecoder() {
  const [mode, setMode] = useState<UrlEncodingMode>('component');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  function resetResult() {
    setOutput('');
    setError(null);
  }
  function convert(operation: 'encode' | 'decode') {
    const result = transformUrl(input, operation, mode);
    setOutput(result.ok ? result.value : '');
    setError(result.ok ? null : result.error);
  }

  return (
    <ToolLayout
      category="Developer"
      description="Encode text for URLs or decode percent-encoded text, with component and whole-URL modes."
      title="URL Encoder & Decoder"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="text-sm font-medium" htmlFor="url-encoding-mode">
            Encoding mode
          </label>
          <select
            aria-describedby="url-mode-help"
            className="select w-full sm:w-64"
            id="url-encoding-mode"
            onChange={(event) => {
              setMode(event.target.value as UrlEncodingMode);
              resetResult();
            }}
            value={mode}
          >
            <option value="component">Component (query value or text)</option>
            <option value="whole-url">Whole URL (preserve separators)</option>
          </select>
        </div>
        <p
          className="text-sm leading-6 text-base-content/65"
          id="url-mode-help"
        >
          {mode === 'component'
            ? 'Component mode encodes separators such as ?, &, and /. Use it for individual query values or text.'
            : 'Whole-URL mode preserves URL separators. Decoding also leaves percent-encoded reserved separators (such as %3F and %26) escaped.'}
        </p>
        <TextConversionPanels
          error={error}
          input={input}
          inputLabel="URL or text input"
          onInputChange={(value) => {
            setInput(value);
            resetResult();
          }}
          output={output}
          outputLabel="Result"
          placeholder="Hello world! 👋"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn"
            onClick={() => convert('encode')}
            type="button"
          >
            Encode
          </button>
          <button
            className="btn"
            onClick={() => convert('decode')}
            type="button"
          >
            Decode
          </button>
          <button
            className="btn btn-ghost"
            disabled={!output}
            onClick={() => {
              setInput(output);
              resetResult();
            }}
            type="button"
          >
            <ArrowLeftRight aria-hidden="true" size={16} />
            Use output as input
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setInput('');
              resetResult();
            }}
            type="button"
          >
            <Eraser aria-hidden="true" size={16} />
            Clear
          </button>
        </div>
        <p className="text-sm leading-6 text-base-content/65">
          Spaces encode as %20. Literal + characters remain + when decoding;
          form-style + → space conversion is not applied. Each action encodes or
          decodes once.
        </p>
      </div>
    </ToolLayout>
  );
}
