'use client';

/**
 * Loading skeleton component
 */

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-muted',
        className
      )}
    />
  );
}

export function SkeletonText() {
  return <Skeleton className="h-4 w-full" />;
}

export function SkeletonLine() {
  return <Skeleton className="h-2 w-3/4" />;
}

export function SkeletonCard() {
  return (
    <Skeleton className="h-48 w-full rounded-lg" />
  );
}
