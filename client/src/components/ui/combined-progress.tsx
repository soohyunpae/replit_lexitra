
import React from 'react';
import { Progress } from './progress';

interface CombinedProgressProps {
  reviewedPercentage: number;
  statusCounts: {
    "Reviewed": number;
    "100%": number;
    "Fuzzy": number;
    "MT": number;
    "Edited": number;
    "Rejected": number;
  };
  totalSegments: number;
  height?: string;
  showPercentage?: boolean;
}

export function CombinedProgress({
  reviewedPercentage,
  statusCounts,
  totalSegments,
  height = "h-2",
  showPercentage = false
}: CombinedProgressProps) {
  // Debug logging
  console.log("CombinedProgress received props:", {
    reviewedPercentage,
    statusCounts,
    totalSegments
  });

  // Calculate percentages for each status
  const total = Math.max(totalSegments, 1); // Avoid division by zero
  const percentages = {
    reviewed: (statusCounts?.["Reviewed"] || 0) / total * 100,
    perfect: (statusCounts?.["100%"] || 0) / total * 100,
    fuzzy: (statusCounts?.["Fuzzy"] || 0) / total * 100,
    mt: (statusCounts?.["MT"] || 0) / total * 100,
    edited: (statusCounts?.["Edited"] || 0) / total * 100,
    rejected: (statusCounts?.["Rejected"] || 0) / total * 100
  };

  return (
    <div className="w-full">
      <div className="relative">
        <Progress
          value={100}
          className={`${height} bg-gray-100`}
          indicatorClassName="bg-gradient-to-r from-blue-500/20 via-blue-500/40 to-blue-500/60"
        />
        <div className="absolute inset-0">
          <Progress
            value={percentages.reviewed}
            className={`${height} bg-transparent`}
            indicatorClassName="bg-green-500"
          />
        </div>
      </div>
      {showPercentage && (
        <div className="text-xs text-muted-foreground mt-1">
          {Math.round(reviewedPercentage)}% Reviewed
        </div>
      )}
    </div>
  );
}
