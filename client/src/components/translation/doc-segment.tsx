import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, MessageCircle, FileEdit, CircuitBoard, CircleSlash, CircleCheck, UserCheck, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { TranslationUnit, StatusType, OriginType } from '@/types';
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
  onUpdate?: (target: string, status?: string, origin?: string) => void;
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
  onUpdate,
  className,
  isDocumentMode = false, // 기본값은 false
  showStatusInEditor = false, // 기본값은 false
}: DocSegmentProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // 상태 토글 기능 추가
  const toggleStatus = () => {
    if (!isSource && onUpdate) {
      // Reviewed와 현재 상태 간 토글
      const newStatus = segment.status === "Reviewed" ? "Edited" : "Reviewed";
      
      // MT, 100%, Fuzzy일 경우 origin도 HT로 변경
      const needsOriginChange = (segment.origin === "MT" || segment.origin === "100%" || segment.origin === "Fuzzy");
      const newOrigin = (newStatus === "Reviewed" && needsOriginChange) ? "HT" : segment.origin;
      
      onUpdate(editedValue, newStatus, newOrigin);
    }
  };
  
  // Auto-focus textarea when editing begins
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      
      // Place cursor at the end of the text
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [isEditing]);
  
  // 텍스트 영역 자동 높이 조절
  useLayoutEffect(() => {
    if (isEditing && textareaRef.current) {
      const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.style.height = 'auto';
          textarea.style.height = `${textarea.scrollHeight}px`;
        }
      };
      
      // 초기 로드 시 높이 조절
      adjustHeight();
      
      // 윈도우 리사이즈 시 높이 재조정
      window.addEventListener('resize', adjustHeight);
      return () => window.removeEventListener('resize', adjustHeight);
    }
  }, [isEditing, editedValue]);
  
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
            {/* 불필요한 상태 뱃지 제거 - 푸터 영역에 통합 */}
            
            {/* 문서 모드에서 텍스트 영역 - 자동 높이 조절 */}
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={editedValue}
                onChange={(e) => {
                  const newValue = e.target.value;
                  onEditValueChange?.(newValue);
                  
                  // 자동 상태 업데이트 - 편집할 때 segment.target과 다르면 상태 업데이트
                  if (onUpdate) {
                    const isValueChanged = newValue !== segment.target;
                    const needsOriginChange = segment.origin === "MT" || segment.origin === "100%" || segment.origin === "Fuzzy";
                    const newOrigin = isValueChanged && needsOriginChange ? "HT" : segment.origin;
                    
                    // 이미 Reviewed였는데 편집하면 Edited로 변경, MT/100%/Fuzzy였는데 편집하면 Edited로 변경
                    let newStatus = segment.status;
                    if (isValueChanged) {
                      if (segment.status === "Reviewed") {
                        newStatus = "Edited";
                      } else if (segment.status === "MT" || segment.status === "100%" || segment.status === "Fuzzy") {
                        newStatus = "Edited";
                      }
                      
                      onUpdate(newValue, newStatus, newOrigin);
                    }
                  }
                }}
                onKeyDown={handleKeyDown}
                className="w-full p-2 pt-2 pb-12 resize-none border-0 shadow-none"
                placeholder="Enter translation..."
                autoFocus
                style={{ height: 'auto', minHeight: '80px', overflow: 'hidden' }}
              />
              
              {/* 텍스트 영역 내부 하단에 버튼 푸터 영역 배치 */}
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-muted/20 border-t border-border/30 flex items-center justify-between px-2">
                {/* 왼쪽에 상태 뱃지 */}
                <div className="flex items-center">
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
                
                {/* 오른쪽에 버튼들 */}
                <div className="flex gap-2">
                  <Button 
                    onClick={onCancel} 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 w-7 p-0 rounded-full"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Cancel</span>
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      // Reviewed로 마크하고 저장하는 기능
                      const newStatus = "Reviewed";
                      onUpdate?.(editedValue, newStatus, segment.origin);
                      onSave?.();
                    }} 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 w-7 p-0 rounded-full bg-green-100 dark:bg-green-900/30"
                  >
                    <CircleCheck className="h-4 w-4 text-green-600 dark:text-green-500" />
                    <span className="sr-only">Mark as Reviewed and Save</span>
                  </Button>
                  
                  <Button 
                    onClick={onSave} 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 w-7 p-0 rounded-full bg-blue-100 dark:bg-blue-900/30"
                  >
                    <Check className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                    <span className="sr-only">Save</span>
                  </Button>
                </div>
              </div>
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
          {/* 불필요한 상태 뱃지 제거 - 표 모드에서도 제거 */}
          
          {/* 표 모드에서 텍스트 영역 */}
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={editedValue}
              onChange={(e) => {
                const newValue = e.target.value;
                onEditValueChange?.(newValue);
                
                // 자동 상태 업데이트 - 편집할 때 segment.target과 다르면 상태 업데이트
                if (onUpdate) {
                  const isValueChanged = newValue !== segment.target;
                  const needsOriginChange = segment.origin === "MT" || segment.origin === "100%" || segment.origin === "Fuzzy";
                  const newOrigin = isValueChanged && needsOriginChange ? "HT" : segment.origin;
                  
                  // 이미 Reviewed였는데 편집하면 Edited로 변경, MT/100%/Fuzzy였는데 편집하면 Edited로 변경
                  let newStatus = segment.status;
                  if (isValueChanged) {
                    if (segment.status === "Reviewed") {
                      newStatus = "Edited";
                    } else if (segment.status === "MT" || segment.status === "100%" || segment.status === "Fuzzy") {
                      newStatus = "Edited";
                    }
                    
                    onUpdate(newValue, newStatus, newOrigin);
                  }
                }
              }}
              onKeyDown={handleKeyDown}
              className="w-full p-3 pt-3 pb-12 resize-none border-0 shadow-none rounded-md"
              placeholder="Enter translation..."
              autoFocus
              style={{ height: 'auto', minHeight: '90px', overflow: 'hidden' }}
            />
            
            {/* 텍스트 영역 내부 하단에 버튼 푸터 영역 배치 */}
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-muted/20 border-t border-border/30 flex items-center justify-between px-2 rounded-b-md">
              {/* 왼쪽에 상태 뱃지 */}
              <div className="flex items-center">
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
              
              {/* 오른쪽에 버튼들 */}
              <div className="flex gap-2">
                <Button 
                  onClick={onCancel} 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 w-7 p-0 rounded-full"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Cancel</span>
                </Button>
                
                <Button 
                  onClick={() => {
                    // Reviewed로 마크하고 저장하는 기능
                    const newStatus = "Reviewed";
                    onUpdate?.(editedValue, newStatus, segment.origin);
                    onSave?.();
                  }} 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 w-7 p-0 rounded-full bg-green-100 dark:bg-green-900/30"
                >
                  <CircleCheck className="h-4 w-4 text-green-600 dark:text-green-500" />
                  <span className="sr-only">Mark as Reviewed and Save</span>
                </Button>
                
                <Button 
                  onClick={onSave} 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 w-7 p-0 rounded-full bg-blue-100 dark:bg-blue-900/30"
                >
                  <Check className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                  <span className="sr-only">Save</span>
                </Button>
              </div>
            </div>
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