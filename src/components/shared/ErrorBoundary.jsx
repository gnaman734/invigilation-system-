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
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
        <h3 className="text-lg font-semibold">Something went wrong</h3>
        {import.meta.env.DEV && this.state.error?.message ? (
          <p className="mt-2 text-sm">{this.state.error.message}</p>
        ) : null}
        <button type="button" className="app-btn-danger mt-4" onClick={this.handleReset}>
          Try Again
        </button>
      </section>
    );
  }
}
