import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, MessageCircle, FileEdit, CircuitBoard, CircleSlash, UserCheck, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { TranslationUnit, StatusType, OriginType } from '@/types';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';

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
  editedValue = '',
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
  
  // 상태 토글 기능 추가
  const toggleStatus = () => {
    if (!isSource && onUpdate) {
      // Reviewed와 현재 상태 간 토글
      const newStatus = segment.status === "Reviewed" ? "Edited" : "Reviewed";
      
      // MT, 100%, Fuzzy일 경우 origin도 HT로 변경
      const needsOriginChange = (segment.origin === "MT" || segment.origin === "100%" || segment.origin === "Fuzzy");
      const newOrigin = (newStatus === "Reviewed" && needsOriginChange) ? "HT" : segment.origin;
      
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
          textarea.style.height = 'auto';
          textarea.style.height = `${textarea.scrollHeight}px`;
        }
      };
      
      // 초기 로드 시 높이 조절
      adjustHeight();
      
      // 윈도우 리사이즈 시 높이 재조정
      window.addEventListener('resize', adjustHeight);
      return () => window.removeEventListener('resize', adjustHeight);
    }
  }, [isEditing, editedValue]);
  
  // Handle keyboard shortcuts
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
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
  }, [onSave, onCancel]);

  // Memoize the status check to prevent unnecessary re-renders
  const isReviewed = React.useMemo(() => segment.status === 'Reviewed', [segment.status]);
  
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
            className
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
            {/* 불필요한 상태 뱃지 제거 - 푸터 영역에 통합 */}
            
            {/* 문서 모드에서 텍스트 영역 - 자동 높이 조절 */}
            <div className="relative bg-accent/20 shadow-sm rounded-md">
              <Textarea
                ref={textareaRef}
                value={editedValue}
                onChange={(e) => {
                  const newValue = e.target.value;
                  onEditValueChange?.(newValue);
                  
                  // 자동 상태 업데이트 - 편집할 때 segment.target과 다르면 상태 업데이트
                  if (onUpdate) {
                    const isValueChanged = newValue !== segment.target;
                    const needsOriginChange = segment.origin === "MT" || segment.origin === "100%" || segment.origin === "Fuzzy";
                    const newOrigin = isValueChanged && needsOriginChange ? "HT" : segment.origin;
                    
                    // 이미 Reviewed였는데 편집하면 Edited로 변경, MT/100%/Fuzzy였는데 편집하면 Edited로 변경
                    let newStatus = segment.status;
                    if (isValueChanged) {
                      if (segment.status === "Reviewed") {
                        newStatus = "Edited";
                      } else if (segment.status === "MT" || segment.status === "100%" || segment.status === "Fuzzy") {
                        newStatus = "Edited";
                      }
                      
                      onUpdate(newValue, newStatus, newOrigin);
                    }
                  }
                }}
                onKeyDown={handleKeyDown}
                className="w-full p-2 pt-2 pb-12 resize-none border-0 shadow-none bg-transparent font-serif text-base"
                placeholder="Enter translation..."
                autoFocus
                style={{ height: 'auto', minHeight: '80px', overflow: 'hidden' }}
              />
              
              {/* 텍스트 영역 내부 하단에 버튼 푸터 영역 배치 */}
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-muted/20 border-t border-border/30 flex items-center justify-between px-2">
                {/* 왼쪽에 상태 뱃지 */}
                <div className="flex items-center">
                  <Badge variant={editedValue !== segment.target ? "outline" : segment.status === 'Reviewed' ? "default" : "outline"}
                    className={cn(
                      "text-xs font-normal h-5",
                      editedValue !== segment.target ? "border-blue-500 text-blue-500" : "",
                      editedValue === segment.target && segment.status === 'Reviewed' ? "bg-green-600/80 hover:bg-green-600/90" : "",
                      editedValue === segment.target && segment.status === 'Rejected' ? "border-red-500 text-red-500" : ""
                    )}
                  >
                    {editedValue !== segment.target ? 'Edited' : segment.status || 'Draft'}
                  </Badge>
                </div>
                
                {/* 오른쪽에 버튼들 */}
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      // X 버튼 클릭 시 항상 현재 내용을 저장하고 창 닫기 (수정 여부 관계없이)
                      const saveAndClose = async () => {
                        try {
                          // 텍스트 수정 여부 확인
                          const isTextChanged = editedValue !== segment.target;
                          
                          // MT, 100%, Fuzzy에서 수정했을 경우 origin 변경
                          const needsOriginChange = isTextChanged && 
                            (segment.origin === "MT" || segment.origin === "100%" || segment.origin === "Fuzzy");
                          
                          // 이미 Reviewed였는데 수정했을 경우 Edited로 변경
                          let newStatus = segment.status;
                          if (isTextChanged && segment.status === "Reviewed") {
                            newStatus = "Edited";
                          }
                          
                          // 인증된 API 요청으로 서버에 업데이트
                          const response = await apiRequest(
                            'PATCH',
                            `/api/segments/${segment.id}`,
                            {
                              target: editedValue,
                              status: newStatus,
                              origin: needsOriginChange ? "HT" : segment.origin
                            }
                          );
                          
                          if (!response.ok) {
                            throw new Error(`Server responded with status: ${response.status}`);
                          }
                          
                          const updatedSegment = await response.json();
                          console.log('Saved segment:', updatedSegment);
                          
                          // 로컬 상태 업데이트
                          onUpdate?.(
                            updatedSegment.target || editedValue, 
                            updatedSegment.status, 
                            updatedSegment.origin
                          );
                        } catch (error) {
                          console.error("Failed to save segment:", error);
                        }
                        
                        // 편집 모드 종료 - 항상 실행
                        onCancel?.();
                      };
                      
                      saveAndClose();
                    }}
                    size="sm" 
                    variant="ghost" 
                    className="h-7 w-7 p-0 rounded-full"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Save and Close</span>
                  </Button>
                  
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation(); // 이벤트 전파 방지
                      if (onToggleStatus) {
                        // 부모로부터 전달된 토글 함수 사용
                        onToggleStatus();
                      } else {
                        // 기존 토글 로직 사용
                        const newStatus = segment.status === "Reviewed" ? "Edited" : "Reviewed";
                        
                        // MT, 100%, Fuzzy일 경우 origin도 HT로 변경
                        const needsOriginChange = (segment.origin === "MT" || segment.origin === "100%" || segment.origin === "Fuzzy");
                        const newOrigin = (newStatus === "Reviewed" && needsOriginChange) ? "HT" : segment.origin;
                        
                        const updateStatus = async () => {
                          try {
                            // 인증된 API 요청으로 서버에 업데이트
                            const response = await apiRequest(
                              'PATCH',
                              `/api/segments/${segment.id}`,
                              {
                                target: editedValue,
                                status: newStatus,
                                origin: newOrigin
                              }
                            );
                            
                            // 응답 확인 및 에러 처리 추가
                            if (!response.ok) {
                              throw new Error(`Server responded with status: ${response.status}`);
                            }
                            
                            const updatedSegment = await response.json();
                            console.log('Updated segment:', updatedSegment);
                            
                            // 로컬 상태 업데이트 - 서버에서 반환된 값으로 업데이트
                            onUpdate?.(updatedSegment.target || editedValue, updatedSegment.status, updatedSegment.origin);
                            // 중요: onSave 호출하지 않음 - 편집 상태를 유지하기 위해
                          } catch (error) {
                            console.error("Failed to update segment status:", error);
                          }
                        };
                        
                        updateStatus();
                      }
                    }}
                    size="sm" 
                    variant="ghost" 
                    className="h-7 w-7 p-0 rounded-full bg-blue-100 dark:bg-blue-900/30"
                  >
                    <Check className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                    <span className="sr-only">Mark as Reviewed and Save</span>
                  </Button>
                </div>
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
                hasTranslation && segment.status === 'Reviewed' && "text-green-700 dark:text-green-400",
                hasTranslation && segment.status === 'Rejected' && "text-red-700 dark:text-red-400",
                className
              )}
              onClick={onSelectForEditing}
            >
              {segment.target || "Click to add translation"}
            </span>
            
            {/* 상태 버튼 추가 - 세그먼트 호버 시에만 보임 */}
            {hasTranslation && (
              <span 
                className="ml-1 inline-flex opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation(); // 편집 모드 진입 방지
                  
                  if (onToggleStatus) {
                    // 부모로부터 전달된 토글 함수 사용
                    onToggleStatus();
                  } else {
                    // 기존 토글 로직 사용 (폴백)
                    const newStatus = segment.status === "Reviewed" ? "Edited" : "Reviewed";
                    
                    // MT, 100%, Fuzzy일 경우 origin도 HT로 변경
                    const needsOriginChange = (segment.origin === "MT" || segment.origin === "100%" || segment.origin === "Fuzzy");
                    const newOrigin = (newStatus === "Reviewed" && needsOriginChange) ? "HT" : segment.origin;
                    
                    const updateStatus = async () => {
                      try {
                        // 인증된 API 요청으로 서버에 업데이트
                        const response = await apiRequest(
                          'PATCH',
                          `/api/segments/${segment.id}`,
                          {
                            target: segment.target,
                            status: newStatus,
                            origin: newOrigin
                          }
                        );
                        
                        // 응답 확인 및 에러 처리 추가
                        if (!response.ok) {
                          throw new Error(`Server responded with status: ${response.status}`);
                        }
                        
                        const updatedSegment = await response.json();
                        console.log('Updated segment:', updatedSegment);
                        
                        // 로컬 상태 업데이트 - 서버에서 반환된 값으로 업데이트
                        onUpdate?.(updatedSegment.target || segment.target || "", updatedSegment.status, updatedSegment.origin);
                      } catch (error) {
                        console.error("Failed to toggle segment status:", error);
                      }
                    };
                    
                    updateStatus();
                  }
                }}
              >
                {/* 원 아이콘 제거 */}
              </span>
            )}
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
            hasTranslation && segment.status === 'Reviewed' && "text-green-700 dark:text-green-400",
            hasTranslation && segment.status === 'Rejected' && "text-red-700 dark:text-red-400",
            className
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
            <Badge variant={segment.status === 'Reviewed' ? "default" : "outline"}
              className={cn(
                "text-xs font-normal h-5",
                segment.status === 'Reviewed' ? "bg-green-600/80 hover:bg-green-600/90" : "",
                segment.status === 'Rejected' ? "border-red-500 text-red-500" : ""
              )}
            >
              {segment.status || 'Draft'}
            </Badge>
          </div>
        )}
        
        {isSource ? (
          <div className="font-serif text-base p-2 bg-accent/20 rounded-md">{segment.source}</div>
        ) : (
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={editedValue}
              onChange={(e) => {
                const value = e.target.value;
                onEditValueChange?.(value);
                
                // 자동으로 Reviewed 상태에서 Edited 상태로 변경 로직 (필요시)
                if (onUpdate && segment.status === "Reviewed" && value !== segment.target) {
                  onUpdate(value, "Edited", segment.origin);
                }
              }}
              onKeyDown={handleKeyDown}
              className="min-h-[100px] font-serif text-base resize-none"
              placeholder="Enter translation..."
            />
            
            {/* 편집 액션 버튼들 */}
            <div className="flex justify-end gap-2 mt-2">
              {/* X 버튼: 저장하지 않고 취소 */}
              <Button onClick={onCancel} size="sm" variant="outline">
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              
              {/* 체크 버튼: 상태와 함께 저장 */}
              <Button 
                onClick={() => {
                  // 텍스트가 수정되었으면서 MT/100%/Fuzzy였으면 origin을 HT로 변경
                  const needsOriginChange = editedValue !== segment.target && 
                    (segment.origin === "MT" || segment.origin === "100%" || segment.origin === "Fuzzy");
                  
                  // 저장하면서 Reviewed 상태로 변경
                  const updateSegment = async () => {
                    try {
                      // 인증된 API 요청으로 서버에 업데이트 
                      const response = await apiRequest(
                        'PATCH',
                        `/api/segments/${segment.id}`,
                        {
                          target: editedValue,
                          status: "Reviewed",
                          origin: needsOriginChange ? "HT" : segment.origin
                        }
                      );

                      // 응답이 성공적이면 로컬 상태도 업데이트
                      if (response.ok) {
                        const updatedSegment = await response.json();
                        onUpdate?.(updatedSegment.target, updatedSegment.status, updatedSegment.origin);
                        onSave?.(); // 편집 모드 종료
                      }
                    } catch (error) {
                      console.error("Failed to save segment with status change:", error);
                    }
                  };
                  
                  updateSegment();
                }}
                size="sm" 
                variant="default"
              >
                <Check className="h-4 w-4 mr-1" />
                Save & Review
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
          <div className="font-serif text-base p-2 bg-accent/20 rounded-md">{segment.source}</div>
        ) : (
          <div 
            className={cn(
              "p-2 rounded-md border cursor-pointer font-serif text-base group relative",
              segment.status === 'Reviewed' ? "bg-green-50 dark:bg-green-950/10 border-green-200 dark:border-green-900" : "bg-muted/20 border-border/50",
              !segment.target && "text-muted-foreground italic"
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
                        // 기존 토글 로직 사용 (폴백)
                        const newStatus = segment.status === "Reviewed" ? "Edited" : "Reviewed";
                        
                        // MT, 100%, Fuzzy일 경우 origin도 HT로 변경
                        const needsOriginChange = (segment.origin === "MT" || segment.origin === "100%" || segment.origin === "Fuzzy");
                        const newOrigin = (newStatus === "Reviewed" && needsOriginChange) ? "HT" : segment.origin;
                        
                        const updateStatus = async () => {
                          try {
                            // 인증된 API 요청으로 서버에 업데이트
                            const response = await apiRequest(
                              'PATCH',
                              `/api/segments/${segment.id}`,
                              {
                                target: segment.target,
                                status: newStatus,
                                origin: newOrigin
                              }
                            );
                            
                            // 응답 확인 및 에러 처리 추가
                            if (!response.ok) {
                              throw new Error(`Server responded with status: ${response.status}`);
                            }
                            
                            const updatedSegment = await response.json();
                            
                            // 로컬 상태 업데이트 - 서버에서 반환된 값으로 업데이트
                            onUpdate?.(updatedSegment.target, updatedSegment.status, updatedSegment.origin);
                          } catch (error) {
                            console.error("Failed to toggle segment status:", error);
                          }
                        };
                        
                        updateStatus();
                      }
                    }}
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0 rounded-full"
                  >
                    <span className="sr-only">Toggle Status</span>
                  </Button>
                </div>
              )}
            </div>
            
            {/* 상태와 기원 정보 표시 푸터 */}
            {segment.target && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <Badge variant={segment.status === 'Reviewed' ? "default" : "outline"}
                  className={cn(
                    "text-[10px] font-normal h-4 px-1",
                    segment.status === 'Reviewed' ? "bg-green-600/80 hover:bg-green-600/90" : "",
                    segment.status === 'Rejected' ? "border-red-500 text-red-500" : ""
                  )}
                >
                  {segment.status || 'Draft'}
                </Badge>
                
                {segment.origin && (
                  <Badge variant="outline" className="text-[10px] font-normal h-4 px-1">
                    {segment.origin}
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}