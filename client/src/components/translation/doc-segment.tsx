import React, { useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, MessageCircle, FileEdit, CircuitBoard, CircleSlash, CircleCheck, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
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
  showStatusInEditor?: boolean; // 편집 중에만 상태 표시 (문서 모드에서)
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
  showStatusInEditor = false, // 기본값은 false
}: DocSegmentProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-focus textarea when editing begins
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      
      // Place cursor at the end of the text
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [isEditing]);
  
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
  
  // Document mode display
  if (isDocumentMode) {
    // Source panel in document mode
    if (isSource) {
      return (
        <span 
          className={cn(
            "font-serif text-base inline", 
            "selection:bg-blue-100 dark:selection:bg-blue-900",
            isEditing && "bg-muted/20", 
            className
          )}
          data-segment-id={segment.id}
          data-status={segment.status}
          data-origin={segment.origin}
        >
          {segment.source}
        </span>
      );
    }
    
    // Target panel in document mode
    if (isEditing) {
      return (
        <span className={cn("relative font-serif", className)}>
          <div className="relative my-1">
            {/* 상태 뱃지를 텍스트 영역 위에 배치 */}
            {showStatusInEditor && (
              <div className="absolute top-0 left-0 -mt-6 flex items-center gap-1 text-xs bg-background/90 backdrop-blur-sm rounded-md p-1 shadow-sm border border-border/50 z-10">
                <Badge variant={editedValue !== segment.target ? "outline" : segment.status === 'Reviewed' ? "default" : "outline"}
                  className={cn(
                    "text-xs font-normal h-5",
                    editedValue !== segment.target ? "border-blue-500 text-blue-500" : "",
                    editedValue === segment.target && segment.status === 'Reviewed' ? "bg-green-600/80 hover:bg-green-600/90" : "",
                    editedValue === segment.target && segment.status === 'Rejected' ? "border-red-500 text-red-500" : ""
                  )}
                >
                  {editedValue !== segment.target ? 'Edited' : segment.status || 'Draft'}
                </Badge>
              </div>
            )}
            
            {/* 텍스트 영역에 하단 패딩 추가하여 버튼 공간 확보 */}
            <Textarea
              ref={textareaRef}
              value={editedValue}
              onChange={(e) => onEditValueChange?.(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[80px] p-2 pb-10 resize-both border-accent shadow-sm"
              placeholder="Enter translation..."
              autoFocus
            />
            
            {/* 버튼을 텍스트 영역 내부 하단에 배치 */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-md border border-border/50 shadow-sm z-10">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={onCancel} variant="ghost" size="icon" className="h-7 w-7">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Cancel (Esc)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={onSave} variant="ghost" size="icon" className="h-7 w-7">
                    <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save (Ctrl+Enter)</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </span>
      );
    } else {
      // 상태에 따른 스타일 적용
      const hasTranslation = !!segment.target;
      
      // 문서 모드에서 뱃지 표시 방식 변경 (인라인으로 표시)
      if (isDocumentMode) {
        return (
          <span 
            className="relative inline"
            data-segment-id={segment.id}
            data-status={segment.status}
            data-origin={segment.origin}
          >
            <span 
              className={cn(
                "font-serif text-base inline cursor-text", 
                "selection:bg-blue-100 dark:selection:bg-blue-900",
                !hasTranslation && "text-muted-foreground italic",
                hasTranslation && segment.status === 'Reviewed' && "text-green-700 dark:text-green-400",
                hasTranslation && segment.status === 'Rejected' && "text-red-700 dark:text-red-400",
                className
              )}
              onClick={onSelectForEditing}
            >
              {segment.target || "Click to add translation"}
            </span>
            
            {/* 문서 모드에서는 인라인 뱃지를 제거하고 상태에 따른 텍스트 색상만 적용 */}
          </span>
        );
      }
      
      // 기본 표시 방식
      return (
        <span 
          className={cn(
            "font-serif text-base inline cursor-text", 
            "selection:bg-blue-100 dark:selection:bg-blue-900",
            !hasTranslation && "text-muted-foreground italic",
            hasTranslation && segment.status === 'Reviewed' && "text-green-700 dark:text-green-400",
            hasTranslation && segment.status === 'Rejected' && "text-red-700 dark:text-red-400",
            className
          )}
          onClick={onSelectForEditing}
          data-segment-id={segment.id}
          data-status={segment.status}
          data-origin={segment.origin}
        >
          {segment.target || "Click to add translation"}
        </span>
      );
    }
  }
  
  // Standard segment editor mode
  // Source segment (read-only)
  if (isSource) {
    return (
      <div 
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
  
  // Target segment (editable)
  return (
    <div 
      className={cn(
        "p-3 border-b relative group transition-colors",
        isEditing ? "bg-accent/30 shadow-sm" : "hover:bg-accent/10",
        className
      )}
    >
      {/* 표 모드에서 댓글 아이콘만 표시 */}
      {segment.comment && (
        <div className="absolute top-1 right-1 opacity-70 group-hover:opacity-100 z-10">
          <MessageCircle className="h-3.5 w-3.5 text-blue-500" />
        </div>
      )}
      
      {/* Editing or viewing mode */}
      {isEditing ? (
        <div className="relative">
          {/* 스크린샷 모양대로 상단에 상태 뱃지 표시 */}
          <div className="absolute top-0 left-0 right-0 flex items-center bg-indigo-600 text-white py-1 px-3 font-medium text-sm rounded-t z-10">
            {segment.status === 'Reviewed' ? 'Reviewed' : 
             segment.status === 'Rejected' ? 'Rejected' : 
             editedValue !== segment.target ? 'Edited' : 'Draft'}
          </div>
          
          {/* 상단 헤더에 맞게 텍스트 영역 스타일 조정 */}
          <Textarea
            ref={textareaRef}
            value={editedValue}
            onChange={(e) => onEditValueChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[150px] resize-none border-0 border-b rounded-t-none rounded-b mt-6 pt-4 shadow-none"
            placeholder="Enter translation..."
            autoFocus
          />
          
          {/* 스크린샷처럼 우측 하단에 버튼 배치 */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
            <Button onClick={onCancel} variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full bg-gray-200/80 hover:bg-gray-300/90 dark:bg-gray-800/80 dark:hover:bg-gray-700/90">
              <X className="h-4 w-4" />
            </Button>
            <Button onClick={onSave} variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full bg-blue-100/80 hover:bg-blue-200/90 dark:bg-blue-900/80 dark:hover:bg-blue-800/90">
              <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </Button>
          </div>
        </div>
      ) : (
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