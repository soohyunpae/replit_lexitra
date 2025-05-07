import React from "react";
import { Progress } from "@/components/ui/progress";
import { type TranslationUnit, type StatusType } from "@/types";

interface ProgressBarProps {
  percentage: number;
  completed: number;
  total: number;
  statusCounts: Record<string, number>;
  segments: TranslationUnit[];
}

export function ProgressBar({
  percentage,
  completed,
  total
}: ProgressBarProps) {
  return (
    <div className="bg-card border-b border-border py-2 px-4">
      <div className="flex justify-between items-center">
        <div className="flex flex-col space-y-1 w-full max-w-md">
          <div className="flex justify-between text-xs mb-1">
            <span>Progress</span>
            <span className="font-medium">{percentage}% ({completed}/{total})</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
        
        {/* Control slots will be added by parent component */}
      </div>
    </div>
  );
}