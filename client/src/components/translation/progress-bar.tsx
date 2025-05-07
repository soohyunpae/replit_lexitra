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
  total,
  statusCounts
}: ProgressBarProps) {
  // Get status counts with default values for all possible statuses
  const mtCount = statusCounts["MT"] || 0;
  const fuzzyCount = statusCounts["Fuzzy"] || 0;
  const fullMatchCount = statusCounts["100%"] || 0;
  const reviewedCount = statusCounts["Reviewed"] || 0;
  
  return (
    <div className="bg-card border-b border-border py-2 px-4">
      <div className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-4 justify-between items-center">
        <div className="w-full sm:w-1/2">
          <Progress value={percentage} className="h-2" />
        </div>
        
        <div className="flex space-x-2 text-xs items-center self-end sm:self-auto">
          <div className="flex items-center">
            <span className="font-medium">{completed}</span>
            <span className="text-muted-foreground">&nbsp;/&nbsp;{total}</span>
          </div>
          
          <div className="w-px h-4 bg-border"></div>
          
          <div className="flex space-x-2">
            <div className="px-1.5 py-0.5 rounded-sm bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Reviewed: {reviewedCount}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}