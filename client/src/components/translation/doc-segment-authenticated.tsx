import React, { useRef, useEffect, useLayoutEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  X,
  MessageCircle,
  FileEdit,
  CircuitBoard,
  CircleSlash,
  CircleCheck,
  UserCheck,
  Circle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { TranslationUnit, StatusType, OriginType } from "@/types";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

// 인증 문제를 해결한 DocSegment 컴포넌트 수정 버전
// 모든 fetch 호출을 apiRequest로 교체하여 인증 요청 지원

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
  onToggleStatus?: () => void; // 상태 토글 콜백 추가
  className?: string;
  isDocumentMode?: boolean; // 문서 모드 여부
  showStatusInEditor?: boolean; // 편집 중에만 상태 표시 (문서 모드에서)
}

export function DocSegment({
  segment,
  isSource,
  isEditing,
  editedValue = "",
  onEditValueChange,
  onSelectForEditing,
  onSave,
  onCancel,
  onUpdate,
  onToggleStatus,
  className,
  isDocumentMode = false, // 기본값은 false
  showStatusInEditor = false, // 기본값은 false
}: DocSegmentProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Local status state - moved outside of conditional rendering
  const [localStatus, setLocalStatus] = useState(segment.status);
  
  // Keep local state in sync with props - moved outside conditional
  useEffect(() => {
    setLocalStatus(segment.status);
  }, [segment.status]);

  // 상태 토글 기능 추가
  const toggleStatus = () => {
    if (!isSource && onUpdate) {
      // Reviewed와 현재 상태 간 토글
      const newStatus = segment.status === "Reviewed" ? "Edited" : "Reviewed";

      // MT, 100%, Fuzzy일 경우 origin도 HT로 변경
      const needsOriginChange =
        segment.origin === "MT" ||
        segment.origin === "100%" ||
        segment.origin === "Fuzzy";
      const newOrigin =
        newStatus === "Reviewed" && needsOriginChange ? "HT" : segment.origin;

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
          textarea.style.height = "auto";
          textarea.style.height = `${textarea.scrollHeight}px`;
        }
      };

      // 초기 로드 시 높이 조절
      adjustHeight();

      // 윈도우 리사이즈 시 높이 재조정
      window.addEventListener("resize", adjustHeight);
      return () => window.removeEventListener("resize", adjustHeight);
    }
  }, [isEditing, editedValue]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Save on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && onSave) {
      e.preventDefault();
      onSave();
    }

    // Cancel on Escape
    if (e.key === "Escape" && onCancel) {
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
            className,
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
            {/* Text area with auto-height adjustment and controls at bottom right */}
            <div className="relative bg-accent/20 shadow-sm rounded-md">
              <Textarea
                ref={textareaRef}
                value={editedValue}
                onChange={(e) => {
                  const newValue = e.target.value;
                  // Update UI state
                  onEditValueChange?.(newValue);

                  // Automatic status update logic
                  if (onUpdate) {
                    const isValueChanged = newValue !== segment.target;

                    if (isValueChanged) {
                      const needsOriginChange =
                        segment.origin === "MT" ||
                        segment.origin === "100%" ||
                        segment.origin === "Fuzzy";
                      const newOrigin = needsOriginChange
                        ? "HT"
                        : segment.origin;

                      // Change status to Edited if needed
                      let newStatus = localStatus;
                      if (localStatus === "Reviewed") {
                        newStatus = "Edited";
                        // Update local state to reflect change
                        setLocalStatus("Edited");
                      } else if (
                        localStatus === "MT" ||
                        localStatus === "100%" ||
                        localStatus === "Fuzzy"
                      ) {
                        newStatus = "Edited";
                        // Update local state to reflect change
                        setLocalStatus("Edited");
                      }

                      // Update through parent component
                      onUpdate(newValue, newStatus, newOrigin);
                    }
                  }
                }}
                onKeyDown={handleKeyDown}
                className="w-full p-2 pb-10 resize-none border-0 shadow-none bg-transparent font-serif text-base"
                placeholder="Enter translation..."
                autoFocus
                style={{
                  height: "auto",
                  minHeight: "80px",
                  overflow: "hidden",
                }}
              />
              {/* Status Badge and Controls Bar - now at the bottom right */}
              <div className="absolute bottom-2 right-2 flex items-center gap-2 z-10">
                {/* Clickable Status Badge */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={localStatus === "Reviewed" ? "default" : "outline"}
                      className={cn(
                        "text-xs cursor-pointer transition-colors",
                        localStatus === "Reviewed"
                          ? "bg-green-600 hover:bg-green-700"
                          : "border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30",
                        localStatus === "Rejected"
                          ? "border-red-500 text-red-500"
                          : ""
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        
                        // Toggle status
                        const newStatus = localStatus === "Reviewed" ? "Edited" : "Reviewed";
                        
                        // Update local state immediately for UI
                        setLocalStatus(newStatus);
                        
                        // Check if origin needs to change
                        const needsOriginChange = 
                          editedValue !== segment.target &&
                          (segment.origin === "MT" || segment.origin === "100%" || segment.origin === "Fuzzy");
                        const newOrigin = needsOriginChange ? "HT" : segment.origin;
                        
                        // Optimistic UI update through parent
                        onUpdate?.(
                          editedValue,
                          newStatus,
                          newOrigin,
                        );
                        
                        // Background server update
                        const updateSegmentStatus = async () => {
                          try {
                            const response = await apiRequest(
                              "PATCH",
                              `/api/segments/${segment.id}`,
                              {
                                target: editedValue,
                                status: newStatus,
                                origin: newOrigin,
                              },
                            );
                            
                            if (!response.ok) {
                              throw new Error(`Server responded with status: ${response.status}`);
                            }
                            
                            const updatedSegment = await response.json();
                            console.log("Status toggled to", newStatus, updatedSegment);
                            
                            // 중요: 여기에서 queryClient를 사용하여 segments 쿼리를 무효화
                            // 이렇게 하면 UI가 자동으로 새로운 데이터로 업데이트됨
                            import('@/lib/queryClient').then(module => {
                              const { queryClient } = module;
                              // 쿼리 무효화 - 모든 세그먼트 관련 쿼리 갱신
                              queryClient.invalidateQueries({ queryKey: ["segments"] });
                            });
                            
                            // Final update with server data
                            if (onUpdate) {
                              onUpdate(
                                String(updatedSegment.target || editedValue),
                                updatedSegment.status,
                                updatedSegment.origin
                              );
                            }
                            
                            // Don't auto-close the editor when changing status (let user decide when to close)
                            // Status change is just a toggle, editor stays open
                          } catch (error) {
                            console.error("Failed to toggle segment status:", error);
                            // Revert on error
                            setLocalStatus(segment.status);
                            onUpdate?.(
                              segment.target || "",
                              segment.status,
                              segment.origin,
                            );
                          }
                        };
                        
                        updateSegmentStatus();
                      }}
                    >
                      {localStatus || "Draft"}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to toggle between Edited and Reviewed</p>
                  </TooltipContent>
                </Tooltip>
                
                {/* Close Button - Now saves current state and closes */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 rounded-full hover:bg-muted"
                      onClick={(e) => {
                        e.stopPropagation();
                        
                        // 수정된 동작: 현재 텍스트와 상태 저장하고 닫기
                        const isTextChanged = editedValue !== segment.target;

                        if (isTextChanged) {
                          // 텍스트 변경이 있으면 현재 상태와 함께 저장
                          onUpdate?.(editedValue, localStatus, segment.origin);
                        }
                        
                        // 편집기 닫기
                        onCancel?.();
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Save changes and close editor</p>
                  </TooltipContent>
                </Tooltip>
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
            className="relative inline group"
            data-segment-id={segment.id}
            data-status={segment.status}
            data-origin={segment.origin}
          >
            <span
              className={cn(
                "font-serif text-base inline cursor-text",
                "selection:bg-blue-100 dark:selection:bg-blue-900",
                !hasTranslation && "text-muted-foreground italic",
                hasTranslation &&
                  segment.status === "Reviewed" &&
                  "text-green-700 dark:text-green-400",
                hasTranslation &&
                  segment.status === "Rejected" &&
                  "text-red-700 dark:text-red-400",
                className,
              )}
              onClick={onSelectForEditing}
            >
              {segment.target || "Click to add translation"}
            </span>

            {/* 버튼 제거 */}
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
            hasTranslation &&
              segment.status === "Reviewed" &&
              "text-green-700 dark:text-green-400",
            hasTranslation &&
              segment.status === "Rejected" &&
              "text-red-700 dark:text-red-400",
            className,
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

  // Standard mode (table or editor) display
  if (isEditing) {
    return (
      <div className={cn("relative space-y-1", className)}>
        {/* 상태 표시 뱃지 - 있는 경우에만 표시 */}
        {showStatusInEditor && (
          <div className="flex items-center">
            <Badge
              variant={segment.status === "Reviewed" ? "default" : "outline"}
              className={cn(
                "text-xs font-normal h-5",
                segment.status === "Reviewed"
                  ? "bg-green-600/80 hover:bg-green-600/90"
                  : "",
                segment.status === "Rejected"
                  ? "border-red-500 text-red-500"
                  : "",
              )}
            >
              {segment.status || "Draft"}
            </Badge>
          </div>
        )}

        {isSource ? (
          <div className="font-serif text-base p-2 bg-accent/20 rounded-md">
            {segment.source}
          </div>
        ) : (
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={editedValue}
              onChange={(e) => {
                const value = e.target.value;
                onEditValueChange?.(value);

                // 자동 상태 업데이트 로직
                const isValueChanged = value !== segment.target;

                if (isValueChanged) {
                  // 상태 및 origin 결정
                  const needsOriginChange =
                    segment.origin === "MT" ||
                    segment.origin === "100%" ||
                    segment.origin === "Fuzzy";
                  const newOrigin = needsOriginChange ? "HT" : segment.origin;

                  let newStatus = segment.status;
                  if (segment.status === "Reviewed") {
                    newStatus = "Edited";
                  } else if (
                    segment.status === "MT" ||
                    segment.status === "100%" ||
                    segment.status === "Fuzzy"
                  ) {
                    newStatus = "Edited";
                  }

                  // 부모 컴포넌트의 업데이트 함수 호출 (존재하는 경우에만)
                  if (onUpdate) {
                    onUpdate(value, newStatus, newOrigin);
                  }
                }
              }}
              onKeyDown={handleKeyDown}
              className="min-h-[100px] font-serif text-base resize-none pr-8 pb-4"
              placeholder="Enter translation..."
            />

            {/* 텍스트 영역 내부에 버튼 배치 */}
            <div className="absolute bottom-0.5 right-0.5 flex gap-1">
              {/* 체크 버튼: 상태 토글 */}
              <Button
                onClick={() => {
                  // 텍스트가 수정되었으면서 MT/100%/Fuzzy였으면 origin을 HT로 변경
                  const needsOriginChange =
                    editedValue !== segment.target &&
                    (segment.origin === "MT" ||
                      segment.origin === "100%" ||
                      segment.origin === "Fuzzy");

                  // 상태 토글 계산
                  const newStatus = segment.status === "Reviewed" ? "Edited" : "Reviewed";
                  const newOrigin = needsOriginChange ? "HT" : segment.origin;
                  
                  // 즉시 UI 업데이트 (낙관적 업데이트) - 사용자에게 바로 피드백 제공
                  if (onUpdate) {
                    onUpdate(
                      editedValue,
                      newStatus,
                      newOrigin
                    );
                  }

                  // 백그라운드에서 서버에 업데이트
                  const updateSegment = async () => {
                    try {
                      // 인증된 API 요청으로 서버에 업데이트
                      const response = await apiRequest(
                        "PATCH",
                        `/api/segments/${segment.id}`,
                        {
                          target: editedValue, 
                          status: newStatus,
                          origin: newOrigin,
                        },
                      );

                      // 응답이 성공적이면 서버에서 반환된 최종 데이터로 업데이트
                      if (response.ok) {
                        const updatedSegment = await response.json();
                        console.log(
                          "Status toggled to",
                          newStatus,
                          updatedSegment,
                        );
                        if (onUpdate) {
                          onUpdate(
                            String(updatedSegment.target || ""),
                            updatedSegment.status,
                            updatedSegment.origin
                          );
                        }
                        onSave?.(); // 편집 모드 종료
                      } else {
                        throw new Error(`Server responded with status: ${response.status}`);
                      }
                    } catch (error) {
                      console.error(
                        "Failed to save segment with status change:",
                        error,
                      );
                      // 오류 발생 시 원래 상태로 복원
                      onUpdate?.(
                        segment.target || "",
                        segment.status,
                        segment.origin,
                      );
                    }
                  };

                  updateSegment();
                }}
                size="sm"
                variant={segment.status === "Reviewed" ? "default" : "outline"}
                className={cn(
                  "h-7 w-7 p-0 rounded-full transition-colors duration-200",
                  segment.status === "Reviewed"
                    ? "bg-green-600 hover:bg-green-700"
                    : "hover:bg-green-100 dark:hover:bg-green-900/30",
                )}
              >
                <Check
                  className={cn(
                    "h-4 w-4 transition-colors duration-200",
                    segment.status === "Reviewed"
                      ? "text-white"
                      : "text-green-600",
                  )}
                />
              </Button>

              {/* X 버튼: 취소 */}
              <Button
                onClick={onCancel}
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0 rounded-full"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  } else {
    // 표준 보기 모드 (표시만)
    return (
      <div className={cn("space-y-1", className)}>
        {isSource ? (
          <div className="font-serif text-base p-2 bg-accent/20 rounded-md">
            {segment.source}
          </div>
        ) : (
          <div
            className={cn(
              "p-2 rounded-md border cursor-pointer font-serif text-base group relative",
              segment.status === "Reviewed"
                ? "bg-green-50 dark:bg-green-950/10 border-green-200 dark:border-green-900"
                : "bg-muted/20 border-border/50",
              !segment.target && "text-muted-foreground italic",
            )}
            onClick={onSelectForEditing}
          >
            <div className="flex justify-between">
              <div>{segment.target || "Click to add translation"}</div>

              {/* 호버 시 표시되는 액션 버튼들 */}
              {segment.target && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 absolute top-1 right-1">
                  {/* 상태 토글 버튼 */}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation(); // 부모 클릭 이벤트 방지

                      // 부모로부터 전달된 토글 함수 있으면 사용
                      if (onToggleStatus) {
                        onToggleStatus();
                      } else {
                        // 상태 변경 계산
                        const newStatus = segment.status === "Reviewed" ? "Edited" : "Reviewed";
                        const needsOriginChange =
                          segment.origin === "MT" ||
                          segment.origin === "100%" ||
                          segment.origin === "Fuzzy";
                        const newOrigin =
                          newStatus === "Reviewed" && needsOriginChange
                            ? "HT"
                            : segment.origin;
                        
                        // 즉시 UI 업데이트 (낙관적 업데이트) - 사용자에게 바로 피드백 제공
                        if (onUpdate) {
                          onUpdate(
                            String(segment.target || ""), 
                            newStatus,
                            newOrigin
                          );
                        }

                        // 백그라운드에서 서버에 업데이트
                        const updateStatus = async () => {
                          try {
                            // 인증된 API 요청으로 서버에 업데이트
                            const response = await apiRequest(
                              "PATCH",
                              `/api/segments/${segment.id}`,
                              {
                                target: segment.target,
                                status: newStatus,
                                origin: newOrigin,
                              },
                            );

                            // 응답 확인 및 에러 처리 추가
                            if (!response.ok) {
                              throw new Error(
                                `Server responded with status: ${response.status}`,
                              );
                            }

                            const updatedSegment = await response.json();

                            // 서버에서 반환된 최종 데이터로 UI 다시 업데이트
                            if (onUpdate) {
                              onUpdate(
                                String(updatedSegment.target || ""),
                                updatedSegment.status,
                                updatedSegment.origin
                              );
                            }
                          } catch (error) {
                            console.error(
                              "Failed to toggle segment status:",
                              error,
                            );
                            // 오류 발생 시 원래 상태로 복원
                            if (onUpdate) {
                              onUpdate(
                                String(segment.target || ""),
                                segment.status,
                                segment.origin
                              );
                            }
                          }
                        };

                        updateStatus();
                      }
                    }}
                    size="sm"
                    variant={
                      segment.status === "Reviewed" ? "default" : "outline"
                    }
                    className={cn(
                      "h-6 w-6 p-0 rounded-full transition-colors duration-200",
                      segment.status === "Reviewed"
                        ? "bg-green-600 hover:bg-green-700"
                        : "hover:bg-green-100 dark:hover:bg-green-900/30",
                    )}
                  >
                    <Check className={cn(
                      "h-4 w-4 transition-colors duration-200", 
                      segment.status === "Reviewed" ? "text-white" : "text-green-600"
                    )} />
                  </Button>
                </div>
              )}
            </div>

            {/* Reviewed 배지 제거 */}
          </div>
        )}
      </div>
    );
  }
}
