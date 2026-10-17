import { useId } from 'react';

interface InvoiceFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  multiline?: boolean;
  type?: 'text' | 'date';
  numeric?: boolean;
  maxLength?: number;
}
export default function InvoiceField({
  label,
  value,
  onChange,
  error,
  multiline,
  type = 'text',
  numeric,
  maxLength = 200,
}: InvoiceFieldProps) {
  const id = useId();
  const shared = {
    id,
    value,
    maxLength,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${id}-error` : undefined,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(event.currentTarget.value),
  };
  return (
    <div className="min-w-0 space-y-1.5">
      <label className="block text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea
          {...shared}
          className={`textarea min-h-24 w-full ${error ? 'textarea-error' : ''}`}
          rows={3}
        />
      ) : (
        <input
          {...shared}
          type={type}
          inputMode={numeric ? 'decimal' : undefined}
          className={`input w-full ${error ? 'input-error' : ''}`}
        />
      )}
      {error ? (
        <p className="text-xs leading-5 text-error" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
