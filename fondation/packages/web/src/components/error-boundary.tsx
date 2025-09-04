'use client';

import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import type { ErrorInfo, ReactNode } from 'react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service like Sentry
      // Placeholder for production error reporting
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="max-w-md w-full p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>

            <h2 className="text-xl font-semibold mb-2">Une erreur s&apos;est produite</h2>

            <p className="text-muted-foreground mb-6">
              Désolé, quelque chose s&apos;est mal passé. Veuillez réessayer ou retourner à
              l&apos;accueil.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-4 p-3 bg-muted rounded-lg text-left">
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = '/';
                }}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Accueil
              </Button>
              <Button onClick={this.handleReset} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Async error boundary for Suspense boundaries
export function AsyncErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center p-8">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <p className="text-muted-foreground">
                Erreur lors du chargement. Veuillez rafraîchir la page.
              </p>
            </div>
          </Card>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

// Alias for backward compatibility
export const ErrorBoundaryWrapper = ErrorBoundary;
