import { Check, Copy } from 'lucide-react';
import { useClipboard } from '../../hooks/useClipboard';

interface CopyButtonProps {
  text: string;
}

export default function CopyButton({ text }: CopyButtonProps) {
  const { copied, error, copy } = useClipboard();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className="btn btn-ghost btn-sm"
        disabled={!text.trim()}
        onClick={() => void copy(text)}
        type="button"
      >
        {copied ? (
          <Check aria-hidden="true" size={15} />
        ) : (
          <Copy aria-hidden="true" size={15} />
        )}
        {copied ? 'Copied' : 'Copy'}
      </button>
      {error ? (
        <span className="text-right text-xs text-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
