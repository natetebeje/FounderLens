import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw, Home, Clock, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { logger } from "@/utils/logger";

interface ProductionErrorHandlerProps {
  error?: Error;
  context?: string;
  onRetry?: () => void;
  retryable?: boolean;
  showOfflineIndicator?: boolean;
}

export const ProductionErrorHandler = ({ 
  error, 
  context = "operation", 
  onRetry, 
  retryable = true,
  showOfflineIndicator = true 
}: ProductionErrorHandlerProps) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [timeoutDuration, setTimeoutDuration] = useState(15000); // Start with 15s
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      logger.info('Network: Connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      logger.warn('Network: Connection lost');
    };

    if (showOfflineIndicator) {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [showOfflineIndicator]);

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    // Progressive timeout: increase timeout with each retry
    const newTimeout = Math.min(timeoutDuration * 1.5, 45000); // Max 45s
    setTimeoutDuration(newTimeout);

    try {
      // Create timeout promise for progressive timeout handling
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), newTimeout)
      );

      // Race between retry operation and timeout
      await Promise.race([
        Promise.resolve(onRetry()),
        timeoutPromise
      ]);

      toast({
        title: "Success",
        description: `${context} completed successfully`,
      });

    } catch (retryError) {
      logger.error(`Retry failed for ${context}:`, retryError);
      
      if (retryError instanceof Error && retryError.message === 'Operation timeout') {
        toast({
          title: "Timeout",
          description: `${context} is taking longer than expected. Please try again.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Retry Failed",
          description: `${context} failed again. Please check your connection.`,
          variant: "destructive",
        });
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const getErrorCategory = (error?: Error) => {
    if (!error) return 'unknown';
    
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) return 'network';
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('auth') || message.includes('unauthorized')) return 'auth';
    if (message.includes('not found') || message.includes('404')) return 'not_found';
    if (message.includes('server') || message.includes('500')) return 'server';
    
    return 'unknown';
  };

  const errorCategory = getErrorCategory(error);
  const canRetry = retryable && retryCount < 3 && isOnline;

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          Operation Failed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Network Status */}
        {showOfflineIndicator && (
          <Alert variant={isOnline ? "default" : "destructive"}>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 w-4" />
              )}
              <AlertDescription>
                {isOnline ? "Connected" : "No internet connection"}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Error Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{errorCategory}</Badge>
            {retryCount > 0 && (
              <Badge variant="secondary">
                Attempt {retryCount + 1}
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">
            {error?.message || `Failed to complete ${context}`}
          </p>

          {/* Timeout Info */}
          {errorCategory === 'timeout' && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Timeout after {Math.round(timeoutDuration / 1000)}s</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {canRetry && (
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              variant="default"
              size="sm"
              className="flex-1"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>
          )}
          
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="sm"
          >
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground">
          {!isOnline && "Check your internet connection and try again."}
          {isOnline && retryCount >= 3 && "If the problem persists, please contact support."}
          {isOnline && errorCategory === 'auth' && "Please sign in again to continue."}
        </div>
      </CardContent>
    </Card>
  );
};