import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeleteOpportunityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  opportunityTitle: string;
  isDeleting?: boolean;
}

export const DeleteOpportunityDialog = ({
  isOpen,
  onClose,
  onConfirm,
  opportunityTitle,
  isDeleting = false
}: DeleteOpportunityDialogProps) => {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmEnabled = confirmText === opportunityTitle;

  const handleConfirm = () => {
    if (isConfirmEnabled) {
      onConfirm();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setConfirmText('');
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Opportunity</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              This action cannot be undone. This will permanently delete the opportunity and all associated data including:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Validation tasks and workflows</li>
              <li>Market intelligence and research</li>
              <li>Comments and activity history</li>
              <li>Generated content and prompts</li>
            </ul>
            <div className="space-y-2">
              <Label htmlFor="confirm-title">
                Type <strong>{opportunityTitle}</strong> to confirm:
              </Label>
              <Input
                id="confirm-title"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Enter opportunity title"
                disabled={isDeleting}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete Opportunity"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};