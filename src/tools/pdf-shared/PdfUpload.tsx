import { Upload } from 'lucide-react';
import { useId, useState } from 'react';

interface PdfUploadProps {
  multiple?: boolean;
  disabled: boolean;
  onFiles: (files: File[]) => void;
}

export default function PdfUpload({
  multiple = false,
  disabled,
  onFiles,
}: PdfUploadProps) {
  const id = useId();
  const [dragging, setDragging] = useState(false);
  return (
    <section
      aria-label="PDF upload"
      className={`space-y-3 rounded-box border border-dashed p-5 transition-colors sm:p-6 ${dragging && !disabled ? 'border-base-content bg-base-200' : 'border-base-300 bg-base-200/30'}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) onFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <div className="flex items-center gap-3">
        <Upload
          aria-hidden="true"
          size={22}
          className="shrink-0 text-base-content/60"
        />
        <div>
          <label className="block text-sm font-semibold" htmlFor={id}>
            {multiple ? 'Choose PDFs' : 'Choose a PDF'}
          </label>
          <p
            className="mt-1 text-xs leading-5 text-base-content/70"
            id={`${id}-help`}
          >
            Drop {multiple ? 'your files' : 'a file'} here or use the picker. Up
            to 25 MB per PDF.
          </p>
        </div>
      </div>
      <input
        accept="application/pdf,.pdf"
        aria-describedby={`${id}-help`}
        className="file-input w-full"
        disabled={disabled}
        id={id}
        multiple={multiple}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = '';
          if (files.length) onFiles(files);
        }}
        type="file"
      />
    </section>
  );
}
