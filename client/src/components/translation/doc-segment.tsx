import React, { useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TranslationUnit } from '@/types';
import { cn } from '@/lib/utils';

interface DocSegmentProps {
  segment: TranslationUnit;
  isSource: boolean;
  isEditing: boolean;
  editedValue?: string;
  onEditValueChange?: (value: string) => void;
  onSelectForEditing?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  className?: string;
  isDocumentMode?: boolean; // 문서 모드 여부
}

export function DocSegment({
  segment,
  isSource,
  isEditing,
  editedValue = '',
  onEditValueChange,
  onSelectForEditing,
  onSave,
  onCancel,
  className,
  isDocumentMode = false, // 기본값은 false
}: DocSegmentProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-focus textarea when editing begins
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      
      // Place cursor at the end of the text
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
      
      // Make textarea height match content
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);
  
  // Get status badge color based on status
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Reviewed':
        return 'bg-green-500/20 text-green-700 dark:bg-green-500/30 dark:text-green-300';
      case 'Rejected':
        return 'bg-red-500/20 text-red-700 dark:bg-red-500/30 dark:text-red-300';
      case 'Draft':
      default:
        return 'bg-blue-500/20 text-blue-700 dark:bg-blue-500/30 dark:text-blue-300';
    }
  };
  
  // Get origin badge color based on origin
  const getOriginColor = (origin: string): string => {
    switch (origin) {
      case 'HT':
        return 'bg-purple-500/20 text-purple-700 dark:bg-purple-500/30 dark:text-purple-300';
      case '100%':
        return 'bg-green-500/20 text-green-700 dark:bg-green-500/30 dark:text-green-300';
      case 'Fuzzy':
        return 'bg-yellow-500/20 text-yellow-700 dark:bg-yellow-500/30 dark:text-yellow-300';
      case 'MT':
      default:
        return 'bg-blue-500/20 text-blue-700 dark:bg-blue-500/30 dark:text-blue-300';
    }
  };
  
  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Save on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && onSave) {
      e.preventDefault();
      onSave();
    }
    
    // Cancel on Escape
    if (e.key === 'Escape' && onCancel) {
      e.preventDefault();
      onCancel();
    }
  };
  
  // 문서 모드일 때 다른 스타일 적용
  if (isDocumentMode) {
    // 소스 패널 문서 모드
    if (isSource) {
      return (
        <div 
          id={`source-${segment.id}`}
          className={cn(
            "py-1 px-4 relative group font-serif",
            isEditing && "bg-muted/20", 
            className
          )}
        >
          <p className="text-base whitespace-pre-wrap leading-relaxed">{segment.source}</p>
        </div>
      );
    }
    
    // 타겟 패널 문서 모드
    return (
      <div 
        className={cn(
          "py-1 px-4 relative group transition-colors font-serif",
          isEditing ? "bg-accent/30" : "hover:bg-accent/5",
          className
        )}
        data-status={segment.status}
        data-origin={segment.origin}
        data-has-comment={segment.comment ? "true" : "false"}
      >
        {/* 편집 모드 */}
        {isEditing ? (
          <div className="relative my-1">
            <Textarea
              ref={textareaRef}
              value={editedValue}
              onChange={(e) => onEditValueChange?.(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[80px] resize-none border-accent font-serif text-base"
              placeholder="Enter translation..."
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
              <button 
                onClick={onCancel}
                className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                title="Cancel (Esc)"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={onSave}
                className="p-1 rounded-full bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800"
                title="Save (Ctrl+Enter)"
              >
                <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </button>
            </div>
          </div>
        ) : (
          // 보기 모드 (클릭 가능)
          <p 
            onClick={onSelectForEditing}
            className="text-base whitespace-pre-wrap leading-relaxed cursor-text"
          >
            {segment.target || <span className="text-muted-foreground italic">Click to add translation</span>}
          </p>
        )}
      </div>
    );
  }
  
  // 기존 세그먼트 에디터 모드 (문서 모드가 아닐 때)
  // Render source segment (read-only)
  if (isSource) {
    return (
      <div 
        id={`source-${segment.id}`}
        className={cn(
          "p-3 border-b border-r relative group",
          isEditing && "bg-muted/50 shadow-sm",
          className
        )}
      >
        <div className="text-sm md:text-base whitespace-pre-wrap">{segment.source}</div>
      </div>
    );
  }
  
  // Render target segment (editable)
  return (
    <div 
      className={cn(
        "p-3 border-b relative group transition-colors",
        isEditing ? "bg-accent/30 shadow-sm" : "hover:bg-accent/10",
        className
      )}
    >
      {/* Segment status badge */}
      <div className="absolute top-1 right-2 flex items-center gap-1 text-xs opacity-70 group-hover:opacity-100">
        {segment.comment && (
          <MessageCircle className="h-3.5 w-3.5 text-blue-500" />
        )}
        {segment.status && (
          <Badge variant="outline" className={cn("text-[10px] py-0 h-4", getStatusColor(segment.status))}>
            {segment.status}
          </Badge>
        )}
        {segment.origin && (
          <Badge variant="outline" className={cn("text-[10px] py-0 h-4", getOriginColor(segment.origin))}>
            {segment.origin}
          </Badge>
        )}
      </div>
      
      {/* Editing mode */}
      {isEditing ? (
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={editedValue}
            onChange={(e) => onEditValueChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[80px] resize-none border-accent"
            placeholder="Enter translation..."
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
            <button 
              onClick={onCancel}
              className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
              title="Cancel (Esc)"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={onSave}
              className="p-1 rounded-full bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800"
              title="Save (Ctrl+Enter)"
            >
              <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </button>
          </div>
        </div>
      ) : (
        // View mode (clickable)
        <div 
          onClick={onSelectForEditing}
          className="text-sm md:text-base whitespace-pre-wrap min-h-[40px] cursor-text"
        >
          {segment.target || <span className="text-muted-foreground italic">Click to add translation</span>}
        </div>
      )}
    </div>
  );
}