import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, Wifi } from 'lucide-react';
import { logger } from '@/utils/logger';

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineAlert, setShowOfflineAlert] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      logger.info('Network: Connection restored');
      setIsOnline(true);
      setShowOfflineAlert(false);
    };

    const handleOffline = () => {
      logger.warn('Network: Connection lost');
      setIsOnline(false);
      setShowOfflineAlert(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showOfflineAlert) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4">
      <Alert variant="destructive" className="max-w-md mx-auto">
        <WifiOff className="h-4 w-4" />
        <AlertDescription className="flex items-center gap-2">
          You're currently offline. Some features may not work properly.
          {isOnline && (
            <span className="text-green-600 flex items-center gap-1">
              <Wifi className="h-4 w-4" />
              Reconnected
            </span>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
};