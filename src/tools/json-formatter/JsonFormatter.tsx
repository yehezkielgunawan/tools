import { Braces, CheckCircle2, Eraser, List, Minimize2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import ToolLayout from '../../components/layout/ToolLayout';
import CopyButton from '../../components/ui/CopyButton';
import JsonTreeViewer from './JsonTreeViewer';
import {
  formatJson,
  type JsonOperationResult,
  minifyJson,
  parseJson,
  validateJson,
} from './jsonUtils';

interface StatusMessage {
  kind: 'error' | 'success';
  message: string;
}

function getSuccessMessage(
  operation: 'format' | 'minify' | 'validate',
): string {
  if (operation === 'format') {
    return 'JSON formatted.';
  }

  if (operation === 'minify') {
    return 'JSON minified.';
  }

  return 'Valid JSON.';
}

export default function JsonFormatter() {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const parsed = useMemo(() => parseJson(value), [value]);

  const runOperation = (
    operation: 'format' | 'minify' | 'validate',
    transform: (input: string) => JsonOperationResult,
  ): void => {
    const result = transform(value);

    if (!result.ok) {
      setStatus({ kind: 'error', message: result.error });
      return;
    }

    if (operation !== 'validate') {
      setValue(result.value);
    }
    setStatus({ kind: 'success', message: getSuccessMessage(operation) });
  };

  const clear = (): void => {
    setValue('');
    setStatus(null);
  };

  return (
    <ToolLayout
      category="Developer"
      description="Format, validate, minify, and explore JSON in a collapsible tree without sending it anywhere."
      title="JSON Formatter & Viewer"
    >
      <div className="space-y-5">
        <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2">
          <div className="min-w-0">
            <label className="label" htmlFor="json-input">
              <span className="font-medium">JSON input</span>
            </label>
            <textarea
              aria-describedby={status ? 'json-status' : undefined}
              aria-invalid={status?.kind === 'error'}
              aria-label="JSON input"
              className="textarea min-h-96 w-full overflow-x-auto font-mono text-sm leading-6"
              id="json-input"
              onChange={(event) => {
                setValue(event.target.value);
                setStatus(null);
              }}
              placeholder={'{"name":"Yehezgun","active":true}'}
              spellCheck={false}
              value={value}
            />
          </div>
          <section aria-label="JSON tree preview" className="min-w-0">
            <h2 className="mb-2 text-sm font-medium">Tree preview</h2>
            <div className="max-h-[36rem] min-h-96 overflow-auto rounded-field border border-base-300 bg-base-200/30 p-3">
              {parsed.ok ? (
                <JsonTreeViewer key={value} value={parsed.value} />
              ) : (
                <p className="text-sm leading-6 text-base-content/60">
                  {value.trim()
                    ? 'Enter valid JSON to explore its structure.'
                    : 'Enter JSON to see its structure here.'}
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn btn-primary"
            onClick={() => runOperation('format', formatJson)}
            type="button"
          >
            <Braces aria-hidden="true" size={16} />
            Format
          </button>
          <button
            className="btn"
            onClick={() => runOperation('minify', minifyJson)}
            type="button"
          >
            <Minimize2 aria-hidden="true" size={16} />
            Minify
          </button>
          <button
            className="btn"
            onClick={() => runOperation('validate', validateJson)}
            type="button"
          >
            <CheckCircle2 aria-hidden="true" size={16} />
            Validate
          </button>
          <CopyButton text={value} />
          <button className="btn btn-ghost" onClick={clear} type="button">
            <Eraser aria-hidden="true" size={16} />
            Clear
          </button>
        </div>

        {status ? (
          <p
            className={
              status.kind === 'error'
                ? 'text-sm text-error'
                : 'text-sm text-success'
            }
            id="json-status"
            role={status.kind === 'error' ? 'alert' : 'status'}
          >
            {status.kind === 'success' ? (
              <List aria-hidden="true" className="mr-2 inline" size={15} />
            ) : null}
            {status.message}
          </p>
        ) : null}
      </div>
    </ToolLayout>
  );
}
