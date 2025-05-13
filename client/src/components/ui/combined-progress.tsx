import React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

interface CombinedProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
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
  // 기존 방식 (간소화 - Reviewed만 표시)
  if (!statusCounts || !totalSegments) {
    return (
      <div className="w-full space-y-1.5">
        <ProgressPrimitive.Root
          className={cn(
            "relative overflow-hidden rounded-full bg-secondary",
            height,
            className
          )}
          {...props}
        >
          {/* Reviewed part (green) */}
          <div className="h-full w-full flex overflow-hidden">
            {/* Reviewed segments (green) */}
            <div 
              className="h-full bg-green-200" 
              style={{ width: `${reviewedPercentage}%` }} 
            />
            {/* 나머지는 표시하지 않음 (기본 배경색으로 표시) */}
          </div>
        </ProgressPrimitive.Root>
        
        {showPercentage && (
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground my-1">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-200"></div>
              <span>Reviewed: {reviewedPercentage}%</span>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // 새로운 방식 (Reviewed와 나머지로만 구분)
  // Reviewed 수 계산
  const reviewedCount = statusCounts.Reviewed || 0;
  const reviewedPercentageNew = Math.round((reviewedCount / totalSegments) * 100);

  return (
    <div className="w-full space-y-1.5">
      <ProgressPrimitive.Root
        className={cn(
          "relative overflow-hidden rounded-full bg-secondary",
          height,
          className
        )}
        {...props}
      >
        <div className="h-full w-full flex overflow-hidden">
          {/* Reviewed segments (green) */}
          <div 
            className="h-full bg-green-200" 
            style={{ width: `${reviewedPercentageNew}%` }} 
          />
          {/* 나머지는 표시하지 않음 (기본 배경색으로 표시) */}
        </div>
      </ProgressPrimitive.Root>
      
      {showPercentage && (
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground my-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-200"></div>
            <span>Reviewed: {reviewedPercentageNew}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
