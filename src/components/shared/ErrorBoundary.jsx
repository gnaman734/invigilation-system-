import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('UI boundary caught an error:', error);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <section className="rounded-2xl border border-white/8 bg-[#111118] p-5 text-white/60">
        <h3 className="text-sm font-medium text-white/50">Something went wrong</h3>
        {import.meta.env.DEV && this.state.error?.message ? (
          <p className="mt-2 text-xs text-white/35">{this.state.error.message}</p>
        ) : null}
        <button type="button" className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-xs text-white/40 hover:text-white/70" onClick={() => window.location.reload()}>
          Refresh page
        </button>
      </section>
    );
  }
}
