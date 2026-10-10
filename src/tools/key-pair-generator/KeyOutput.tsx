import { Download, Eye, EyeOff, KeyRound, LockKeyhole } from 'lucide-react';
import CopyButton from '../../components/ui/CopyButton';

interface KeyOutputProps {
  kind: 'public' | 'private';
  value: string;
  visible: boolean;
  onToggle?: () => void;
  onError: (message: string) => void;
}

export default function KeyOutput({
  kind,
  value,
  visible,
  onToggle,
  onError,
}: KeyOutputProps) {
  const label = kind === 'public' ? 'Public key' : 'Private key';
  const Icon = kind === 'public' ? KeyRound : LockKeyhole;
  const filename = kind === 'public' ? 'public-key.pub' : 'private-key.txt';
  const permissionCommand = `chmod ${kind === 'public' ? '644' : '600'} ${filename}`;

  const download = (downloadName = filename): void => {
    if (!value) return;
    let href: string | undefined;
    const anchor = document.createElement('a');
    try {
      href = URL.createObjectURL(
        new Blob([value], { type: 'application/x-pem-file' }),
      );
      anchor.href = href;
      anchor.download = downloadName;
      document.body.append(anchor);
      anchor.click();
    } catch {
      onError('Could not download the key. Try copying it instead.');
    } finally {
      anchor.remove();
      if (href) URL.revokeObjectURL(href);
    }
  };

  return (
    <section
      aria-labelledby={`${kind}-key-heading`}
      className="min-w-0 space-y-3 rounded-box border border-base-300 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          className="flex items-center gap-2 font-semibold"
          id={`${kind}-key-heading`}
        >
          <Icon aria-hidden="true" size={18} />
          {label}
        </h2>
        <span className="font-mono text-xs text-base-content/60">
          {kind === 'public' ? 'SPKI / PEM' : 'PKCS#8 / PEM'}
        </span>
      </div>
      {kind === 'private' && value && !visible ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-field border border-base-300 bg-base-200/50 px-4 text-center text-sm text-base-content/65">
          <LockKeyhole aria-hidden="true" size={24} />
          <p>
            Private key hidden.
            <br />
            You can still copy or download it.
          </p>
        </div>
      ) : (
        <textarea
          aria-label={label}
          className="textarea min-h-64 w-full resize-y font-mono text-xs leading-5"
          placeholder={
            kind === 'public'
              ? 'Your public key will appear here.'
              : 'Your private key will appear here.'
          }
          readOnly
          spellCheck={false}
          value={value}
          wrap="off"
        />
      )}
      <div className="flex flex-wrap items-start gap-2">
        <CopyButton key={value ? 'ready' : 'empty'} text={value} />
        <button
          className="btn btn-sm"
          disabled={!value}
          onClick={() => download()}
          type="button"
        >
          <Download aria-hidden="true" size={15} />
          Download {kind} key{kind === 'private' ? ' (.txt)' : ''}
        </button>
        {kind === 'private' ? (
          <button
            className="btn btn-sm"
            disabled={!value}
            onClick={() => download('private-key.pem')}
            type="button"
          >
            <Download aria-hidden="true" size={15} />
            Download private key (.pem)
          </button>
        ) : null}
        {kind === 'private' ? (
          <button
            aria-expanded={visible}
            className="btn btn-ghost btn-sm"
            disabled={!value}
            onClick={onToggle}
            type="button"
          >
            {visible ? (
              <EyeOff aria-hidden="true" size={15} />
            ) : (
              <Eye aria-hidden="true" size={15} />
            )}
            {visible ? 'Hide' : 'Show'} private key
          </button>
        ) : null}
      </div>
      <p className="text-xs leading-5 text-base-content/65">
        {kind === 'public'
          ? 'Share this key with the application that needs it. The .pub file contains SPKI / PEM data, not OpenSSH format.'
          : 'Private key downloads are unencrypted. Keep this file secret.'}
      </p>
      <div className="space-y-2 border-t border-base-300 pt-3">
        <p className="text-xs leading-5 text-base-content/65">
          Downloads as <span className="font-mono">{filename}</span>
          {kind === 'private'
            ? ' or private-key.pem, both containing PKCS#8 / PEM data'
            : ''}
          . Browsers cannot set file permissions. After downloading, run the
          matching command in the file’s folder on macOS or Linux. If you
          renamed the file, update the command to match.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="break-all font-mono text-xs">
            {permissionCommand}
          </code>
          <CopyButton
            label="Copy permission command"
            text={permissionCommand}
          />
        </div>
        {kind === 'private' ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="break-all font-mono text-xs">
              chmod 600 private-key.pem
            </code>
            <CopyButton
              label="Copy PEM permission command"
              text="chmod 600 private-key.pem"
            />
          </div>
        ) : null}
        <p className="text-xs leading-5 text-base-content/65">
          {kind === 'public'
            ? '644 allows the owner to read and write; others can only read.'
            : '600 allows only the owner to read and write. On Windows, use Properties → Security to restrict private-key access to your current user.'}
        </p>
      </div>
    </section>
  );
}
