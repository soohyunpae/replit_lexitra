import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Languages } from "lucide-react";
import { TranslationUnit } from "@/types";
import { cn } from "@/lib/utils";

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
    onCheckChange,
  } = props;

  // 상태 및 원본 변경 여부 확인을 위한 상수
  const STATUS_NEED_CHANGE = ["MT", "100%", "Fuzzy"];
  
  // 세그먼트 현재 상태값 로컬 변수 사용
  const liveSegment = segment;

  // 편집중인 텍스트 값 관리 
  const [value, setValue] = useState(
    isSource ? liveSegment.source : liveSegment.target || "",
  );
  
  // 텍스트 영역 ref
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sourceContainerRef = useRef<HTMLDivElement>(null);
  const targetContainerRef = useRef<HTMLDivElement>(null);
  
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

  // 높이 동기화 함수 - DOM 업데이트 이후 정확한 높이 계산을 위해 requestAnimationFrame 사용
  const syncHeights = () => {
    requestAnimationFrame(() => {
      const sourceElement = sourceContainerRef.current;
      const targetElement = targetContainerRef.current;
      const textareaElement = textareaRef.current;
      
      if (!sourceElement || !targetElement || !textareaElement) return;
      
      // 높이 초기화 (정확한 계산을 위해)
      textareaElement.style.height = "auto";
      sourceElement.style.height = "auto";
      targetElement.style.height = "auto";
      
      // 스크롤 높이 계산 - DOM 반영 후 정확한 값 얻기
      const textareaHeight = textareaElement.scrollHeight;
      const sourceHeight = sourceElement.scrollHeight;
      
      // 최대 높이 계산 (최소 120px)
      const maxHeight = Math.max(sourceHeight, textareaHeight, 120);
      
      // 높이 적용
      textareaElement.style.height = `${maxHeight}px`;
      sourceElement.style.height = `${maxHeight}px`;
      targetElement.style.height = `${maxHeight}px`;
    });
  };
  
  // 창 크기 변경시 높이 동기화 - 초기 마운트 시 한 번만 실행
  useEffect(() => {
    // 윈도우 리사이즈 이벤트 연결
    window.addEventListener("resize", syncHeights);
    
    return () => {
      // 정리 함수
      window.removeEventListener("resize", syncHeights);
    };
  }, []);
  
  // 세그먼트 데이터나 텍스트 값 변경시 레이아웃 처리 이후 높이 동기화
  useLayoutEffect(() => {
    // DOM 업데이트 후 실행되도록 requestAnimationFrame 내부에서 처리
    requestAnimationFrame(() => {
      if (sourceContainerRef.current && targetContainerRef.current && textareaRef.current) {
        // 높이 초기화를 별도로 한 번 더 수행해 정확한 측정 보장
        textareaRef.current.style.height = "auto";
        sourceContainerRef.current.style.height = "auto";
        targetContainerRef.current.style.height = "auto";
        
        // 스크롤 높이 계산
        const textHeight = textareaRef.current.scrollHeight;
        const sourceHeight = sourceContainerRef.current.scrollHeight;
        const maxHeight = Math.max(textHeight, sourceHeight, 120);
        
        // 높이 적용
        textareaRef.current.style.height = `${maxHeight}px`;
        sourceContainerRef.current.style.height = `${maxHeight}px`;
        targetContainerRef.current.style.height = `${maxHeight}px`;
      }
    });
  }, [liveSegment.source, liveSegment.target, value]);

  // 헬퍼 함수 - origin이 리스트에 있는지 확인
  const isOriginInList = (
    origin: string | undefined,
    list: string[],
  ): boolean => {
    return !!origin && list.includes(origin);
  };

  // 상태 변경 토글
  const toggleStatus = () => {
    if (!isSource && onUpdate) {
      const newStatus =
        liveSegment.status === "Reviewed" ? "Edited" : "Reviewed";
      const needsOriginChange = isOriginInList(
        liveSegment.origin,
        STATUS_NEED_CHANGE,
      );
      const newOrigin =
        newStatus === "Reviewed" && needsOriginChange
          ? "HT"
          : liveSegment.origin || "HT";

      onUpdate(value, newStatus, newOrigin as string);
    }
  };

  // 텍스트 변경 핸들러
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // 즉시 UI 업데이트
    setValue(newValue);
    
    // 서버 업데이트 로직
    if (!isSource && onUpdate) {
      const isValueChanged = newValue !== liveSegment.target;
      const needsOriginChange = isOriginInList(
        liveSegment.origin,
        STATUS_NEED_CHANGE,
      );
      const newOrigin =
        isValueChanged && needsOriginChange ? "HT" : liveSegment.origin || "HT";

      let newStatus = liveSegment.status || "Edited";
      if (isValueChanged) {
        if (
          liveSegment.status === "Reviewed" ||
          isOriginInList(liveSegment.status, STATUS_NEED_CHANGE)
        ) {
          newStatus = "Edited";
        }
      }

      // onUpdate 함수 호출
      onUpdate(newValue, newStatus as string, newOrigin as string);
    }
  };

  // 상태에 따른 배지 스타일링
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
      case "Draft":
        return "bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  // 체크박스 클릭 이벤트 핸들러
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCheckChange) {
      onCheckChange(!isChecked);
    }
  };

  return (
    <div
      className={cn(
        "mb-[1px] w-full rounded-md px-2 py-0.5 transition-colors",
        liveSegment.status === "Reviewed" ? "bg-blue-50 dark:bg-blue-950/30" : 
        isSelected ? "bg-accent/90" : "bg-card",
        !isSource && !liveSegment.target && "border border-dashed border-yellow-400"
      )}
      onClick={onSelect}
    >
      {!isSource ? (
        <div className="flex items-stretch gap-x-2">
          {/* 번역문 왼쪽은 체크박스만 배치 */}
          <div className="flex h-full w-6 items-start justify-end pt-[4px]">
            {onCheckChange && (
              <div onClick={handleCheckboxClick}>
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={onCheckChange}
                  className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
              </div>
            )}
          </div>

          {/* 번역문 입력 영역 */}
          <div 
            ref={targetContainerRef} 
            className="relative flex min-h-[120px] flex-1 items-stretch bg-transparent"
          >
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={handleTextareaChange}
              className="no-scrollbar flex-1 resize-none overflow-hidden bg-transparent pb-[28px] pt-[2px] text-sm leading-relaxed shadow-none outline-none font-mono w-full h-auto min-h-[40px] border-none focus-visible:ring-0 focus:ring-0"
              style={{
                lineHeight: "1.6",
                overflow: "hidden", 
                boxShadow: "none",
                outline: "none",
                transition: "none"
              }}
              placeholder="Enter translation..."
            />

            {/* 상태 뱃지와 번역 버튼 */}
            <div className="absolute bottom-2 right-2">
              <span
                className={`cursor-pointer rounded-full px-2 py-0.5 text-xs font-medium transition ${getStatusColor(liveSegment.status)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (liveSegment.status === "Rejected") return;
                  toggleStatus();
                }}
                title={`Click to toggle status (${liveSegment.status === "Reviewed" ? "Edited" : "Reviewed"})`}
              >
                {liveSegment.status}
              </span>

              {/* 기계 번역 버튼 */}
              {!liveSegment.target && onTranslateWithGPT && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTranslateWithGPT();
                  }}
                  className="ml-1 h-7 w-7 p-0"
                >
                  <Languages className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-stretch gap-x-2">
          {/* 원문 왼쪽에는 세그먼트 번호 */}
          <div className="flex h-full w-6 items-start justify-end pr-1 pt-[4px] font-mono text-xs text-gray-500">
            {index}
          </div>

          {/* 원문 텍스트 표시 영역 */}
          <div 
            ref={sourceContainerRef} 
            className="relative flex min-h-[120px] flex-1 items-stretch bg-transparent"
          >
            <Textarea
              value={liveSegment.source || ""}
              readOnly
              className="no-scrollbar flex-1 resize-none overflow-hidden bg-transparent pt-[2px] text-sm font-mono leading-relaxed text-foreground shadow-none outline-none w-full h-auto min-h-[40px] border-none focus-visible:ring-0 focus:ring-0"
              style={{
                lineHeight: "1.6",
                overflow: "hidden",
                boxShadow: "none",
                outline: "none",
                transition: "none"
              }}
              placeholder="No source text"
            />
          </div>
        </div>
      )}
    </div>
  );
}
