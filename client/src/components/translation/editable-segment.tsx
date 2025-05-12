import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, Languages } from "lucide-react";
import { TranslationUnit, StatusType, OriginType } from "@/types";
import { useAutoResize } from "@/hooks/useAutoResize";

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
  
  // segment 속성을 직접 사용 (더 이상 context 필요 없음)
  const liveSegment = segment;

  const [value, setValue] = useState(
    isSource ? liveSegment.source : liveSegment.target || "",
  );
  
  // 자동 리사이징 훅 사용
  const { textareaRef, adjustHeight } = useAutoResize(value);
  const sourceTextareaRef = useRef<HTMLTextAreaElement>(null);

  // origin이 undefined인 경우 처리를 위한 헬퍼 함수
  const isOriginInList = (
    origin: string | undefined,
    list: string[],
  ): boolean => {
    return !!origin && list.includes(origin);
  };

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

  // 텍스트 변경 핸들러 - 즉시 UI 업데이트와 디바운스 저장 분리
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // 즉시 UI 업데이트 - 사용자 입력 지연 없음
    setValue(newValue);
    
    // 커스텀 훅의 adjustHeight 함수를 즉시 호출하여 textarea 높이 조정
    adjustHeight();

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

      // onUpdate 함수를 통해 디바운스 저장 호출
      onUpdate(newValue, newStatus as string, newOrigin as string);
    }
  };

  // Update textarea height when segment source or target changes or on mount
  useEffect(() => {
    // 커스텀 훅의 adjustHeight 함수를 사용하여 필요할 때 높이 조정
    if (!isSource) {
      // 타겟 텍스트의 경우 커스텀 훅에서 자동으로 리사이징 처리
      adjustHeight();
    }
    
    // 소스 텍스트도 높이 자동 조정 (소스 텍스트에는 직접 처리)
    if (isSource && sourceTextareaRef.current) {
      sourceTextareaRef.current.style.height = "0px";
      sourceTextareaRef.current.style.height = `${sourceTextareaRef.current.scrollHeight}px`;
    }
  }, [liveSegment.source, liveSegment.target, isSource, adjustHeight]);
  
  // 윈도우 리사이즈 이벤트는 커스텀 훅에서 자동으로 처리하므로 별도 구현 필요 없음
  // 소스 텍스트 textarea에만 리사이즈 이벤트 추가 (타겟은 훅에서 처리)
  useEffect(() => {
    const resizeSourceArea = () => {
      if (isSource && sourceTextareaRef.current) {
        sourceTextareaRef.current.style.height = "0px";
        sourceTextareaRef.current.style.height = `${sourceTextareaRef.current.scrollHeight}px`;
      }
    };

    window.addEventListener("resize", resizeSourceArea);
    return () => window.removeEventListener("resize", resizeSourceArea);
  }, [isSource]);

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
      className={`rounded-md py-0.5 px-2 mb-[1px] h-full w-full ${liveSegment.status === "Reviewed" ? "bg-blue-50 dark:bg-blue-950/30" : isSelected ? "bg-accent/90" : "bg-card"} transition-colors ${!isSource && !liveSegment.target ? "border border-dashed border-yellow-400" : ""}`}
      onClick={onSelect}
    >
      {/* grid 기반 레이아웃 적용 */}
      {!isSource ? (
        <div className="grid grid-cols-[min-content_1fr] gap-x-2 items-stretch">
          {/* 번역문 왼쪽은 체크박스만 배치 (세그먼트 번호 없음) - 위쪽 정렬 */}
          <div className="flex items-start justify-end w-6 pt-[4px] h-full">
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

          {/* 번역문 입력 영역 - 패딩 제거하여 텍스트 줄 정렬 */}
          <div className="relative w-full min-h-[120px] p-3 bg-card rounded-md">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={handleTextareaChange}
              className="w-full h-full font-mono resize-none border-none outline-none focus:ring-0 focus-visible:ring-0 shadow-none bg-transparent overflow-hidden no-scrollbar pt-[2px] pb-[28px] text-sm leading-relaxed"
              style={{
                lineHeight: "1.6",
                overflow: "hidden", 
                boxShadow: "none",
                outline: "none",
                minHeight: "120px", // 최소 높이 설정으로 좌우 세그먼트 높이 일치
                transition: "none" // 높이 변경 시 부드러운 전환 방지하여 성능 향상
              }}
              placeholder="Enter translation..."
            />

            {/* 상태 뱃지를 번역문 안에 표시 - 체크 버튼 제거 및 기능 통합 */}
            <div className="absolute bottom-2 right-2">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer transition ${getStatusColor(liveSegment.status)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (liveSegment.status === "Rejected") return; // Rejected는 클릭 불가
                  toggleStatus();
                }}
                title={`Click to toggle status (${liveSegment.status === "Reviewed" ? "Edited" : "Reviewed"})`}
              >
                {liveSegment.status}
              </span>

              {/* MT 번역 버튼만 유지 */}
              {!liveSegment.target && onTranslateWithGPT && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTranslateWithGPT();
                  }}
                  className="h-7 w-7 p-0 ml-1"
                >
                  <Languages className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[min-content_1fr] gap-x-2 items-stretch">
          {/* 원문 왼쪽에는 세그먼트 번호 유지 - 위쪽 정렬 */}
          <div className="flex items-start justify-end w-6 text-xs text-gray-500 pr-1 font-mono pt-[4px] h-full">
            {index}
          </div>

          {/* 원문 텍스트 - textarea로 변경하고 읽기 전용으로 설정 */}
          <div className="relative w-full min-h-[120px] p-3 bg-muted rounded-md">
            <Textarea
              ref={sourceTextareaRef}
              value={value || ""}
              readOnly
              className="w-full h-full font-mono resize-none border-none outline-none focus:ring-0 focus-visible:ring-0 shadow-none bg-transparent overflow-hidden no-scrollbar pt-[2px] text-sm leading-relaxed"
              style={{
                lineHeight: "1.6",
                overflow: "hidden",
                boxShadow: "none",
                outline: "none",
                minHeight: "120px", // 최소 높이 설정으로 좌우 세그먼트 높이 일치
                transition: "none" // 높이 변경 시 부드러운 전환 방지하여 성능 향상
              }}
              placeholder={isSource ? "No source text" : "No translation yet"}
            />
          </div>
        </div>
      )}
    </div>
  );
}
