import { type TextField, textLimits } from './cardModel';

interface CardTextFieldProps {
  field: TextField;
  label: string;
  value: string;
  error?: string;
  optional?: boolean;
  onChange: (value: string) => void;
}

export default function CardTextField({
  field,
  label,
  value,
  error,
  optional,
  onChange,
}: CardTextFieldProps) {
  const id = `card-${field}`;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const props = {
    id,
    value,
    required: !optional,
    'aria-invalid': Boolean(error),
    'aria-describedby': `${helpId}${error ? ` ${errorId}` : ''}`,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(event.currentTarget.value),
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-sm font-medium" htmlFor={id}>
          {label}
        </label>
        {optional ? (
          <span className="text-xs text-base-content/75">Optional</span>
        ) : null}
      </div>
      {field === 'message' ? (
        <textarea
          {...props}
          className={`textarea min-h-36 w-full resize-y text-sm leading-6 ${error ? 'textarea-error' : ''}`}
          rows={5}
        />
      ) : (
        <input
          {...props}
          className={`input w-full ${error ? 'input-error' : ''}`}
          type="text"
        />
      )}
      <p className="text-xs leading-5 text-base-content/75" id={helpId}>
        {value.replace(/\r\n?/g, '\n').trim().length} / {textLimits[field]}{' '}
        characters
        {field === 'message' ? ' · Up to 12 lines' : ''}
      </p>
      {error ? (
        <p className="text-sm text-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
