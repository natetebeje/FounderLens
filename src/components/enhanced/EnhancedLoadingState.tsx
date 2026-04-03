import React from 'react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface EnhancedLoadingStateProps {
  type?: 'spinner' | 'skeleton' | 'progressive' | 'contextual';
  variant?: 'dashboard' | 'list' | 'form' | 'chart' | 'page';
  progress?: number;
  message?: string;
  context?: string;
  showProgress?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LoadingMessages = {
  default: 'Loading...',
  dashboard: 'Loading dashboard data...',
  list: 'Fetching items...',
  form: 'Preparing form...',
  chart: 'Generating analytics...',
  page: 'Loading page content...',
  opportunities: 'Discovering market opportunities...',
  validation: 'Running validation analysis...',
  analytics: 'Computing analytics data...',
  profile: 'Loading profile information...'
};

const SkeletonVariants = {
  dashboard: () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-pulse">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader>
            <Skeleton className="h-6 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  ),

  list: () => (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  ),

  form: () => (
    <Card className="animate-pulse">
      <CardHeader>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <div className="flex gap-3 pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      </CardContent>
    </Card>
  ),

  chart: () => (
    <Card className="animate-pulse">
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-end h-48">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton 
                key={i} 
                className={`w-8 h-${Math.floor(Math.random() * 32) + 16}`} 
              />
            ))}
          </div>
          <div className="flex justify-between">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-8" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  ),

  page: () => (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-5/6" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
};

export const EnhancedLoadingState: React.FC<EnhancedLoadingStateProps> = ({
  type = 'spinner',
  variant = 'dashboard',
  progress,
  message,
  context,
  showProgress = false,
  className,
  size = 'md'
}) => {
  const loadingMessage = message || LoadingMessages[variant] || LoadingMessages.default;
  
  if (type === 'skeleton') {
    const SkeletonComponent = SkeletonVariants[variant];
    return (
      <div className={cn("w-full", className)}>
        {SkeletonComponent()}
      </div>
    );
  }

  if (type === 'progressive') {
    return (
      <div className={cn("flex flex-col items-center justify-center min-h-[300px] space-y-6", className)}>
        <LoadingSpinner size={size} />
        <div className="text-center space-y-3 max-w-md">
          <h3 className="text-lg font-medium text-foreground">
            {loadingMessage}
          </h3>
          {context && (
            <p className="text-sm text-muted-foreground">
              {context}
            </p>
          )}
          {showProgress && typeof progress === 'number' && (
            <div className="w-full space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {progress}% complete
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === 'contextual') {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 px-6">
          <LoadingSpinner size={size} className="mb-4" />
          <h3 className="text-lg font-medium text-center mb-2">
            {loadingMessage}
          </h3>
          {context && (
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {context}
            </p>
          )}
          {showProgress && typeof progress === 'number' && (
            <div className="w-full max-w-xs mt-4 space-y-2">
              <Progress value={progress} className="h-1" />
              <p className="text-xs text-muted-foreground text-center">
                {progress}% loaded
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default spinner type
  return (
    <div className={cn("flex items-center justify-center min-h-[200px]", className)}>
      <LoadingSpinner size={size} text={loadingMessage} />
    </div>
  );
};