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
  // 기존 방식 (단순히 리뷰됨, 번역됨만 표시)
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
              className="h-full bg-green-300" 
              style={{ width: `${reviewedPercentage}%` }} 
            />
            
            {/* Translated but not reviewed part (yellow) */}
            <div 
              className="h-full bg-yellow-300" 
              style={{ 
                width: `${Math.max(0, translatedPercentage - reviewedPercentage)}%` 
              }} 
            />
          </div>
        </ProgressPrimitive.Root>
        
        {showPercentage && (
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground my-1">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-300"></div>
              <span>Rev: {reviewedPercentage}%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-300"></div>
              <span>Trans: {translatedPercentage}%</span>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // 새로운 방식 (6가지 상태 모두 표시)
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
            className="h-full bg-green-300" 
            style={{ width: `${(statusCounts.Reviewed || 0) / totalSegments * 100}%` }} 
          />
          {/* 100% segments (blue) */}
          <div 
            className="h-full bg-blue-300" 
            style={{ width: `${(statusCounts["100%"] || 0) / totalSegments * 100}%` }} 
          />
          {/* Fuzzy segments (yellow) */}
          <div 
            className="h-full bg-yellow-300" 
            style={{ width: `${(statusCounts.Fuzzy || 0) / totalSegments * 100}%` }} 
          />
          {/* MT segments (gray) */}
          <div 
            className="h-full bg-gray-300" 
            style={{ width: `${(statusCounts.MT || 0) / totalSegments * 100}%` }} 
          />
          {/* Edited segments (purple) */}
          <div 
            className="h-full bg-purple-300" 
            style={{ width: `${(statusCounts.Edited || 0) / totalSegments * 100}%` }} 
          />
          {/* Rejected segments (red) */}
          <div 
            className="h-full bg-red-300" 
            style={{ width: `${(statusCounts.Rejected || 0) / totalSegments * 100}%` }} 
          />
        </div>
      </ProgressPrimitive.Root>
      
      {showPercentage && (
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground my-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-300"></div>
            <span>Rev: {statusCounts.Reviewed || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-300"></div>
            <span>100%: {statusCounts["100%"] || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-300"></div>
            <span>Fuzzy: {statusCounts.Fuzzy || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            <span>MT: {statusCounts.MT || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-purple-300"></div>
            <span>Edit: {statusCounts.Edited || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-300"></div>
            <span>Rej: {statusCounts.Rejected || 0}</span>
          </div>
        </div>
      )}
    </div>
  );
}
