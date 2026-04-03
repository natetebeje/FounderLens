
import React, { memo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedLoadingSkeletonProps {
  count?: number;
  type?: 'opportunity' | 'discovery' | 'profile';
}

const OpportunitySkeletonCard = memo(() => (
  <Card className="animate-pulse">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-14" />
          </div>
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
    </CardHeader>
    
    <CardContent className="pt-0 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 text-center">
            <Skeleton className="h-4 w-4 mx-auto" />
            <Skeleton className="h-3 w-16 mx-auto" />
            <Skeleton className="h-4 w-12 mx-auto" />
          </div>
        ))}
      </div>
      
      <Skeleton className="h-16 w-full" />
      
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
      </div>
    </CardContent>
  </Card>
));

OpportunitySkeletonCard.displayName = 'OpportunitySkeletonCard';

const DiscoverySkeletonCard = memo(() => (
  <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
    <CardHeader className="text-center">
      <div className="flex items-center justify-center mb-4">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
      <Skeleton className="h-8 w-64 mx-auto mb-2" />
      <Skeleton className="h-4 w-96 mx-auto" />
    </CardHeader>
    <CardContent className="space-y-6">
      <Skeleton className="h-12 w-full" />
      <div className="flex gap-4">
        <Skeleton className="h-12 flex-1" />
        <Skeleton className="h-12 flex-1" />
      </div>
    </CardContent>
  </Card>
));

DiscoverySkeletonCard.displayName = 'DiscoverySkeletonCard';

const ProfileSkeletonCard = memo(() => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    </CardContent>
  </Card>
));

ProfileSkeletonCard.displayName = 'ProfileSkeletonCard';

export const OptimizedLoadingSkeleton = memo(({ 
  count = 6, 
  type = 'opportunity' 
}: OptimizedLoadingSkeletonProps) => {
  const SkeletonComponent = {
    opportunity: OpportunitySkeletonCard,
    discovery: DiscoverySkeletonCard,
    profile: ProfileSkeletonCard
  }[type];

  return (
    <div className="grid gap-8">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonComponent key={index} />
      ))}
    </div>
  );
});

OptimizedLoadingSkeleton.displayName = 'OptimizedLoadingSkeleton';
