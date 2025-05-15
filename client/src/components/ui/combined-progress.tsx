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
  // Reviewed 수 계산
  const reviewedCount = statusCounts?.Reviewed || 0;
  const total = totalSegments || 1; // Avoid division by zero
  
  // Calculate percentages for each status
  const reviewedPercentageNew = Math.round(
    (reviewedCount / total) * 100,
  );
  const perfectPercentage = Math.round(
    ((statusCounts?.["100%"] || 0) / total) * 100
  );
  const fuzzyPercentage = Math.round(
    ((statusCounts?.Fuzzy || 0) / total) * 100
  );
  const mtPercentage = Math.round(
    ((statusCounts?.MT || 0) / total) * 100
  );
  const editedPercentage = Math.round(
    ((statusCounts?.Edited || 0) / total) * 100
  );
  const rejectedPercentage = Math.round(
    ((statusCounts?.Rejected || 0) / total) * 100
  );

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
            className="h-full bg-green-500"
            style={{ width: `${reviewedPercentageNew}%` }}
          />
          {/* 100% matches (blue) */}
          <div
            className="h-full bg-blue-500"
            style={{ width: `${perfectPercentage}%` }}
          />
          {/* Fuzzy matches (yellow) */}
          <div
            className="h-full bg-yellow-500"
            style={{ width: `${fuzzyPercentage}%` }}
          />
          {/* MT (purple) */}
          <div
            className="h-full bg-purple-500"
            style={{ width: `${mtPercentage}%` }}
          />
          {/* Edited (orange) */}
          <div
            className="h-full bg-orange-500"
            style={{ width: `${editedPercentage}%` }}
          />
          {/* Rejected (red) */}
          <div
            className="h-full bg-red-500"
            style={{ width: `${rejectedPercentage}%` }}
          />
        </div>
      </ProgressPrimitive.Root>

      {showPercentage && (
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground my-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Reviewed: {reviewedPercentageNew}%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span>100%: {perfectPercentage}%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span>Fuzzy: {fuzzyPercentage}%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span>MT: {mtPercentage}%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            <span>Edited: {editedPercentage}%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span>Rejected: {rejectedPercentage}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
