import React, { useState } from 'react';
import { OpportunityCard } from './OpportunityCard';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Heart, Target, Share2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DeleteOpportunityDialog } from './DeleteOpportunityDialog';

interface EnhancedOpportunityCardProps {
  opportunity: any;
  onViewDetails: (opportunityId: string) => void;
  isHighlighted?: boolean;
  onToggleFavorite?: (opportunityId: string) => Promise<void>;
  onStartValidation?: (opportunityId: string) => void;
  onAssigneeChange?: (opportunityId: string, assigneeId?: string) => Promise<void>;
  onDeleteOpportunity?: (opportunityId: string) => Promise<void>;
}

export const EnhancedOpportunityCard = (props: EnhancedOpportunityCardProps) => {
  const { opportunity, onToggleFavorite, onDeleteOpportunity, isHighlighted } = props;
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debug highlighting on mobile
  React.useEffect(() => {
    if (isMobile && isHighlighted) {
      console.log('Mobile highlighting:', { opportunityId: opportunity.id, isHighlighted });
    }
  }, [isMobile, isHighlighted, opportunity.id]);

  const handleSwipeLeft = () => {
    if (!isMobile || !onToggleFavorite) return;
    
    setIsAnimating(true);
    setSwipeOffset(-100);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
    
    setTimeout(async () => {
      await onToggleFavorite(opportunity.id);
      setSwipeOffset(0);
      setIsAnimating(false);
    }, 200);
  };

  const handleSwipeRight = () => {
    if (!isMobile || !onDeleteOpportunity) return;
    
    setIsAnimating(true);
    setSwipeOffset(100);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50); // Stronger vibration for delete
    }
    
    setTimeout(() => {
      setShowDeleteDialog(true);
      setSwipeOffset(0);
      setIsAnimating(false);
    }, 200);
  };

  const handleDeleteConfirm = async () => {
    if (!onDeleteOpportunity) return;
    
    setIsDeleting(true);
    try {
      await onDeleteOpportunity(opportunity.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const swipeRef = useSwipeGestures({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    threshold: 100
  });

  if (!isMobile) {
    return <OpportunityCard {...props} />;
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background Actions */}
      <div className="absolute inset-0 flex">
        {/* Left action (Favorite) */}
        <div className={cn(
          "w-20 flex items-center justify-center",
          opportunity.is_favorited ? "bg-red-500" : "bg-pink-500"
        )}>
          <Heart className={cn(
            "w-6 h-6 text-white",
            opportunity.is_favorited && "fill-current"
          )} />
        </div>
        <div className="flex-1" />
        {/* Right action (Delete) */}
        <div className="w-20 bg-destructive flex items-center justify-center">
          <Trash2 className="w-6 h-6 text-destructive-foreground" />
        </div>
      </div>

      {/* Main Card */}
      <div
        ref={swipeRef as any}
        className={cn(
          "relative bg-background transition-transform",
          isAnimating ? "duration-200" : "duration-0"
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`
        }}
      >
        <OpportunityCard {...props} />
      </div>

      {/* Swipe Instructions (show only for first few cards) */}
      {!localStorage.getItem('swipe-instructions-shown') && (
        <div 
          className="absolute top-2 right-2 bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded-full animate-pulse"
          onClick={() => localStorage.setItem('swipe-instructions-shown', 'true')}
        >
          ← Favorite | Delete →
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteOpportunityDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        opportunityTitle={opportunity.title}
        isDeleting={isDeleting}
      />
    </div>
  );
};