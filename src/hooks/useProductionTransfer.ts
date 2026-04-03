import { useState, useCallback } from 'react';
import { EnhancedGuestTransferService, TransferResult } from '@/utils/enhancedGuestTransferV2';
import { productionLogger } from '@/utils/productionLogger';
import { useToast } from '@/hooks/use-toast';

interface UseProductionTransferResult {
  isTransferring: boolean;
  transferProgress: number;
  transferMessage: string;
  transferError: Error | null;
  transferSuccess: boolean;
  transferredCount: number;
  startTransfer: (userId: string, organizationId: string) => Promise<void>;
  retryTransfer: () => void;
  resetTransfer: () => void;
}

export const useProductionTransfer = (): UseProductionTransferResult => {
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferMessage, setTransferMessage] = useState('');
  const [transferError, setTransferError] = useState<Error | null>(null);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [transferredCount, setTransferredCount] = useState(0);
  const [lastTransferParams, setLastTransferParams] = useState<{ userId: string; organizationId: string } | null>(null);
  const { toast } = useToast();

  const resetTransfer = useCallback(() => {
    setIsTransferring(false);
    setTransferProgress(0);
    setTransferMessage('');
    setTransferError(null);
    setTransferSuccess(false);
    setTransferredCount(0);
  }, []);

  const startTransfer = useCallback(async (userId: string, organizationId: string) => {
    // Reset state
    resetTransfer();
    setIsTransferring(true);
    setLastTransferParams({ userId, organizationId });

    productionLogger.info('Starting production transfer', 'transfer', { userId, organizationId });

    try {
      const result: TransferResult = await EnhancedGuestTransferService.transferGuestOpportunities(
        userId,
        organizationId,
        {
          maxRetries: 3,
          baseDelay: 2000,
          timeoutMs: 60000, // 60 seconds for production
          progressCallback: (progress: number, message: string) => {
            setTransferProgress(progress);
            setTransferMessage(message);
            productionLogger.debug(`Transfer progress: ${progress}% - ${message}`, 'transfer');
          }
        }
      );

      if (result.success) {
        setTransferSuccess(true);
        setTransferredCount(result.opportunitiesTransferred);
        setTransferProgress(100);
        setTransferMessage('Transfer completed successfully!');

        toast({
          title: "🎉 Transfer Complete!",
          description: `Successfully transferred ${result.opportunitiesTransferred} opportunities to your account`,
        });

        productionLogger.info('Transfer completed successfully', 'transfer', {
          userId,
          organizationId,
          transferredCount: result.opportunitiesTransferred,
          duration: result.duration
        });
      } else {
        throw new Error(result.error || 'Transfer failed');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown transfer error');
      setTransferError(err);
      setTransferProgress(0);
      setTransferMessage('Transfer failed');

      productionLogger.error('Transfer failed', err, 'transfer', {
        userId,
        organizationId,
        retryable: true
      });

      toast({
        title: "Transfer Failed",
        description: "Don't worry, your opportunities are safe. You can try again.",
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
    }
  }, [resetTransfer, toast]);

  const retryTransfer = useCallback(() => {
    if (lastTransferParams) {
      startTransfer(lastTransferParams.userId, lastTransferParams.organizationId);
    }
  }, [lastTransferParams, startTransfer]);

  return {
    isTransferring,
    transferProgress,
    transferMessage,
    transferError,
    transferSuccess,
    transferredCount,
    startTransfer,
    retryTransfer,
    resetTransfer
  };
};