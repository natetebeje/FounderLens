import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home, Bug, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
  retryLimit?: number;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId: string;
  retryCount: number;
  isOffline: boolean;
}

interface ErrorCategory {
  type: 'network' | 'chunk' | 'runtime' | 'unknown';
  message: string;
  canRetry: boolean;
  suggestion: string;
}

export class ProductionErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: '',
      retryCount: 0,
      isOffline: !navigator.onLine
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError } = this.props;
    
    this.setState({ errorInfo });
    
    // Log to console in development
    if (import.meta.env.DEV) {
      console.group(`🚨 Error Boundary Caught Error`);
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // Store error details for debugging
    try {
      const errorDetails = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        errorId: this.state.errorId
      };
      
      sessionStorage.setItem('last-error', JSON.stringify(errorDetails));
    } catch (storageError) {
      console.warn('Failed to store error details:', storageError);
    }

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }

    // Auto-retry for certain error types
    const category = this.categorizeError(error);
    if (category.canRetry && this.state.retryCount < (this.props.retryLimit || 3)) {
      this.scheduleRetry();
    }
  }

  componentDidMount() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  handleOnline = () => {
    this.setState({ isOffline: false });
  };

  handleOffline = () => {
    this.setState({ isOffline: true });
  };

  categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('network') || message.includes('fetch') || !navigator.onLine) {
      return {
        type: 'network',
        message: 'Network connection issue',
        canRetry: true,
        suggestion: 'Check your internet connection and try again'
      };
    }

    if (message.includes('loading chunk') || message.includes('loading css chunk')) {
      return {
        type: 'chunk',
        message: 'Failed to load application resources',
        canRetry: true,
        suggestion: 'This usually resolves by refreshing the page'
      };
    }

    if (stack.includes('react') || message.includes('render')) {
      return {
        type: 'runtime',
        message: 'Application runtime error',
        canRetry: false,
        suggestion: 'This appears to be a bug. Please report it to support.'
      };
    }

    return {
      type: 'unknown',
      message: 'An unexpected error occurred',
      canRetry: false,
      suggestion: 'Try refreshing the page or contact support if the issue persists'
    };
  }

  scheduleRetry = () => {
    this.retryTimeout = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1
      }));
    }, 2000 + (this.state.retryCount * 1000)); // Exponential backoff
  };

  handleRetry = () => {
    const { retryLimit = 3 } = this.props;
    
    if (this.state.retryCount >= retryLimit) {
      window.location.reload();
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    const { error, errorId, retryCount, isOffline } = this.state;
    const { retryLimit = 3, showDetails = import.meta.env.DEV } = this.props;
    const category = error ? this.categorizeError(error) : null;
    const canRetry = retryCount < retryLimit;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-destructive/20">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              {isOffline ? (
                <WifiOff className="h-12 w-12 text-muted-foreground" />
              ) : (
                <AlertTriangle className="h-12 w-12 text-destructive" />
              )}
            </div>
            <CardTitle className="text-2xl text-destructive">
              {isOffline ? 'You\'re Offline' : 'Something went wrong'}
            </CardTitle>
            {category && (
              <Badge variant="outline" className="mx-auto mt-2">
                {category.message}
              </Badge>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {isOffline ? (
              <Alert>
                <Wifi className="h-4 w-4" />
                <AlertDescription>
                  Please check your internet connection and try again.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert>
                  <Bug className="h-4 w-4" />
                  <AlertDescription>
                    {category?.suggestion || 'An unexpected error occurred. Please try again.'}
                  </AlertDescription>
                </Alert>

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Error ID: <code className="font-mono text-xs">{errorId}</code>
                  </p>
                  {retryCount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Retry attempt: {retryCount} of {retryLimit}
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {(canRetry || isOffline) && (
                <Button 
                  onClick={this.handleRetry}
                  variant="default"
                  className="flex items-center gap-2"
                  disabled={isOffline}
                >
                  <RefreshCw className="h-4 w-4" />
                  {canRetry ? 'Try Again' : 'Retry'}
                </Button>
              )}
              
              <Button 
                onClick={this.handleRefresh} 
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Page
              </Button>
              
              <Button 
                onClick={this.handleGoHome} 
                variant="ghost"
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </div>

            {showDetails && error && (
              <details className="mt-6">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  Technical Details
                </summary>
                <div className="mt-3 p-4 bg-muted rounded-md">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
                    {error.message}
                    {error.stack && `\n\nStack trace:\n${error.stack}`}
                  </pre>
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
}