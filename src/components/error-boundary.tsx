"use client";

import React, { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { getUserFriendlyError, categorizeError, getRetryMessage } from "@/lib/error-messages";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary component to catch and handle React errors
 * Provides user-friendly error messages and recovery options
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    logger.error("React Error Boundary caught error", error, {
      componentStack: errorInfo.componentStack,
    });
    
    this.setState({
      error,
      errorInfo,
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default error UI
      const friendlyMessage = getUserFriendlyError(this.state.error);
      const errorCategory = categorizeError(this.state.error);
      const retryMessage = getRetryMessage(errorCategory);

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 text-center">
            <div className="mb-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
              <h2 className="text-xl font-semibold mb-2">Oops, une erreur s&apos;est produite</h2>
              <p className="text-muted-foreground mb-4">{friendlyMessage}</p>
              {retryMessage && (
                <p className="text-sm text-muted-foreground">{retryMessage}</p>
              )}
            </div>

            <div className="space-y-2">
              <Button
                onClick={this.resetError}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Réessayer
              </Button>
              
              <Button
                onClick={() => window.location.href = "/"}
                className="w-full"
                variant="outline"
              >
                <Home className="mr-2 h-4 w-4" />
                Retour à l&apos;accueil
              </Button>
            </div>

            {/* Show technical details in development */}
            {process.env.NODE_ENV === "development" && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Détails techniques
                </summary>
                <pre className="mt-2 text-xs overflow-auto p-2 bg-muted rounded">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary wrapper
 * Can be used with React Suspense and Error Boundaries
 */
export function ErrorBoundaryWrapper({ 
  children,
  fallback,
}: { 
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}) {
  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}