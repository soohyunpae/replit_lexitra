import React, { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, Languages } from "lucide-react";
import { TranslationUnit, StatusType, OriginType } from "@/types";
import { useSegmentContext } from "@/hooks/useSegmentContext";

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

export function EditableSegment(props: EditableSegmentProps) {
  const {
    segment,
    index,
    isSource,
    isSelected,
    onSelect,
    onUpdate,
    onTranslateWithGPT,
    isChecked,
    onCheckChange
  } = props;
  
  // 공유 컨텍스트에서 최신 데이터 참조
  const { segments } = useSegmentContext();
  
  // 상태 및 원본 변경 여부 확인을 위한 상수
  const STATUS_NEED_CHANGE = ["MT", "100%", "Fuzzy"];
  
  // 최신 세그먼트 데이터 사용 - context에서 찾아 항상 최신 상태 유지
  const liveSegment = useMemo(
    () => segments.find(s => s.id === segment.id) || segment,
    [segments, segment.id]
  );
  
  const [value, setValue] = useState(isSource ? liveSegment.source : liveSegment.target || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // 최신 데이터 동기화
  useEffect(() => {
    if (!isSource) {
      setValue(liveSegment.target || "");
    }
  }, [liveSegment.target, isSource]);
  
  // 자동 포커스
  useEffect(() => {
    if (!isSource && isSelected && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isSelected, isSource]);
  
  // 상태 변경
  const toggleStatus = () => {
    if (!isSource && onUpdate) {
      const newStatus = liveSegment.status === "Reviewed" ? "Edited" : "Reviewed";
      const needsOriginChange = STATUS_NEED_CHANGE.includes(liveSegment.origin);
      const newOrigin = (newStatus === "Reviewed" && needsOriginChange) ? "HT" : liveSegment.origin;
      
      onUpdate(value, newStatus, newOrigin);
    }
  };
  
  // 텍스트 변경 핸들러
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    if (!isSource && onUpdate) {
      const isValueChanged = newValue !== liveSegment.target;
      const needsOriginChange = STATUS_NEED_CHANGE.includes(liveSegment.origin);
      const newOrigin = isValueChanged && needsOriginChange ? "HT" : liveSegment.origin;
      
      let newStatus = liveSegment.status;
      if (isValueChanged) {
        if (liveSegment.status === "Reviewed" || STATUS_NEED_CHANGE.includes(liveSegment.status)) {
          newStatus = "Edited";
        }
      }
      
      onUpdate(newValue, newStatus, newOrigin);
    }
    
    // 리사이즈
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
  }, [liveSegment.target, isSource]);
  
  // Get status badge color based on status
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "Reviewed":
        return "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Rejected":
        return "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "Edited":
        return "bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "100%":
        return "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Fuzzy":
        return "bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "MT":
        return "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "Draft": // 이전 버전과의 호환성 유지
        return "bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
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
      className={`rounded-md p-3 mb-3 h-full w-full flex flex-col ${liveSegment.status === "Reviewed" ? "bg-blue-50 dark:bg-blue-950/30" : isSelected ? "bg-accent/90" : "bg-card"} transition-colors ${!isSource && !liveSegment.target ? "border border-dashed border-yellow-400" : ""}`}
      onClick={onSelect}
    >
      {/* 원문과 번역문을 나란히 배치 */}
      {!isSource ? (
        <div className="flex">
          {/* 번역문 입력 영역 */}
          <div className="flex-grow relative">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={handleTextareaChange}
              className="min-h-[60px] font-mono resize-none focus-visible:ring-offset-0 focus-visible:ring-1 overflow-hidden no-scrollbar"
              placeholder="Enter translation..."
            />
          </div>
          
          {/* 오른쪽 컨트롤 열 */}
          <div className="ml-2 pl-2 flex flex-col items-center justify-start min-w-[80px] border-l border-border">
            {/* 세그먼트 번호 */}
            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded-md mb-2 w-full text-center">{index}</span>
            
            {/* 체크박스 */}
            {onCheckChange && (
              <div className="mb-2" onClick={handleCheckboxClick}>
                <Checkbox 
                  checked={isChecked} 
                  onCheckedChange={onCheckChange}
                  className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
              </div>
            )}
            
            {/* 상태 뱃지 - 최신 데이터 참조 */}
            <div className="mb-2 w-full flex justify-center">
              <span 
                className={`text-xs px-1.5 py-0.5 rounded-md ${getStatusColor(liveSegment.status)} cursor-pointer w-full text-center`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStatus();
                }}
                title={`Click to toggle status (${liveSegment.status === "Reviewed" ? "Edited" : "Reviewed"})`}
              >
                {liveSegment.status}
              </span>
            </div>
            
            {/* 체크 버튼 - 최신 데이터 참조 */}
            <div className="flex justify-center mb-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStatus();
                }} 
                className="h-7 w-7 p-0"
                title={`Mark as ${liveSegment.status === "Reviewed" ? "Edited" : "Reviewed"}`}
              >
                <Check className={`h-4 w-4 ${liveSegment.status === "Reviewed" ? "text-green-600" : "text-muted-foreground"}`} />
              </Button>
            </div>
            
            {/* MT 번역 버튼 - 최신 데이터 참조 */}
            {!liveSegment.target && onTranslateWithGPT && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  onTranslateWithGPT();
                }} 
                className="h-7 w-7 p-0"
              >
                <Languages className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
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