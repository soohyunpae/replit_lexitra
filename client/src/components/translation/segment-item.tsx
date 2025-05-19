import React from "react";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { type TranslationUnit } from "@/types";
import { useTranslation } from "react-i18next";

interface SegmentItemProps {
  segment: TranslationUnit;
  index: number;
  isSource: boolean;
  onClick: () => void;
  onTranslateWithGPT?: () => void;
}

export function SegmentItem({
  segment,
  index,
  isSource,
  onClick,
  onTranslateWithGPT
}: SegmentItemProps) {
  const { t } = useTranslation();
  const { source, target, status } = segment;

  // Helper function to get the badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'MT':
        return 'bg-yellow-200/20 text-yellow-700 dark:bg-yellow-200/10 dark:text-yellow-400';
      case 'Fuzzy':
        return 'bg-orange-200/20 text-orange-700 dark:bg-orange-200/10 dark:text-orange-400';
      case '100%':
        return 'bg-blue-200/20 text-blue-700 dark:bg-blue-200/10 dark:text-blue-400';
      case 'Reviewed':
        return 'bg-green-200/20 text-green-700 dark:bg-green-200/10 dark:text-green-400';
      default:
        return 'bg-gray-200/20 text-gray-700 dark:bg-gray-200/10 dark:text-gray-400';
    }
  };

  // Fixed height for segments to match source and target
  // This ensures both segment versions have the same height
  const minSegmentHeight = 'min-h-[120px] h-full';

  // For source panel
  if (isSource) {
    return (
      <div 
        className={`group mb-4 pb-3 border-b border-border cursor-pointer hover:bg-accent/50 rounded-md p-2 transition-colors flex flex-col ${minSegmentHeight}`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-muted-foreground">Segment {index}</div>
          {/* 원문에는 상태 표시를 하지 않음 */}
        </div>
        <div className="font-mono text-sm leading-relaxed flex-1">
          {source}
        </div>
      </div>
    );
  }

  // For target panel
  return (
    <div 
      className={`group mb-4 pb-3 border-b border-border flex flex-col ${minSegmentHeight}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-muted-foreground">Target {index}</div>
        <div className="flex items-center space-x-1">
          {status && (
            <div className={cn(
              "text-xs px-1.5 py-0.5 rounded",
              getStatusBadgeClass(status)
            )}>
              {status}
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
              <path d="M1.90321 7.29677C1.90321 10.341 4.11041 12.4147 6.58893 12.8684C6.87255 12.9334 7.06266 13.1699 7.06266 13.4619C7.06266 13.7992 6.76783 14.0571 6.43802 13.9949C3.49912 13.4217 0.5 10.7634 0.5 7.29677C0.5 3.87505 3.09264 1.15462 6.5 1.15462C9.8626 1.15462 12.5 3.87505 12.5 7.29677C12.5 8.15475 12.3142 9.01517 11.9504 9.80094C11.8651 9.97004 11.7188 10.0877 11.5473 10.1235C11.2448 10.1867 10.9574 9.96996 10.9574 9.67459C10.9574 9.32555 11.2577 9.10837 11.3747 8.87803C11.6436 8.27639 11.7796 7.57219 11.7796 6.86857C11.7796 4.25804 9.71195 2.03287 7.22062 2.03287C4.68129 2.03287 2.2016 4.25804 2.2016 6.86857C2.2016 9.25922 4.12312 11.0112 6.31214 11.3683C6.86054 11.4587 7.21721 11.0123 7.15085 10.4559C7.09811 10.0123 6.71352 9.67221 6.26823 9.62047C4.83957 9.42705 3.77863 8.37044 3.77863 6.86857C3.77863 5.09992 5.34026 3.62282 7.22062 3.62282C9.05402 3.62282 10.3546 5.09992 10.3546 6.86857C10.3546 7.31127 10.2154 7.75949 9.94051 8.15475C9.8989 8.22382 9.72492 8.43253 9.72492 8.68887C9.72492 9.51708 10.8787 9.57458 11.3491 8.90344C11.6338 8.4899 11.7796 7.95864 11.7796 7.42254C11.7796 4.56512 9.66809 2.54787 7.22062 2.54787C4.77315 2.54787 2.71759 4.56512 2.71759 7.42254C2.71759 10.0178 4.9676 12.2306 7.56449 12.2306C7.90939 12.2306 8.1868 12.5126 8.1868 12.8581C8.1868 13.2036 7.90939 13.4856 7.56449 13.4856C4.31945 13.4856 1.90321 10.7151 1.90321 7.29677Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
            </svg>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
              <path d="M12.5 3L2.5 3.00002C1.67157 3.00002 1 3.6716 1 4.50002V9.50003C1 10.3285 1.67157 11 2.5 11H7.50003C7.63264 11 7.75982 11.0527 7.85358 11.1465L10 13.2929V11.5C10 11.2239 10.2239 11 10.5 11H12.5C13.3284 11 14 10.3285 14 9.50003V4.5C14 3.67157 13.3284 3 12.5 3ZM2.49999 2.00002L12.5 2C13.8807 2 15 3.11929 15 4.5V9.50003C15 10.8807 13.8807 12 12.5 12H11V14.5C11 14.7022 10.8782 14.8845 10.6913 14.9619C10.5045 15.0393 10.2894 14.9965 10.1464 14.8536L7.29292 12H2.5C1.11929 12 0 10.8807 0 9.50003V4.50002C0 3.11931 1.11928 2.00002 2.49999 2.00002Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
            </svg>
          </Button>
        </div>
      </div>

      {target ? (
        <div 
          className="font-mono text-sm leading-relaxed bg-accent rounded-md p-3 cursor-pointer flex-1 flex items-start"
          onClick={onClick}
        >
          {target}
        </div>
      ) : (
        <div className="font-mono text-sm leading-relaxed bg-accent/50 border border-dashed border-accent rounded-md p-3 flex items-center justify-center flex-1">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onTranslateWithGPT?.();
            }}
            className="flex items-center"
          >
            <Languages className="h-4 w-4 mr-1" />
            Translate with GPT
          </Button>
        </div>
      )}
    </div>
  );
}