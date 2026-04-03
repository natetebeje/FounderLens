import { Skeleton } from "@/components/ui/skeleton";

export const BuildLabSkeleton = () => (
  <div className="space-y-12">
    {/* Hero Section Skeleton */}
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <Skeleton className="h-12 w-64 mx-auto" />
        <Skeleton className="h-6 w-96 mx-auto" />
      </div>
      <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-8 w-12 mx-auto" />
          <Skeleton className="h-4 w-20 mx-auto" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-12 mx-auto" />
          <Skeleton className="h-4 w-20 mx-auto" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-12 mx-auto" />
          <Skeleton className="h-4 w-20 mx-auto" />
        </div>
      </div>
      <Skeleton className="h-12 w-40 mx-auto" />
    </div>
    
    {/* Grid Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass-card p-6 space-y-4">
          <Skeleton className="aspect-video w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex justify-between items-center pt-2">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const BuildTrackSkeleton = () => (
  <div className="max-w-4xl mx-auto space-y-8">
    {/* Back Button */}
    <Skeleton className="h-10 w-32" />
    
    {/* Header */}
    <div className="space-y-6">
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-10 w-80" />
      <Skeleton className="h-6 w-96" />
      <div className="flex justify-between items-center">
        <div className="flex gap-6">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-12 w-40" />
      </div>
    </div>
    
    {/* Lessons */}
    <div className="space-y-4">
      <Skeleton className="h-8 w-20" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-6" />
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-10 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const BuildLessonSkeleton = () => (
  <div className="max-w-4xl mx-auto space-y-8">
    {/* Back Button */}
    <Skeleton className="h-10 w-40" />
    
    {/* Header */}
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-10 w-80" />
      <Skeleton className="h-6 w-96" />
    </div>
    
    {/* Video */}
    <div className="glass-card p-0 overflow-hidden">
      <Skeleton className="aspect-video w-full" />
    </div>
    
    {/* Content */}
    <div className="glass-card p-8 space-y-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
    
    {/* Navigation */}
    <div className="flex justify-between">
      <Skeleton className="h-12 w-24" />
      <Skeleton className="h-12 w-32" />
      <Skeleton className="h-12 w-20" />
    </div>
  </div>
);