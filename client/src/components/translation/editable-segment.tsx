import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, Languages } from "lucide-react";
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
  
  // 좌우 컨테이너와 textarea에 대한 ref 추가
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sourceTextareaRef = useRef<HTMLTextAreaElement>(null);
  const leftContainerRef = useRef<HTMLDivElement>(null);
  const rightContainerRef = useRef<HTMLDivElement>(null);
  
  // 왼쪽과 오른쪽 세그먼트의 높이를 동기화하는 함수
  const syncHeights = () => {
    if (textareaRef.current && sourceTextareaRef.current && leftContainerRef.current && rightContainerRef.current) {
      // 높이 초기화 - 자연스러운 높이 계산을 위해
      const textarea = textareaRef.current;
      const sourceTextarea = sourceTextareaRef.current;
      
      textarea.style.height = 'auto';
      sourceTextarea.style.height = 'auto';
      
      // 실제 콘텐츠 높이 계산
      const textareaScrollHeight = textarea.scrollHeight;
      const sourceScrollHeight = sourceTextarea.scrollHeight;
      
      // 가장 긴 쪽 기준으로 높이 통일 (최소 120px)
      const maxHeight = Math.max(textareaScrollHeight, sourceScrollHeight, 120);
      
      // textarea 요소에 직접 높이 적용
      textarea.style.height = `${maxHeight}px`;
      sourceTextarea.style.height = `${maxHeight}px`;
      
      // 컨테이너에도 동일한 높이 적용 (컨테이너의 padding/margin 고려)
      leftContainerRef.current.style.height = `${maxHeight}px`;
      rightContainerRef.current.style.height = `${maxHeight}px`;
      
      // 최소 높이도 설정 - resize 속성이 none이므로 필요
      leftContainerRef.current.style.minHeight = `${maxHeight}px`;
      rightContainerRef.current.style.minHeight = `${maxHeight}px`;
    }
  };
  
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

  // 초기 마운트와 segment 변경시에만 높이 동기화 (중복 호출 방지)
  useEffect(() => {
    // 컴포넌트 마운트 후 한 번만 실행
    syncHeights();
    
    // 리사이즈 이벤트에도 동일한 높이 동기화 함수 사용
    window.addEventListener("resize", syncHeights);
    return () => window.removeEventListener("resize", syncHeights);
  }, []);
  
  // segment 데이터 변경 시 높이 동기화 (source나 target이 변경될 때)
  useEffect(() => {
    // 약간의 지연을 두어 React 렌더링 주기와 충돌 방지
    const timer = setTimeout(syncHeights, 10);
    return () => clearTimeout(timer);
  }, [liveSegment.source, liveSegment.target]);

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
    
    // 비동기로 높이 동기화 함수 호출 (상태 업데이트 후 DOM에 적용된 후 실행)
    requestAnimationFrame(syncHeights);

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
        <div className="flex items-stretch gap-x-2">
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

          {/* 번역문 입력 영역 - min-height로 부모 컨테이너에 높이 지정하고 자식은 h-full 사용 */}
          <div ref={rightContainerRef} className="relative min-h-[120px] bg-transparent flex items-stretch flex-1">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={handleTextareaChange}
              className="w-full h-full flex-1 font-mono resize-none border-none outline-none focus:ring-0 focus-visible:ring-0 shadow-none bg-transparent overflow-hidden no-scrollbar pt-[2px] pb-[28px] text-sm leading-relaxed"
              style={{
                lineHeight: "1.6",
                overflow: "hidden", 
                boxShadow: "none",
                outline: "none",
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
        <div className="flex items-stretch gap-x-2">
          {/* 원문 왼쪽에는 세그먼트 번호 유지 - 위쪽 정렬 */}
          <div className="flex items-start justify-end w-6 text-xs text-gray-500 pr-1 font-mono pt-[4px] h-full">
            {index}
          </div>

          {/* 원문 텍스트 - min-height로 부모 컨테이너에 높이 지정하고 자식은 h-full 사용 */}
          <div ref={leftContainerRef} className="relative min-h-[120px] bg-transparent flex items-stretch flex-1">
            <Textarea
              ref={sourceTextareaRef}
              value={liveSegment.source || ""}
              readOnly
              className="w-full h-full flex-1 font-mono resize-none border-none outline-none focus:ring-0 focus-visible:ring-0 shadow-none bg-transparent overflow-hidden no-scrollbar pt-[2px] text-sm leading-relaxed"
              style={{
                lineHeight: "1.6",
                overflow: "hidden",
                boxShadow: "none",
                outline: "none",
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
