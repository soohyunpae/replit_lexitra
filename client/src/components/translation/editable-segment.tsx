import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Check, X, Languages } from "lucide-react";
import { TranslationUnit, StatusType, OriginType } from "@/types";

interface EditableSegmentProps {
  segment: TranslationUnit;
  index: number;
  isSource: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate?: (target: string, status?: string, origin?: string) => void;
  onTranslateWithGPT?: () => void;
  isChecked?: boolean;
  onCheckChange?: (checked: boolean) => void;
}

export function EditableSegment({
  segment,
  index,
  isSource,
  isSelected,
  onSelect,
  onUpdate,
  onTranslateWithGPT,
  isChecked,
  onCheckChange
}: EditableSegmentProps) {
  // Source is not editable, target is always editable
  const [isEditing, setIsEditing] = useState(!isSource);
  const [value, setValue] = useState(isSource ? segment.source : segment.target || "");
  const [isModified, setIsModified] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);
  
  // Handle edit completion and set as Reviewed with HT (Human Translation) origin
  const handleSave = () => {
    if (!isSource && onUpdate) {
      // Mark as Reviewed and set origin to HT when saving after human edit
      onUpdate(value, "Reviewed", isModified ? "HT" : segment.origin);
    }
    setIsEditing(false);
  };
  
  // Handle edit cancellation
  const handleCancel = () => {
    setValue(isSource ? segment.source : segment.target || "");
    setIsEditing(false);
  };
  
  // Auto-resize textarea as content grows and track modifications
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    // Check if translation has been modified from its original state
    if (segment.target && newValue !== segment.target) {
      setIsModified(true);
    } else {
      setIsModified(false);
    }
    
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
      case "Draft":
        return "bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "Reviewed":
        return "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "Rejected":
        return "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };
  
  // Get origin badge color based on origin
  const getOriginColor = (origin: string): string => {
    switch (origin) {
      case "MT":
        return "bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "Fuzzy":
        return "bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "100%":
        return "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "HT":
        return "bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
      default:
        return "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };
  
  // Handle checkbox click without triggering segment selection
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCheckChange) {
      onCheckChange(!isChecked);
    }
  };

  return (
    <div
      className={`rounded-md p-3 mb-3 h-full w-full flex flex-col ${segment.status === "Reviewed" ? "bg-blue-50 dark:bg-blue-950/30" : isSelected ? "bg-accent/90" : "bg-card"} transition-colors ${!isSource && !segment.target ? "border border-dashed border-yellow-400" : ""}`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center">
          {!isSource && onCheckChange && (
            <div className="mr-2" onClick={handleCheckboxClick}>
              <Checkbox 
                checked={isChecked} 
                onCheckedChange={onCheckChange}
                className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              />
            </div>
          )}
          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded-md mr-2">{index}</span>
          {!isSource && (
            <div className="flex items-center space-x-1.5">
              <span className={`text-xs px-1.5 py-0.5 rounded-md ${getStatusColor(segment.status)}`}>
                {segment.status}
              </span>
              {segment.origin && (
                <span className={`text-xs px-1.5 py-0.5 rounded-md ${getOriginColor(segment.origin)}`}>
                  {segment.origin}
                </span>
              )}
              {isModified && (
                <span className="text-xs px-1.5 py-0.5 rounded-md bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  Modified
                </span>
              )}
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
          className="min-h-[60px] font-mono resize-none focus-visible:ring-offset-0 focus-visible:ring-1 overflow-hidden no-scrollbar"
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