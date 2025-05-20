import React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

interface CombinedProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  reviewedPercentage: number;
  translatedPercentage: number;
  height?: string;
  showPercentage?: boolean;
  statusCounts?: Record<string, number>;
  totalSegments?: number;
}

export function CombinedProgress({
  reviewedPercentage,
  translatedPercentage,
  className,
  height = "h-3",
  showPercentage = false,
  statusCounts,
  totalSegments,
  ...props
}: CombinedProgressProps) {
  const counts = statusCounts || {};
  const reviewedCount = counts.Reviewed || 0;
  const totalSegs = totalSegments || 1;
  
  // Always calculate the percentage based on the counts to ensure accuracy
  // This ensures we're using the most accurate data
  const calculatedPercentage = totalSegs > 0
    ? Math.round((reviewedCount / totalSegs) * 100)
    : 0;
    
  // Use the calculated percentage, but fall back to the prop if calculation isn't possible
  const displayPercentage = calculatedPercentage > 0
    ? calculatedPercentage
    : (typeof reviewedPercentage === 'number' ? Math.round(reviewedPercentage) : 0);

  // For debugging (can be removed after fixing)
  console.log('Progress calculation:', {
    reviewedCount,
    totalSegs,
    calculatedPercentage,
    propPercentage: reviewedPercentage,
    displayPercentage
  });

  return (
    <div className="w-full space-y-1.5">
      <ProgressPrimitive.Root
        className={cn(
          "relative overflow-hidden rounded-full bg-secondary",
          height,
          className,
        )}
        {...props}
      >
        <div className="h-full w-full flex overflow-hidden">
          {/* Reviewed segments (green) */}
          <div
            className="h-full bg-green-200"
            style={{ width: `${displayPercentage}%` }}
          />
          {/* 나머지는 표시하지 않음 (기본 배경색으로 표시) */}
        </div>
      </ProgressPrimitive.Root>

      {showPercentage && (
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground my-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-200"></div>
            <span>Reviewed: {reviewedCount} / {totalSegs} ({displayPercentage}%)</span>
          </div>
        </div>
      )}
    </div>
  );
}
