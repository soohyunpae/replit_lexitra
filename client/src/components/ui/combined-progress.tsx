
import React from "react";
import { Progress } from "@/components/ui/progress";

interface CombinedProgressProps extends React.ComponentPropsWithoutRef<typeof Progress> {
  reviewedPercentage: number;
  statusCounts?: Record<string, number>;
  totalSegments?: number;
  height?: string;
  showPercentage?: boolean;
}

export function CombinedProgress({
  reviewedPercentage,
  statusCounts = {},
  totalSegments = 0,
  height = "h-2",
  showPercentage = false,
  ...props
}: CombinedProgressProps) {
  // Prevent division by zero
  const total = Math.max(totalSegments, 1);
  
  // Calculate percentages safely
  const getPercentage = (status: string) => {
    return ((statusCounts[status] || 0) / total) * 100;
  };

  const reviewed = getPercentage("Reviewed");
  const match100 = getPercentage("100%");
  const fuzzy = getPercentage("Fuzzy");
  const mt = getPercentage("MT");
  const edited = getPercentage("Edited");
  const rejected = getPercentage("Rejected");

  return (
    <div className="space-y-1.5 w-full">
      <Progress
        value={100}
        className={`${height} relative`}
        style={{
          "--reviewed-percent": `${reviewed}%`,
          "--match-100-percent": `${match100}%`,
          "--fuzzy-percent": `${fuzzy}%`,
          "--mt-percent": `${mt}%`,
          "--edited-percent": `${edited}%`,
          "--rejected-percent": `${rejected}%`,
        } as React.CSSProperties}
        {...props}
      />
      {showPercentage && (
        <div className="text-sm">
          Reviewed: {Math.round(reviewedPercentage)}%
        </div>
      )}
    </div>
  );
}
