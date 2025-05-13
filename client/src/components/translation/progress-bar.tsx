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
  statusCounts,
  segments
}: ProgressBarProps) {
  // Calculate percentage for each status type
  const totalSegments = segments.length || 1;
  const reviewedPercent = ((statusCounts["Reviewed"] || 0) / totalSegments) * 100;
  const match100Percent = ((statusCounts["100%"] || 0) / totalSegments) * 100;
  const fuzzyPercent = ((statusCounts["Fuzzy"] || 0) / totalSegments) * 100;
  const mtPercent = ((statusCounts["MT"] || 0) / totalSegments) * 100;
  const editedPercent = ((statusCounts["Edited"] || 0) / totalSegments) * 100;
  const rejectedPercent = ((statusCounts["Rejected"] || 0) / totalSegments) * 100;
  
  // Set CSS variables to control segment widths
  const progressStyle = {
    "--reviewed-percent": `${reviewedPercent}%`,
    "--match-100-percent": `${match100Percent}%`,
    "--fuzzy-percent": `${fuzzyPercent}%`,
    "--mt-percent": `${mtPercent}%`,
    "--edited-percent": `${editedPercent}%`,
    "--rejected-percent": `${rejectedPercent}%`,
  } as React.CSSProperties;
  
  return (
    <div className="bg-card border-b border-border py-2 px-4">
      <div className="flex justify-between items-center">
        <div className="flex flex-col space-y-1 w-full max-w-md">
          <div className="flex justify-between text-xs mb-1">
            <span>Progress</span>
            <span className="font-medium">{percentage}% ({completed}/{total})</span>
          </div>
          <Progress value={percentage} className="h-2" style={progressStyle} />
        </div>
        
        {/* Control slots will be added by parent component */}
      </div>
    </div>
  );
}