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
  
  // 텍스트 영역과 컨테이너 ref
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  
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
  
  // 크기 동기화를 위한 useLayoutEffect
  useLayoutEffect(() => {
    requestAnimationFrame(() => {
      if (textareaRef.current && leftRef.current && rightRef.current) {
        // Reset current heights to auto
        textareaRef.current.style.height = "auto";
        leftRef.current.style.height = "auto";
        rightRef.current.style.height = "auto";
        
        // Get scroll heights
        const tHeight = textareaRef.current.scrollHeight;
        const sHeight = leftRef.current.scrollHeight;
        const maxHeight = Math.max(tHeight, sHeight, 120);
        
        // Apply max height to both sides
        textareaRef.current.style.height = `${maxHeight}px`;
        leftRef.current.style.height = `${maxHeight}px`;
        rightRef.current.style.height = `${maxHeight}px`;
      }
    });
  }, [value, liveSegment.source]);
  
  // 창 크기 변경시 높이 동기화
  useEffect(() => {
    const handleResize = () => {
      requestAnimationFrame(() => {
        if (textareaRef.current && leftRef.current && rightRef.current) {
          // Reset current heights to auto
          textareaRef.current.style.height = "auto";
          leftRef.current.style.height = "auto";
          rightRef.current.style.height = "auto";
          
          // Get scroll heights
          const tHeight = textareaRef.current.scrollHeight;
          const sHeight = leftRef.current.scrollHeight;
          const maxHeight = Math.max(tHeight, sHeight, 120);
          
          // Apply max height to both sides
          textareaRef.current.style.height = `${maxHeight}px`;
          leftRef.current.style.height = `${maxHeight}px`;
          rightRef.current.style.height = `${maxHeight}px`;
        }
      });
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  // 세그먼트 번호 표시
  const segmentNumber = (
    <div className="flex h-full w-6 items-start justify-end pr-1 pt-[4px] font-mono text-xs text-gray-500">
      {index}
    </div>
  );
  
  // 체크박스 컴포넌트
  const checkboxComponent = onCheckChange && (
    <div className="flex h-full w-6 items-start justify-end pt-[4px]" onClick={handleCheckboxClick}>
      <Checkbox
        checked={isChecked}
        onCheckedChange={onCheckChange}
        className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
      />
    </div>
  );
  
  // 상태 배지
  const statusBadge = (
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
  );
  
  // 기계 번역 버튼
  const mtButton = !liveSegment.target && onTranslateWithGPT && (
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
  );
  
  // 컨트롤 그룹
  const controls = (
    <div className="absolute bottom-1 right-2 flex items-center gap-2 text-xs">
      {statusBadge}
      {mtButton}
      {badge}
      {checkbox}
    </div>
  );

  return (
    <div
      className={cn(
        "relative flex w-full gap-4 rounded-md p-3 transition-colors",
        isSelected ? "bg-muted" : "bg-background",
        liveSegment.status === "Reviewed" && "bg-blue-50 dark:bg-blue-950/30", 
        !isSource && !liveSegment.target && "border border-dashed border-yellow-400"
      )}
      onClick={onSelect}
    >
      {/* 왼쪽 세그먼트 영역 - 원문 */}
      <div
        ref={leftRef}
        className="w-1/2 whitespace-pre-wrap font-light leading-relaxed overflow-hidden"
      >
        {isSource ? segmentNumber : checkboxComponent}
        {liveSegment.source}
      </div>
      
      {/* 오른쪽 세그먼트 영역 - 번역문 */}
      <div ref={rightRef} className="relative w-1/2 overflow-hidden">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="h-auto min-h-[40px] w-full resize-none overflow-hidden bg-transparent px-0 py-1 text-base leading-relaxed text-foreground shadow-none focus-visible:ring-0"
          readOnly={isSource}
          placeholder={isSource ? "No source text" : "Enter translation..."}
        />
        {controls}
      </div>
    </div>
  );
}
