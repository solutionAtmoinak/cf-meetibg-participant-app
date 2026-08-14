import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last-resort catch for uncaught render errors (e.g. a malformed/garbage
 * join — random ids from a URL, a stale link, a participant record missing
 * a field) — without this, React unmounts the whole tree on any such error
 * and the page just goes blank with no way back.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center text-text-dim">
        <h1 className="text-xl text-text font-semibold m-0">Something went wrong</h1>
        <p className="max-w-md text-[0.9rem] m-0">{this.state.error.message || 'An unexpected error occurred.'}</p>
        <a
          href="/"
          className="rounded-md border border-border bg-accent px-4 py-2 text-white text-[0.9rem] no-underline hover:bg-accent-hover"
        >
          Back to join page
        </a>
      </div>
    );
  }
}
