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
            
            {/* 문서 모드에서 상태 표시를 위한 작은 아이콘 또는 표시 */}
            {hasTranslation && segment.status && (
              <span className="inline-block relative ml-0.5">
                <Badge 
                  variant={segment.status === 'Reviewed' ? "default" : "outline"}
                  className={cn(
                    "text-[9px] px-1 py-0 h-4 ml-0.5 align-text-top",
                    segment.status === 'Reviewed' ? "bg-green-600/80" : "",
                    segment.status === 'Rejected' ? "border-red-500 text-red-500" : "",
                    segment.status === 'Draft' || segment.status === 'MT' ? "border-blue-500 text-blue-500" : ""
                  )}
                >
                  {segment.status}
                </Badge>
              </span>
            )}
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
      {/* Segment status badge - 우측 상단에 더 작게 표시하여 텍스트를 가리지 않도록 개선 */}
      <div className="absolute top-1 right-1 flex items-center gap-1 text-xs opacity-70 group-hover:opacity-100 bg-background/40 backdrop-blur-sm rounded p-0.5 z-10">
        {segment.comment && <MessageCircle className="h-3 w-3 text-blue-500" />}
        {segment.status && (
          <Badge variant="outline" className="text-[9px] py-0 h-3.5 px-1.5 font-normal border-border/60">
            {segment.status}
          </Badge>
        )}
      </div>
      
      {/* Editing or viewing mode */}
      {isEditing ? (
        <div className="relative">
          {/* 상태 뱃지를 텍스트 영역 위쪽에 표시 */}
          <div className="absolute top-0 left-2 -mt-6 flex items-center gap-1 text-xs bg-background/90 backdrop-blur-sm rounded-md p-1 shadow-sm border border-border/50 z-10">
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
          
          {/* 텍스트 입력란에 하단 패딩 추가하여 버튼 공간 확보 */}
          <Textarea
            ref={textareaRef}
            value={editedValue}
            onChange={(e) => onEditValueChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[80px] resize-none border-accent pb-10"
            placeholder="Enter translation..."
          />
          
          {/* 텍스트 영역 내부 하단에 버튼 배치 */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-background/90 backdrop-blur-sm rounded-md p-0.5 border border-border/50 shadow-sm z-10">
            <Button onClick={onCancel} variant="ghost" size="icon" className="h-7 w-7">
              <X className="h-3.5 w-3.5" />
            </Button>
            <Button onClick={onSave} variant="ghost" size="icon" className="h-7 w-7">
              <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
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