import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logger } from '../../utils/logger';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('ErrorBoundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleRefresh = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { fallbackTitle = 'Something went wrong', fallbackMessage } = this.props;

      return (
        <div className="min-h-[200px] flex items-center justify-center p-8">
          <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full text-center">
            <div className="flex justify-center text-amber-500 mb-4">
              <AlertTriangle size={40} />
            </div>
            <h2 className="text-xl font-bogart font-medium text-charcoal mb-2">
              {fallbackTitle}
            </h2>
            <p className="text-gray-600 mb-4 text-sm">
              {fallbackMessage || this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-charcoal font-medium rounded-md text-sm transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleRefresh}
                className="px-4 py-2 bg-blueberry hover:bg-blueberry/90 text-white font-medium rounded-md text-sm flex items-center gap-2 transition-colors"
              >
                <RefreshCw size={16} />
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
