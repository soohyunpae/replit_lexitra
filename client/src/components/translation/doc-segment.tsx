import React, { useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, MessageCircle, FileEdit, CircuitBoard, CircleSlash, CircleCheck, UserCheck, FileType, File } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { TranslationUnit } from '@/types';
import { cn } from '@/lib/utils';

// DOCX/바이너리 파일 확인 헬퍼 함수
const isBinaryContent = (content: string): boolean => {
  return content.startsWith('[BASE64:');
};

// 바이너리 파일 유형 확인 헬퍼 함수
const getBinaryFileType = (content: string): string => {
  if (!isBinaryContent(content)) return '';
  
  const typeMatch = content.match(/\[BASE64:([^\]]+)\]/);
  return typeMatch ? typeMatch[1] : 'application/octet-stream';
};

// 사용자에게 보여줄 친화적인 메시지 생성 함수
const getReadableFileContent = (content: string): string => {
  if (!isBinaryContent(content)) return content;
  
  const fileType = getBinaryFileType(content);
  if (fileType.includes('word') || fileType.includes('docx')) {
    return 'The document appears to be a Word document containing various XML files and settings for a Word document. It includes content types, relationships, document settings, styles, web settings, font tables, and core properties. The document is likely a template or a structured document that uses XML to define its layout and content.';
  } else if (fileType.includes('pdf')) {
    return 'This is a PDF document containing binary data. It may include text, images, and other formatting that cannot be displayed directly in the editor.';
  } else if (fileType.includes('image')) {
    return 'This is an image file containing binary data that cannot be displayed directly in the text editor.';
  } else {
    return `This is a binary file of type "${fileType}" that cannot be displayed directly in the text editor.`;
  }
};

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
          className={cn("font-serif text-base inline", isEditing && "bg-muted/20", className)}
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
            <Textarea
              ref={textareaRef}
              value={editedValue}
              onChange={(e) => onEditValueChange?.(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[80px] resize-none border-accent"
              placeholder="Enter translation..."
              autoFocus
            />
            {showStatusInEditor && (
              <div className="absolute top-2 right-2 flex items-center gap-1 text-xs opacity-80 bg-background/90 rounded-md p-1 z-10">
                <Badge variant="outline" className="text-[10px] py-0 h-4">
                  {segment.status || 'MT'}
                </Badge>
              </div>
            )}
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
              <Button onClick={onCancel} variant="ghost" size="icon" className="h-7 w-7">
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button onClick={onSave} variant="ghost" size="icon" className="h-7 w-7">
                <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </Button>
            </div>
          </div>
        </span>
      );
    } else {
      return (
        <span 
          className={cn("font-serif text-base inline cursor-text", className)}
          onClick={onSelectForEditing}
        >
          {segment.target ? (
            isBinaryContent(segment.target) ? (
              <div className="p-2 border rounded-md bg-muted/50">
                <div className="flex items-center text-muted-foreground mb-2">
                  <FileType className="w-4 h-4 mr-2" />
                  <span className="text-xs">Binary file: {getBinaryFileType(segment.target)}</span>
                </div>
                <div className="text-sm italic">{getReadableFileContent(segment.target)}</div>
              </div>
            ) : (
              segment.target
            )
          ) : (
            <span className="text-muted-foreground italic">Click to add translation</span>
          )}
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
        <div className="text-sm md:text-base whitespace-pre-wrap">
          {isBinaryContent(segment.source) ? (
            <div className="p-2 border rounded-md bg-muted/50">
              <div className="flex items-center text-muted-foreground mb-2">
                <FileType className="w-4 h-4 mr-2" />
                <span className="text-xs">Binary file: {getBinaryFileType(segment.source)}</span>
              </div>
              <div className="text-sm italic">{getReadableFileContent(segment.source)}</div>
            </div>
          ) : (
            segment.source
          )}
        </div>
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
      {/* Segment status badge */}
      <div className="absolute top-1 right-2 flex items-center gap-1 text-xs opacity-70 group-hover:opacity-100">
        {segment.comment && <MessageCircle className="h-3.5 w-3.5 text-blue-500" />}
        {segment.status && (
          <Badge variant="outline" className="text-[10px] py-0 h-4">
            {segment.status}
          </Badge>
        )}
        {segment.origin && (
          <Badge variant="outline" className="text-[10px] py-0 h-4">
            {segment.origin}
          </Badge>
        )}
      </div>
      
      {/* Editing or viewing mode */}
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
            <button onClick={onCancel} className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
            <button onClick={onSave} className="p-1 rounded-full bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800">
              <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </button>
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