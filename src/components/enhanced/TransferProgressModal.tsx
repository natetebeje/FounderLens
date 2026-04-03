import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { ProductionErrorHandler } from "./ProductionErrorHandler";

interface TransferProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  progress: number;
  message: string;
  error?: Error;
  success?: boolean;
  transferredCount?: number;
}

export const TransferProgressModal = ({
  isOpen,
  onClose,
  onRetry,
  progress,
  message,
  error,
  success,
  transferredCount
}: TransferProgressModalProps) => {
  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number | null>(null);

  // Auto-close on success after 3 seconds
  useEffect(() => {
    if (success && transferredCount !== undefined) {
      setAutoCloseCountdown(3);
      const interval = setInterval(() => {
        setAutoCloseCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            onClose();
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [success, transferredCount, onClose]);

  const getStatusIcon = () => {
    if (success) return <CheckCircle className="w-8 h-8 text-green-600" />;
    if (error) return <XCircle className="w-8 h-8 text-red-600" />;
    return <Loader2 className="w-8 h-8 text-primary animate-spin" />;
  };

  const getStatusColor = () => {
    if (success) return "text-green-600";
    if (error) return "text-red-600";
    return "text-primary";
  };

  return (
    <Dialog open={isOpen} onOpenChange={!error ? onClose : undefined}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getStatusIcon()}
            <span className={getStatusColor()}>
              {success ? "Transfer Complete!" : error ? "Transfer Failed" : "Transferring Opportunities"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          {!error && !success && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                {progress}% - {message}
              </p>
            </div>
          )}

          {/* Success State */}
          {success && transferredCount !== undefined && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Successfully transferred {transferredCount} opportunities to your account!
                {autoCloseCountdown && (
                  <div className="mt-2 text-sm">
                    Closing in {autoCloseCountdown} seconds...
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Error State */}
          {error && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  Failed to transfer your opportunities. Don't worry, your data is safe in local storage.
                </AlertDescription>
              </Alert>
              
              <ProductionErrorHandler
                error={error}
                context="opportunity transfer"
                onRetry={onRetry}
                retryable={true}
                showOfflineIndicator={true}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            {success && (
              <Button onClick={onClose} className="flex-1">
                Continue to Dashboard
              </Button>
            )}
            
            {error && (
              <>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button onClick={onRetry}>
                  Try Again
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};