import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Check, X, Languages } from "lucide-react";
import { TranslationUnit } from "@/types";

interface EditableSegmentProps {
  segment: TranslationUnit;
  index: number;
  isSource: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate?: (target: string, status?: string) => void;
  onTranslateWithGPT?: () => void;
}

export function EditableSegment({
  segment,
  index,
  isSource,
  isSelected,
  onSelect,
  onUpdate,
  onTranslateWithGPT
}: EditableSegmentProps) {
  // Source is not editable, target is always editable
  const [isEditing, setIsEditing] = useState(!isSource);
  const [value, setValue] = useState(isSource ? segment.source : segment.target || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);
  
  // Handle edit completion and set as Reviewed
  const handleSave = () => {
    if (!isSource && onUpdate) {
      onUpdate(value, "Reviewed"); // Mark as Reviewed when saving
    }
    setIsEditing(false);
  };
  
  // Handle edit cancellation
  const handleCancel = () => {
    setValue(isSource ? segment.source : segment.target || "");
    setIsEditing(false);
  };
  
  // Auto-resize textarea as content grows
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    
    // Resize textarea to fit content
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };
  
  // Update textarea height when segment target changes or on mount
  useEffect(() => {
    if (!isSource && textareaRef.current) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        textareaRef.current!.style.height = 'auto';
        textareaRef.current!.style.height = `${textareaRef.current!.scrollHeight}px`;
      }, 0);
    }
  }, [segment.target, isSource]);
  
  // Get status badge color based on status
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "MT":
        return "bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "Fuzzy":
        return "bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "100%":
        return "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Reviewed":
        return "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };
  
  return (
    <div
      className={`rounded-md p-3 mb-3 h-full w-full flex flex-col ${segment.status === "Reviewed" ? "bg-blue-50 dark:bg-blue-950/30" : isSelected ? "bg-accent/90" : "bg-card"} transition-colors ${!isSource && !segment.target ? "border border-dashed border-yellow-400" : ""}`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center">
          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded-md mr-2">{index}</span>
          {!isSource && (
            <div className="flex items-center">
              <span className={`text-xs px-1.5 py-0.5 rounded-md ${getStatusColor(segment.status)}`}>
                {segment.status}
              </span>
            </div>
          )}
        </div>
        
        {!isSource && (
          <div className="flex space-x-1">
            {isEditing && (
              <>
                <Button variant="ghost" size="sm" onClick={handleSave} className="h-7 w-7 p-0">
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCancel} className="h-7 w-7 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
            {!isEditing && onTranslateWithGPT && !segment.target && (
              <Button variant="ghost" size="sm" onClick={onTranslateWithGPT} className="h-7 w-7 p-0">
                <Languages className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
      
      {isEditing && !isSource ? (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextareaChange}
          className="min-h-[60px] font-mono resize-none focus-visible:ring-offset-0 focus-visible:ring-1"
          placeholder="Enter translation..."
        />
      ) : (
        <div className="font-mono text-sm whitespace-pre-wrap break-words min-h-[60px] h-full w-full">
          {value || (
            <span className="text-muted-foreground italic">
              {isSource ? "No source text" : "No translation yet"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}