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
  // Reviewed 퍼센트 계산하기 - 두 가지 방식 지원
  let displayPercentage = 0;
  
  if (statusCounts && totalSegments && totalSegments > 0) {
    // 1. statusCounts와 totalSegments가 있는 경우: 상세 통계 기반 계산
    const reviewedCount = statusCounts.Reviewed || 0;
    displayPercentage = Math.round((reviewedCount / totalSegments) * 100);
  } else {
    // 2. props로 전달된 reviewedPercentage 사용
    displayPercentage = !isNaN(reviewedPercentage) ? reviewedPercentage : 0;
  }
  
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
            <span>Reviewed: {displayPercentage}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
