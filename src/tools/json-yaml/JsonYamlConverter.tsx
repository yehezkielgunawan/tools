import { ArrowLeftRight, Eraser } from 'lucide-react';
import { useState } from 'react';
import ToolLayout from '../../components/layout/ToolLayout';
import TextConversionPanels from '../text-shared/TextConversionPanels';
import { jsonToYaml, yamlToJson } from './jsonYamlUtils';

export default function JsonYamlConverter() {
  const [direction, setDirection] = useState('json-to-yaml');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fromJson = direction === 'json-to-yaml';

  function resetResult() {
    setOutput('');
    setError(null);
  }
  function convert() {
    const result = (fromJson ? jsonToYaml : yamlToJson)(input);
    setOutput(result.ok ? result.value : '');
    setError(result.ok ? null : result.error);
  }

  return (
    <ToolLayout
      category="Developer"
      description="Convert JSON to YAML and YAML to JSON, entirely in your browser."
      title="JSON ↔ YAML"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="text-sm font-medium" htmlFor="json-yaml-direction">
            Conversion direction
          </label>
          <select
            className="select w-full sm:w-56"
            id="json-yaml-direction"
            onChange={(event) => {
              setDirection(event.target.value);
              resetResult();
            }}
            value={direction}
          >
            <option value="json-to-yaml">JSON → YAML</option>
            <option value="yaml-to-json">YAML → JSON</option>
          </select>
        </div>
        <TextConversionPanels
          error={error}
          input={input}
          inputLabel={fromJson ? 'JSON input' : 'YAML input'}
          onInputChange={(value) => {
            setInput(value);
            resetResult();
          }}
          output={output}
          outputLabel={fromJson ? 'YAML output' : 'JSON output'}
          placeholder={
            fromJson
              ? '{"name":"Yehezgun","active":true}'
              : 'name: Yehezgun\nactive: true'
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn" onClick={convert} type="button">
            Convert
          </button>
          <button
            className="btn btn-ghost"
            disabled={!output}
            onClick={() => {
              setInput(output);
              setDirection(fromJson ? 'yaml-to-json' : 'json-to-yaml');
              resetResult();
            }}
            type="button"
          >
            <ArrowLeftRight aria-hidden="true" size={16} />
            Use output as reverse input
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
          Uses YAML 1.2 and two-space indentation. YAML comments and formatting
          are lost when converting through JSON. Only JSON-compatible values and
          string mapping keys are supported. Integers outside JavaScript’s safe
          range are rejected in YAML; JSON numbers use JavaScript precision.
        </p>
      </div>
    </ToolLayout>
  );
}
