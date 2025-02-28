import React from 'react';
import { Alert, Stack, Text, Button } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error caught by boundary:', error);
    console.error('Component stack:', info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Alert 
          icon={<IconAlertCircle size={16} />}
          title="Something went wrong"
          color="red"
          variant="filled"
        >
          <Stack gap="xs">
            <Text size="sm">An error occurred while rendering this component.</Text>
            <Button 
              variant="white" 
              size="xs"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </Button>
          </Stack>
        </Alert>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;