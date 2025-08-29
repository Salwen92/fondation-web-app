import { Box, Text } from 'ink';
import type React from 'react';
import { Component, type ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(_error: Error, _errorInfo: React.ErrorInfo) {
    // Error is already displayed in the UI - avoid console output that interferes with Ink
  }

  override render() {
    if (this.state.hasError) {
      return (
        <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1}>
          <Text bold color="red">
            UI Error Occurred
          </Text>
          <Box marginTop={1}>
            <Text color="red">{this.state.error?.message || 'An unexpected error occurred'}</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Please check the console for more details.</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>You can restart the application or try a different command.</Text>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
