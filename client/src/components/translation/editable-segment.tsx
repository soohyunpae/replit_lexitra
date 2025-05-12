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
  const STATUS_NEED_CHANGE = ["MT", " " + "100%", "Fuzzy"];

  // 세그먼트 현재 상태값 로컬 변수 사용
  const liveSegment = segment;

  // 편집중인 텍스트 값 관리
  const [value, setValue] = useState(
    isSource ? liveSegment.source : liveSegment.target || "",
  );

  // 텍스트 영역과 컨테이너 ref
  const textareaRef = useRef<HTMLTextAreaElement>(null); // 번역문(target) textarea
  const sourceTextareaRef = useRef<HTMLTextAreaElement>(null); // 원문(source) textarea
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

  // 텍스트 영역 자동 높이 조절 함수
  const synchronizeHeights = React.useCallback(() => {
    requestAnimationFrame(() => {
      // 두 텍스트 영역 참조 가져오기
      const targetTextarea = textareaRef.current;
      const sourceTextarea = sourceTextareaRef.current;
      
      // 두 텍스트 영역 중 하나라도 없으면 종료
      if (!targetTextarea && !sourceTextarea) return;
      
      // 높이 측정을 위해 임시로 'auto'로 설정
      if (targetTextarea) targetTextarea.style.height = 'auto';
      if (sourceTextarea) sourceTextarea.style.height = 'auto';
      
      // 스크롤 높이 계산
      const targetHeight = targetTextarea ? Math.max(targetTextarea.scrollHeight, 40) : 0;
      const sourceHeight = sourceTextarea ? Math.max(sourceTextarea.scrollHeight, 40) : 0;
      
      // 더 큰 높이를 구함 (최소 40px)
      const maxHeight = Math.max(targetHeight, sourceHeight, 40);
      
      // 두 텍스트 영역의 높이를 동일하게 설정
      if (targetTextarea) targetTextarea.style.height = `${maxHeight}px`;
      if (sourceTextarea) sourceTextarea.style.height = `${maxHeight}px`;
    });
  }, []);

  // 텍스트 값이 변경될 때마다 높이 재계산
  useLayoutEffect(() => {
    synchronizeHeights();
  }, [value, synchronizeHeights]);
  
  // 컴포넌트 마운트 시 한 번 실행
  useEffect(() => {
    synchronizeHeights();
  }, [synchronizeHeights]);

  // 창 크기 변경시 높이 동기화
  useEffect(() => {
    // 윈도우 리사이즈 이벤트 핸들러
    const handleResize = () => {
      synchronizeHeights();
    };
    
    // 윈도우 리사이즈 이벤트 리스너 추가
    window.addEventListener("resize", handleResize);
    
    // 클린업 - 컴포넌트 언마운트 시 리스너 제거
    return () => window.removeEventListener("resize", handleResize);
  }, [synchronizeHeights]);

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
        liveSegment.status === "Reviewed"
          ? "bg-blue-50 dark:bg-blue-950/30"
          : isSelected
            ? "bg-accent/90"
            : "bg-card",
        !isSource &&
          !liveSegment.target &&
          "border border-dashed border-yellow-400",
      )}
      onClick={onSelect}
    >
      {!isSource ? (
        <div className="flex items-start gap-x-2">
          {/* 번역문 왼쪽은 체크박스만 배치 */}
          <div className="flex-shrink-0 w-6 pt-1">
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
            className="flex-grow relative"
          >
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={handleTextareaChange}
              className="w-full resize-none bg-transparent pt-[2px] pb-8 text-sm leading-relaxed shadow-none font-mono border-none focus-visible:ring-0 focus:ring-0 overflow-hidden"
              style={{
                lineHeight: "1.6",
                boxShadow: "none",
                outline: "none",
                transition: "none"
              }}
              placeholder="Enter translation..."
            />

            {/* 상태 뱃지와 번역 버튼 */}
            <div className="absolute bottom-1 right-1 z-10">
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
        <div className="flex items-start gap-x-2">
          {/* 원문 왼쪽에는 세그먼트 번호 */}
          <div className="flex-shrink-0 w-6 text-right pt-1 font-mono text-xs text-gray-500">
            {index}
          </div>

          {/* 원문 텍스트 표시 영역 */}
          <div
            ref={sourceContainerRef}
            className="flex-grow overflow-hidden"
          >
            <Textarea
              ref={sourceTextareaRef}
              value={liveSegment.source || ""}
              readOnly
              className="resize-none overflow-hidden bg-transparent pt-[2px] text-sm font-mono leading-relaxed text-foreground shadow-none outline-none w-full h-auto min-h-[40px] border-none focus-visible:ring-0 focus:ring-0"
              style={{
                lineHeight: "1.6",
                boxShadow: "none",
                outline: "none",
                transition: "none",
              }}
              placeholder="No source text"
            />
          </div>
        </div>
      )}
    </div>
  );
}
