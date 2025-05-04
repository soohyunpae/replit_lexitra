import React, { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { countWords } from "@/lib/utils";
import { type TranslationUnit } from "@/types";

interface ProgressBarProps {
  percentage: number;
  completed: number;
  total: number;
  statusCounts: Record<string, number>;
  segments?: TranslationUnit[];
}

export function ProgressBar({
  percentage,
  completed,
  total,
  statusCounts,
  segments = []
}: ProgressBarProps) {
  // 전체 단어 수 계산 (원문만 계산)
  const totalWords = useMemo(() => {
    if (segments.length === 0) return 0;
    
    return segments.reduce((total, segment) => {
      return total + countWords(segment.source);
    }, 0);
  }, [segments]);
  
  return (
    <div className="bg-card px-4 py-2 border-b border-border">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium">Translation Progress</h2>
        <div className="text-xs text-muted-foreground">{completed} of {total} segments completed</div>
      </div>
      
      <Progress value={percentage} className="h-2" />
      
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full status-indicator-mt mr-1.5"></div>
            <span>MT: {statusCounts["MT"] || 0}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full status-indicator-fuzzy mr-1.5"></div>
            <span>Fuzzy: {statusCounts["Fuzzy"] || 0}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full status-indicator-100 mr-1.5"></div>
            <span>100%: {statusCounts["100%"] || 0}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full status-indicator-reviewed mr-1.5"></div>
            <span>Reviewed: {statusCounts["Reviewed"] || 0}</span>
          </div>
        </div>
        <div>
          <span>Total words: {totalWords.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
