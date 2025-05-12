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
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

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
  
  // React Query Mutation 설정
  const updateSegmentMutation = useMutation({
    mutationFn: (data: { id: number, target: string, status: string, origin: string | null | undefined }) => 
      apiRequest("PATCH", `/api/segments/${data.id}`, {
        target: data.target,
        status: data.status,
        origin: data.origin || null
      }),
    onSuccess: () => {
      // 성공 시 segments 쿼리 캐시 무효화 (UI 갱신)
      queryClient.invalidateQueries({ queryKey: ["segments"] });
    },
    onError: (error) => {
      console.error("Failed to update segment:", error);
      // 오류 시 이전 상태로 복원 (UI 롤백)
      setLocalStatus(segment.status);
    }
  });
  
  // Keep local state in sync with props - moved outside conditional
  useEffect(() => {
    setLocalStatus(segment.status);
  }, [segment.status]);

  // 상태 토글 기능 추가 - React Query 사용으로 변경
  const toggleStatus = () => {
    if (!isSource) {
      // Reviewed와 현재 상태 간 토글
      const newStatus = segment.status === "Reviewed" ? "Edited" : "Reviewed";

      // MT, 100%, Fuzzy일 경우 origin도 HT로 변경
      const needsOriginChange =
        segment.origin === "MT" ||
        segment.origin === "100%" ||
        segment.origin === "Fuzzy";
      const newOrigin =
        newStatus === "Reviewed" && needsOriginChange ? "HT" : segment.origin;

      // UI 즉시 업데이트 (낙관적 UI 업데이트)
      setLocalStatus(newStatus);
      
      // mutation 호출하여 서버에 업데이트
      updateSegmentMutation.mutate({
        id: segment.id,
        target: editedValue || "",
        status: newStatus,
        origin: newOrigin
      });
      
      // 원래 onUpdate 호출은 제거 (이제 불필요)
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

                  // 텍스트가 변경될 때마다 실행: 상태 자동 변경
                  const isValueChanged = newValue !== segment.target;
                  if (isValueChanged) {
                    // 먼저 상태 변경 검사 및 업데이트
                    // Reviewed 또는 MT/100%/Fuzzy 상태인 경우 Edited로 변경
                    if (
                      localStatus === "Reviewed" || 
                      localStatus === "MT" || 
                      localStatus === "100%" || 
                      localStatus === "Fuzzy"
                    ) {
                      console.log("텍스트 편집으로 상태 자동 변경:", localStatus, "→ Edited");
                      setLocalStatus("Edited");
                      
                      // 원본이 MT, 100%, Fuzzy인 경우에만 origin 변경 필요
                      const needsOriginChange =
                        segment.origin === "MT" ||
                        segment.origin === "100%" ||
                        segment.origin === "Fuzzy";
                      const newOrigin = needsOriginChange ? "HT" : segment.origin;

                      // React Query Mutation 사용하여 API 호출 + 캐시 업데이트
                      // 텍스트 변경 시에는 디바운스 적용 (하단 주석 참고)
                      // debouncedMutation(segment.id, newValue, "Edited", newOrigin || "");
                      
                      // 여기서는 debounce는 구현하지 않고 기존 onUpdate 사용
                      // 파일 전체를 한꺼번에 리팩토링하면 복잡해지므로 
                      // 핵심 기능인 닫기/토글 버튼만 mutation으로 교체
                      if (onUpdate) {
                        onUpdate(newValue, "Edited", newOrigin);
                      }
                    } else {
                      // 이미 Edited 상태인 경우 상태 변경 없이 내용만 업데이트
                      if (onUpdate) {
                        onUpdate(newValue, localStatus, segment.origin);
                      }
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
                        
                        // 상태 배지 클릭 - 수정사항:
                        // 1. 텍스트 변경은 저장하지 않고 
                        // 2. 상태만 토글하며
                        // 3. 편집기는 닫지 않음
                        
                        // Toggle status (Reviewed <-> Edited)
                        const newStatus = localStatus === "Reviewed" ? "Edited" : "Reviewed";
                        
                        // Update local state immediately for UI (낙관적 업데이트)
                        setLocalStatus(newStatus);
                        
                        // 원본이 MT, 100%, Fuzzy인 경우에만 origin 변경 필요
                        const needsOriginChange = 
                          (segment.origin === "MT" || segment.origin === "100%" || segment.origin === "Fuzzy");
                        const newOrigin = (newStatus === "Reviewed" && needsOriginChange) ? "HT" : segment.origin;
                        
                        // 중요: 텍스트(target) 값으로 현재 editedValue가 아닌 
                        // 원래 segment.target 값을 사용 (문서 요구사항)
                        // React Query Mutation 사용하여 API 호출 + 캐시 업데이트
                        updateSegmentMutation.mutate({
                          id: segment.id,
                          target: segment.target || "", // 텍스트 변경 없음, 상태만 변경
                          status: newStatus,
                          origin: newOrigin || ""
                        });
                        
                        console.log("Status toggled to", newStatus);
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
                        
                        // 수정된 동작: 항상 현재 텍스트(editedValue, 사용자가 수정 중인 최신 텍스트)와 
                        // 상태(localStatus)를 함께 저장하고 닫기
                        const isTextChanged = editedValue !== segment.target;
                        const isStatusChanged = localStatus !== segment.status;
                        
                        // 문서에 따른 수정: 텍스트 변경 또는 상태 변경이 있는 경우에 저장 진행
                        if (isTextChanged || isStatusChanged) {
                          // 수정된 부분: origin 변경 필요 여부 확인
                          const needsOriginChange = 
                            isTextChanged && 
                            (segment.origin === "MT" || segment.origin === "100%" || segment.origin === "Fuzzy");
                          
                          const newOrigin = needsOriginChange ? "HT" : segment.origin;
                          
                          // React Query Mutation 사용하여 직접 API 호출 + 캐시 업데이트
                          updateSegmentMutation.mutate({
                            id: segment.id,
                            target: editedValue || "",
                            status: localStatus,
                            origin: newOrigin || ""
                          });
                          
                          console.log("닫기 버튼으로 저장:", {
                            text: editedValue, 
                            status: localStatus, 
                            origin: newOrigin,
                            textChanged: isTextChanged,
                            statusChanged: isStatusChanged
                          });
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
                // 상태에 따른 텍스트 색상 변경 제거 (Reviewed 상태일 때 초록색 제거)
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
            // 상태에 따른 텍스트 색상 변경 제거 (Reviewed 상태일 때 초록색 제거)
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
                  ? "bg-green-600"
                  : "border-blue-500 text-blue-600",
                segment.status === "Rejected" && "border-red-500 text-red-500"
              )}
            >
              {segment.status || "Draft"}
            </Badge>
          </div>
        )}

        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={editedValue}
            onChange={(e) => {
              const value = e.target.value;
              onEditValueChange?.(value);

              // 자동 상태 업데이트 로직
              const isValueChanged = value !== segment.target;
              if (isValueChanged && onUpdate) {
                const needsOriginChange =
                  segment.origin === "MT" ||
                  segment.origin === "100%" ||
                  segment.origin === "Fuzzy";
                const newOrigin = needsOriginChange ? "HT" : segment.origin;

                // 편집 시 상태 변경
                let newStatus = localStatus;
                if (localStatus === "Reviewed") {
                  newStatus = "Edited";
                  setLocalStatus("Edited");
                } else if (
                  localStatus === "MT" ||
                  localStatus === "100%" ||
                  localStatus === "Fuzzy"
                ) {
                  newStatus = "Edited";
                  setLocalStatus("Edited");
                }

                onUpdate(value, newStatus, newOrigin);
              }
            }}
            onKeyDown={handleKeyDown}
            className="min-h-[80px] w-full border-muted resize-none font-serif text-base"
            placeholder="Enter translation..."
          />
        </div>

        <div className="flex justify-end items-center gap-2">
          <Button
            onClick={onCancel}
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            size="sm"
            className="h-7 px-2 text-xs"
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  // 읽기 전용 모드 (편집 중이 아닐 때)
  return (
    <div
      className={cn(
        "p-2 rounded hover:bg-muted/20 transition-colors cursor-text",
        className
      )}
      onClick={onSelectForEditing}
    >
      <span className="font-serif text-base">
        {isSource ? segment.source : segment.target || <span className="italic text-muted-foreground">Click to add translation</span>}
      </span>
    </div>
  );
}