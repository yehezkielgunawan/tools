import { useEffect, useState } from 'react';
import { useRegisterSW } from 'rsbuild-plugin-pwa_vm/react';

export default function PwaUpdatePrompt() {
  const [isDismissed, setIsDismissed] = useState(false);
  const {
    newSwActive: [newSwActive],
    newSwWaiting: [newSwWaiting],
    skipWaiting,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('Service worker registration failed', error);
    },
  });

  useEffect(() => {
    if (!newSwWaiting) {
      setIsDismissed(false);
    }
  }, [newSwWaiting]);

  useEffect(() => {
    if (newSwActive) {
      window.location.reload();
    }
  }, [newSwActive]);

  if (!newSwWaiting || isDismissed) {
    return null;
  }

  return (
    <div className="toast toast-end z-50 p-4">
      <div
        aria-atomic="true"
        className="alert alert-info flex-col items-stretch gap-3 sm:flex-row sm:items-center"
        role="status"
      >
        <div className="min-w-0 flex-1">
          <p className="font-semibold">A new version is ready.</p>
          <p className="mt-1 text-sm opacity-80">
            Refresh when you are ready to use the latest tools.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => void skipWaiting()}
            type="button"
          >
            Refresh
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setIsDismissed(true)}
            type="button"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
