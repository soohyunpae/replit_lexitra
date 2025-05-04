import React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

interface CombinedProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  reviewedPercentage: number;
  translatedPercentage: number;
  height?: string;
  showPercentage?: boolean;
}

export function CombinedProgress({ 
  reviewedPercentage, 
  translatedPercentage, 
  className, 
  height = "h-3",
  showPercentage = false,
  ...props 
}: CombinedProgressProps) {
  return (
    <div className="w-full space-y-1.5">
      <ProgressPrimitive.Root
        className={cn(
          "relative overflow-hidden rounded-full bg-accent",
          height,
          className
        )}
        {...props}
      >
        {/* Reviewed part (green) */}
        <ProgressPrimitive.Indicator
          className="h-full w-full flex-1 bg-green-500 transition-all"
          style={{ transform: `translateX(-${100 - reviewedPercentage}%)` }}
        />
        
        {/* Translated but not reviewed part (yellow/amber) on top of reviewed */}
        <div 
          className="absolute top-0 left-0 h-full bg-amber-500 transition-all"
          style={{
            width: `${translatedPercentage}%`,
            clipPath: `inset(0 0 0 ${reviewedPercentage / translatedPercentage * 100}%)`
          }}
        />
      </ProgressPrimitive.Root>
      
      {showPercentage && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Translated: {translatedPercentage}%</span>
          <span>Reviewed: {reviewedPercentage}%</span>
        </div>
      )}
    </div>
  );
}
