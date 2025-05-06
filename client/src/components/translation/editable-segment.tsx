import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Languages, CheckCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { type TranslationUnit } from "@/types";
import { Textarea } from "@/components/ui/textarea";

interface EditableSegmentProps {
  segment: TranslationUnit;
  index: number;
  isSource: boolean;
  onSelect: () => void;
  onUpdate?: (target: string, status: string) => Promise<any>;
  onTranslateWithGPT?: () => void;
  isSelected: boolean;
}

export function EditableSegment({
  segment,
  index,
  isSource,
  onSelect,
  onUpdate,
  onTranslateWithGPT,
  isSelected
}: EditableSegmentProps) {
  const { source, target, status } = segment;
  const [editedTarget, setEditedTarget] = useState(target || "");
  const [isEditing, setIsEditing] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
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
  
  // Update local state when segment changes
  useEffect(() => {
    setEditedTarget(target || "");
    setUnsavedChanges(false);
  }, [target]);
  
  // Auto-focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);
  
  // For source panel - non-editable
  if (isSource) {
    return (
      <div 
        className={cn(
          "group mb-4 pb-3 border-b border-border cursor-pointer rounded-md p-2 transition-colors flex flex-col min-h-[120px] h-full",
          isSelected ? "bg-accent" : "hover:bg-accent/50"
        )}
        onClick={onSelect}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-muted-foreground">Segment {index}</div>
        </div>
        <div className="font-mono text-sm leading-relaxed flex-1">
          {source}
        </div>
      </div>
    );
  }
  
  // For target panel - editable
  const handleTargetChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedTarget(e.target.value);
    setUnsavedChanges(true);
  };
  
  const handleSave = async () => {
    if (onUpdate && unsavedChanges) {
      await onUpdate(editedTarget, "MT");
      setUnsavedChanges(false);
    }
  };
  
  const handleApprove = async () => {
    if (onUpdate) {
      await onUpdate(editedTarget, "Reviewed");
      setUnsavedChanges(false);
    }
  };
  
  const handleCancel = () => {
    setEditedTarget(target || "");
    setUnsavedChanges(false);
  };
  
  return (
    <div 
      className={cn(
        "group mb-4 pb-3 border-b border-border flex flex-col min-h-[120px] h-full",
        isSelected && "bg-accent/40 rounded-md"
      )}
      onClick={onSelect}
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
        </div>
      </div>
      
      {target || isEditing ? (
        <div className="flex-1 flex flex-col">
          <Textarea
            ref={textareaRef}
            className="w-full flex-1 min-h-[80px] font-mono text-sm leading-relaxed bg-accent/50 rounded-md resize-none"
            placeholder="Enter translation here..."
            value={editedTarget}
            onChange={handleTargetChange}
            onFocus={() => setIsEditing(true)}
            onBlur={() => {
              // Don't leave editing mode on blur when there are unsaved changes
              if (!unsavedChanges) {
                setIsEditing(false);
              }
            }}
          />
          
          {(isEditing || unsavedChanges) && (
            <div className="flex justify-end mt-2 space-x-2">
              {unsavedChanges && (
                <Button 
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancel();
                  }}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              )}
              <Button 
                variant="default"
                size="sm"
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                }}
                disabled={!unsavedChanges}
              >
                Save
              </Button>
              <Button 
                variant="secondary"
                size="sm"
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleApprove();
                }}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Approve
              </Button>
            </div>
          )}
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