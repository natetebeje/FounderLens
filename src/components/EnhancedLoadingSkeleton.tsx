import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface EnhancedLoadingSkeletonProps {
  count?: number;
  showPulse?: boolean;
}

export const EnhancedLoadingSkeleton = ({ 
  count = 6, 
  showPulse = true 
}: EnhancedLoadingSkeletonProps) => {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, index) => (
        <Card 
          key={index} 
          className={cn(
            "transition-all duration-200",
            showPulse && "animate-pulse"
          )}
        >
          <CardHeader className="pb-3 px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Title skeleton */}
                <Skeleton className="h-6 w-3/4 mb-2" />
                
                {/* Badges skeleton */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge variant="outline" className="opacity-50">
                    <Skeleton className="h-3 w-16" />
                  </Badge>
                  <Badge variant="outline" className="opacity-50">
                    <Skeleton className="h-3 w-12" />
                  </Badge>
                  <Badge variant="outline" className="opacity-50">
                    <Skeleton className="h-3 w-20" />
                  </Badge>
                </div>
              </div>
              
              {/* Score skeleton */}
              <div className="text-right">
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0 space-y-3 md:space-y-4 px-4 md:px-6">
            {/* Description skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>

            {/* Market metrics skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="space-y-1 text-center">
                  <Skeleton className="h-4 w-4 mx-auto" />
                  <Skeleton className="h-3 w-16 mx-auto" />
                  <Skeleton className="h-4 w-12 mx-auto" />
                </div>
              ))}
            </div>

            {/* Reddit analysis skeleton */}
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>

            {/* Action buttons skeleton */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');