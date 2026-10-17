import { cloneElement, type ReactElement, useId } from 'react';
import type {
  DocumentKind,
  ImageExportOptions,
  PdfImageOptions,
  PptxImageOptions,
} from './conversionTypes';

export function Setting({
  label,
  children,
}: {
  label: string;
  children: ReactElement<{ id?: string }>;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-2 text-sm">
      <label className="font-medium" htmlFor={id}>
        {label}
      </label>
      {cloneElement(children, { id })}
    </div>
  );
}

export function ImageExportSettings({
  options,
  onChange,
}: {
  options: ImageExportOptions;
  onChange: (options: ImageExportOptions) => void;
}) {
  return (
    <>
      <Setting label="Image format">
        <select
          className="select w-full"
          value={options.format}
          onChange={(e) =>
            onChange({
              ...options,
              format: e.target.value as ImageExportOptions['format'],
            })
          }
        >
          <option value="image/png">PNG · lossless</option>
          <option value="image/jpeg">JPEG · smaller files</option>
        </select>
      </Setting>
      <Setting label="Longest edge">
        <select
          className="select w-full"
          value={options.maxEdge}
          onChange={(e) =>
            onChange({ ...options, maxEdge: Number(e.target.value) })
          }
        >
          {[1024, 1600, 2048, 3072].map((value) => (
            <option value={value} key={value}>
              {value} px
            </option>
          ))}
        </select>
      </Setting>
      {options.format === 'image/jpeg' ? (
        <Setting label="JPEG quality">
          <select
            className="select w-full"
            value={options.quality}
            onChange={(e) =>
              onChange({ ...options, quality: Number(e.target.value) })
            }
          >
            <option value={0.7}>70% · compact</option>
            <option value={0.85}>85% · balanced</option>
            <option value={0.95}>95% · high quality</option>
          </select>
        </Setting>
      ) : null}
      <p className="text-xs leading-5 text-base-content/65">
        Aspect ratios are preserved. Pages are exported on a white background.
      </p>
    </>
  );
}

export function DocumentExportSettings({
  kind,
  pdf,
  pptx,
  onPdfChange,
  onPptxChange,
}: {
  kind: DocumentKind;
  pdf: PdfImageOptions;
  pptx: PptxImageOptions;
  onPdfChange: (options: PdfImageOptions) => void;
  onPptxChange: (options: PptxImageOptions) => void;
}) {
  const fit = kind === 'pdf' ? pdf.fit : pptx.fit;
  return (
    <>
      {kind === 'pdf' ? (
        <>
          <Setting label="Page size">
            <select
              className="select w-full"
              value={pdf.pageSize}
              onChange={(e) =>
                onPdfChange({
                  ...pdf,
                  pageSize: e.target.value as PdfImageOptions['pageSize'],
                })
              }
            >
              <option value="a4">A4</option>
              <option value="letter">US Letter</option>
              <option value="image">Match each image (96 px/in)</option>
            </select>
          </Setting>
          {pdf.pageSize !== 'image' ? (
            <>
              <Setting label="Orientation">
                <select
                  className="select w-full"
                  value={pdf.orientation}
                  onChange={(e) =>
                    onPdfChange({
                      ...pdf,
                      orientation: e.target
                        .value as PdfImageOptions['orientation'],
                    })
                  }
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </Setting>
              <Setting label="Margins">
                <select
                  className="select w-full"
                  value={pdf.margin}
                  onChange={(e) =>
                    onPdfChange({ ...pdf, margin: Number(e.target.value) })
                  }
                >
                  <option value={0}>None</option>
                  <option value={18}>Small · ¼ inch</option>
                  <option value={36}>Standard · ½ inch</option>
                </select>
              </Setting>
            </>
          ) : null}
        </>
      ) : (
        <Setting label="Slide size">
          <select
            className="select w-full"
            value={pptx.layout}
            onChange={(e) =>
              onPptxChange({
                ...pptx,
                layout: e.target.value as PptxImageOptions['layout'],
              })
            }
          >
            <option value="wide">Widescreen · 16:9</option>
            <option value="standard">Standard · 4:3</option>
          </select>
        </Setting>
      )}
      <Setting label="Image placement">
        <select
          className="select w-full"
          value={fit}
          onChange={(e) => {
            const next = e.target.value as 'contain' | 'cover';
            if (kind === 'pdf') onPdfChange({ ...pdf, fit: next });
            else onPptxChange({ ...pptx, fit: next });
          }}
        >
          <option value="contain">Fit · keep the whole image</option>
          <option value="cover">Fill · crop to the page</option>
        </select>
      </Setting>
      <p className="text-xs leading-5 text-base-content/65">
        One image per {kind === 'pdf' ? 'page' : 'slide'}, in your chosen order.
        Images are normalized up to 3072 px; text stays part of the image.
      </p>
    </>
  );
}
