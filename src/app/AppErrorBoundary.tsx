import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export default class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Application render error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="mx-auto flex w-full max-w-4xl flex-col items-start px-4 py-20 sm:px-6">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-error">
            Error
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="mt-3 max-w-md leading-7 text-base-content/60">
            Try reloading the page or return to the homepage.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              className="btn"
              onClick={() => window.location.reload()}
              type="button"
            >
              Reload page
            </button>
            <a className="btn btn-ghost" href="/">
              Back to homepage
            </a>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
