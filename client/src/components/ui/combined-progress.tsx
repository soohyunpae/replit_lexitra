
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
  statusCounts,
  totalSegments = 0,
  height = "h-2",
  showPercentage = false,
  ...props
}: CombinedProgressProps) {
  const total = totalSegments || 0;
  const reviewed = (statusCounts?.["Reviewed"] || 0) / total * 100;
  const match100 = (statusCounts?.["100%"] || 0) / total * 100;
  const fuzzy = (statusCounts?.["Fuzzy"] || 0) / total * 100;
  const mt = (statusCounts?.["MT"] || 0) / total * 100;
  const edited = (statusCounts?.["Edited"] || 0) / total * 100;

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
        }}
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
