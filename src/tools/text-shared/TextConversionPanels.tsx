import { useId } from 'react';
import CopyButton from '../../components/ui/CopyButton';

interface TextConversionPanelsProps {
  input: string;
  output: string;
  inputLabel: string;
  outputLabel: string;
  placeholder: string;
  error: string | null;
  onInputChange: (value: string) => void;
}

export default function TextConversionPanels({
  input,
  output,
  inputLabel,
  outputLabel,
  placeholder,
  error,
  onInputChange,
}: TextConversionPanelsProps) {
  const id = useId();
  return (
    <div className="space-y-3">
      <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <label
            className="flex h-8 items-center text-sm font-medium"
            htmlFor={`${id}-input`}
          >
            {inputLabel}
          </label>
          <textarea
            aria-describedby={error ? `${id}-error` : undefined}
            aria-invalid={Boolean(error)}
            className="textarea min-h-80 w-full font-mono text-sm leading-6"
            id={`${id}-input`}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            value={input}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <div className="flex h-8 items-center justify-between gap-2">
            <label className="text-sm font-medium" htmlFor={`${id}-output`}>
              {outputLabel}
            </label>
            <CopyButton key={output} label="Copy output" text={output} />
          </div>
          <textarea
            className="textarea min-h-80 w-full bg-base-200/40 font-mono text-sm leading-6"
            id={`${id}-output`}
            placeholder="Your result will appear here."
            readOnly
            spellCheck={false}
            value={output}
          />
        </div>
      </div>
      {error ? (
        <p className="text-sm text-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
