import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useSegmentMutation } from "@/hooks/mutations/useSegmentMutation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Languages } from "lucide-react";
import { TranslationUnit } from "@/types";
import { cn } from "@/lib/utils";
import { useDebouncedCallback } from "use-debounce";

/**
 * !!! 중요 !!! 2025-05-12 개선된 세그먼트 높이 동기화 기능
 *
 * 이 코드는 원문과 번역문의 텍스트 높이를 정확히 동기화합니다.
 * 1. 세그먼트 ID를 기반으로 높이 값을 저장하고 관리
 * 2. 원문/번역문 간 동일한 높이 유지
 * 3. 텍스트가 긴 쪽에 맞춰 자동으로 높이 조정
 * 4. 이벤트 시스템을 통한 동기화
 *
 * 이 기능 수정 시 반드시 동기화 메커니즘 전체를 이해한 후에 변경하세요.
 * 잘못된 수정은 UI 깨짐과 사용자 경험 저하로 이어집니다.
 *
 * Git Tag: v1.0.1-segment-height-sync
 */

// 세그먼트 높이 저장하는 전역 맵 (세그먼트 ID → 높이)
const segmentHeightsMap = new Map<number, number>();

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
  fileId?: number; // 추가: fileId 매개변수
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
    fileId,
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

  /**
   * 세그먼트 높이를 업데이트하는 함수 - 2025-05-12 개선
   * 원문과 번역문의 높이를 계산하고 더 큰 쪽으로 일치시킴
   */
  const updateSegmentHeight = React.useCallback(() => {
    // 원문과 번역문 textarea 참조 모두 가져오기
    const sourceTextarea = sourceTextareaRef.current;
    const targetTextarea = textareaRef.current;

    // 하나라도 없으면 동기화 불가
    if (!sourceTextarea && !targetTextarea) return;

    // 두 영역 높이 초기화 (정확한 스크롤 높이 측정을 위해)
    if (sourceTextarea) sourceTextarea.style.height = "auto";
    if (targetTextarea) targetTextarea.style.height = "auto";

    // 두 영역의 스크롤 높이 계산
    const sourceHeight = sourceTextarea ? sourceTextarea.scrollHeight : 0;
    const targetHeight = targetTextarea ? targetTextarea.scrollHeight : 0;

    // 둘 중 더 큰 높이로 설정
    const maxHeight = Math.max(sourceHeight, targetHeight);

    // 두 에디터에 최종 높이 적용
    if (sourceTextarea) sourceTextarea.style.height = `${maxHeight}px`;
    if (targetTextarea) targetTextarea.style.height = `${maxHeight}px`;

    // 세그먼트 ID에 현재 높이 저장
    segmentHeightsMap.set(segment.id, maxHeight);

    // 주변 세그먼트들에게 업데이트 이벤트 발생시키기
    const event = new CustomEvent("segment-height-changed", {
      detail: { segmentId: segment.id, height: maxHeight },
    });
    window.dispatchEvent(event);
  }, [segment.id]);

  // 다른 세그먼트의 높이 변경 시 반응
  useEffect(() => {
    const handleHeightChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { segmentId, height } = customEvent.detail;

      // 현재 세그먼트의 높이 업데이트
      if (segmentId === segment.id) {
        // 원문 및 번역문 모두 높이 적용
        if (sourceTextareaRef.current) {
          sourceTextareaRef.current.style.height = `${height}px`;
        }
        if (textareaRef.current) {
          textareaRef.current.style.height = `${height}px`;
        }
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener("segment-height-changed", handleHeightChange);

    // 클린업
    return () => {
      window.removeEventListener("segment-height-changed", handleHeightChange);
    };
  }, [segment.id]);

  // 각 세그먼트 텍스트의 높이 조절
  const synchronizeHeights = React.useCallback(() => {
    requestAnimationFrame(() => {
      updateSegmentHeight();
    });
  }, [updateSegmentHeight]);

  // 텍스트 값이 변경될 때마다 높이 재계산
  useLayoutEffect(() => {
    synchronizeHeights();
  }, [value, synchronizeHeights]);

  // 컴포넌트 마운트 시 한 번 실행
  useEffect(() => {
    // 약간의 시간 간격을 두고 여러 번 높이 동기화 시도
    // 브라우저 렌더링 및 스타일 적용 후 정확한 높이 계산을 위함
    synchronizeHeights();

    const timers = [
      setTimeout(() => synchronizeHeights(), 50),
      setTimeout(() => synchronizeHeights(), 150),
      setTimeout(() => synchronizeHeights(), 300),
    ];

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
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
    if (!isSource) {
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

      // 세그먼트에서 fileId 추출
      const segmentFileId = segment.fileId;
      if (!segmentFileId && !fileId) {
        console.error("Missing fileId for segment update");
        return;
      }

      updateSegment(
        {
          id: liveSegment.id,
          target: value,
          status: newStatus,
          origin: newOrigin,
          fileId: fileId || segmentFileId,
        },
        {
          onSuccess: () => {
            if (onUpdate) {
              onUpdate(value, newStatus, newOrigin);
            }
          },
          onError: (error) => {
            console.error("Failed to update segment status:", error);
          },
        },
      );
    }
  };

  // 텍스트 변경 핸들러
  const { mutate: updateSegment } = useSegmentMutation();

  const debouncedUpdateSegment = useDebouncedCallback((updateData: any) => {
    try {
      if (!liveSegment) return;
      
      // 현재 상태 스냅샷
      const snapshot = {
        target: liveSegment.target || "",
        status: liveSegment.status || "Edited",
        origin: liveSegment.origin || "HT"
      };
      
      // fileId 검사 및 추가
      if (!updateData.fileId) {
        console.warn("fileId is missing, adding from props", { 
          segmentId: liveSegment.id,
          propFileId: fileId, 
          segmentFileId: segment.fileId 
        });
        updateData.fileId = fileId || segment.fileId;
      }
      
      // 필수 필드 모두 있는지 확인
      if (!updateData.fileId) {
        console.error("Failed to update segment: Missing fileId");
        return;
      }

      // 업데이트 실행
      updateSegment(updateData, {
        onSuccess: (response) => {
          try {
            if (onUpdate) {
              console.log('Segment update success:', response);
              // Handle both old format (direct segment) and new format (with segment property)
              const segmentData = response.segment || response;
              
              // 안전하게 호출
              const updatedTarget = segmentData.target || snapshot.target;
              const updatedStatus = segmentData.status || snapshot.status;
              const updatedOrigin = segmentData.origin || snapshot.origin;
              onUpdate(updatedTarget, updatedStatus, updatedOrigin);
            }
          } catch (e) {
            console.error("Error in onUpdate callback:", e);
          }
        },
        onError: (error) => {
          console.error("Failed to update segment:", error);
          setValue(snapshot.target);
          try {
            if (onUpdate) {
              onUpdate(snapshot.target, snapshot.status, snapshot.origin);
            }
          } catch (e) {
            console.error("Error in onUpdate error callback:", e);
          }
        }
      });
    } catch (err) {
      console.error("Error in debouncedUpdateSegment:", err);
    }
  }, 1000); // 디바운스 시간 증가

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (!isSource) {
      const isValueChanged = newValue !== liveSegment.target;
      if (!isValueChanged) return;

      const needsOriginChange = isOriginInList(
        liveSegment.origin,
        STATUS_NEED_CHANGE,
      );
      const newOrigin = needsOriginChange ? "HT" : liveSegment.origin || "HT";
      const newStatus =
        liveSegment.status === "Reviewed" ||
        isOriginInList(liveSegment.status, STATUS_NEED_CHANGE)
          ? "Edited"
          : liveSegment.status || "Edited";

      // Optimistic update
      if (onUpdate) {
        onUpdate(newValue, newStatus, newOrigin);
      }

      // 세그먼트에서 fileId 추출
      const segmentFileId = segment.fileId;
      if (!segmentFileId && !fileId) {
        console.error("Missing fileId for segment update");
        return;
      }

      debouncedUpdateSegment({
        id: liveSegment.id,
        target: newValue,
        status: newStatus,
        origin: newOrigin,
        fileId: fileId || segmentFileId,
      });
    }
  };

  // 수동 저장 함수 (필요한 경우를 위해 유지)
  const handleSave = () => {
    if (!isSource) {
      const isValueChanged = value !== liveSegment.target;
      if (!isValueChanged) return;

      const needsOriginChange = isOriginInList(
        liveSegment.origin,
        STATUS_NEED_CHANGE,
      );

      const newOrigin = needsOriginChange ? "HT" : liveSegment.origin;
      const newStatus =
        liveSegment.status === "Reviewed" ||
        isOriginInList(liveSegment.status, STATUS_NEED_CHANGE)
          ? "Edited"
          : liveSegment.status;

      // 세그먼트에서 fileId 추출
      const segmentFileId = segment.fileId;
      if (!segmentFileId && !fileId) {
        console.error("Missing fileId for segment update");
        return;
      }

      updateSegment(
        {
          id: liveSegment.id,
          target: value,
          status: newStatus,
          origin: newOrigin,
          fileId: fileId || segmentFileId,
        },
        {
          onSuccess: () => {
            if (onUpdate) {
              onUpdate(value, newStatus, newOrigin);
            }
          },
          onError: (error) => {
            console.error("Failed to update segment:", error);
            setValue(liveSegment.target || "");
          },
        },
      );
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
        return "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "Fuzzy":
        return "bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "MT":
        return "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
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
        "mb-4 w-full rounded-md px-2 py-2 transition-colors",
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
          <div ref={targetContainerRef} className="flex-grow relative">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={handleTextareaChange}
              className="w-full resize-none bg-transparent pb-8 text-sm leading-relaxed shadow-none font-mono border-none focus-visible:ring-0 focus:ring-0 overflow-hidden"
              style={{
                lineHeight: "1.6",
                minHeight: "24px",
                boxShadow: "none",
                outline: "none",
              }}
              placeholder="Enter translation..."
            />

            {/* 상태 뱃지와 번역 버튼 */}
            <div className="absolute bottom-1 right-1 z-[5]">
              <button
                type="button"
                className={`cursor-pointer rounded-full px-2 py-0.5 text-xs font-medium transition ${getStatusColor(liveSegment.status)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (liveSegment.status === "Rejected") return;
                  toggleStatus();
                }}
                title={`Click to toggle status (${liveSegment.status === "Reviewed" ? "Edited" : "Reviewed"})`}
              >
                {liveSegment.status}
              </button>

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
          <div ref={sourceContainerRef} className="flex-grow overflow-hidden">
            <Textarea
              ref={sourceTextareaRef}
              value={liveSegment.source || ""}
              readOnly
              className="resize-none overflow-hidden bg-transparent text-sm font-mono leading-relaxed text-foreground shadow-none outline-none w-full h-auto min-h-[24px] border-none focus-visible:ring-0 focus:ring-0"
              style={{
                lineHeight: "1.6",
                boxShadow: "none",
                outline: "none",
              }}
              placeholder="No source text"
            />
          </div>
        </div>
      )}
    </div>
  );
}