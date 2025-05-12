import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Save, Download, Languages, Eye, EyeOff, Check, X,
  ArrowUp, ArrowDown, Smartphone, Monitor, FileText, 
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  RotateCw, AlertCircle
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { TranslationUnit, TranslationMemory, Glossary } from '@/types';
import { DocSegment } from './doc-segment-authenticated';
import { useEditingState } from '@/hooks/useEditingState';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMobile } from '@/hooks/use-mobile';
import { SidePanel } from './side-panel';
import { useSegments } from '@/hooks/useSegments';

interface DocReviewEditorProps {
  fileName: string;
  sourceLanguage: string;
  targetLanguage: string;
  segments?: TranslationUnit[]; // 기존 호환성 유지
  onSave?: () => void;
  onExport?: () => void;
  fileId: number; // 필수 파라미터로 변경
  tmMatches?: TranslationMemory[];
  glossaryTerms?: Glossary[];
}

// 세그먼트가 연속되어야 하는지 판단하는 함수
function shouldBeConnected(
  currentSegment: TranslationUnit, 
  nextSegment: TranslationUnit | undefined,
  segmentsArray: TranslationUnit[]
): boolean {
  // 다음 세그먼트가 없으면 연결하지 않음
  if (!nextSegment) return false;
  
  // 양쪽 모두 텍스트가 있는지 확인
  const currentHasText = currentSegment.source && currentSegment.source.trim().length > 0;
  const nextHasText = nextSegment.source && nextSegment.source.trim().length > 0;
  
  if (!currentHasText || !nextHasText) return false;
  
  // 현재 세그먼트의 마지막 문자
  const lastChar = currentSegment.source.trim().slice(-1);
  
  // 특정 종료 문자로 끝나는 문장 검사
  const sentenceEndingChars = ['.', '?', '!', ':', ';'];
  
  // 특정 키워드 다음에 문단이 끝난다고 가정
  const paragraphEndingKeywords = [
    "Fig.", "Fig", "Figure", "TABLE", "Table", 
    "NOTE", "Note", "결론", "결과", "요약", "개요",
    "Abstract", "ABSTRACT", "INTRODUCTION", "Introduction",
    "BACKGROUND", "Background", "METHODS", "Methods",
    "RESULTS", "Results", "DISCUSSION", "Discussion",
    "CONCLUSION", "Conclusion", "REFERENCES", "References"
  ];
  
  // 단락 끝으로 처리할 패턴
  const paragraphEndingPattern = new RegExp(`(${paragraphEndingKeywords.join('|')})\\s*$`, 'i');
  
  // 마침표, 물음표, 느낌표, 콜론 등으로 끝나면 연결하지 않음 (문단 구분)
  if (sentenceEndingChars.includes(lastChar) && !paragraphEndingPattern.test(currentSegment.source)) {
    // 일부 약어 처리를 위한 예외 (예: e.g., i.e., etc.)
    const abbreviations = ['e.g', 'i.e', 'etc', 'vs', 'cf', 'fig', 'inc', 'ltd', 'co', 'Dr', 'Mr', 'Mrs', 'Ms', 'Jr'];
    const lastWord = currentSegment.source.trim().split(/\s+/).pop()?.toLowerCase() || '';
    const isAbbreviation = abbreviations.some(abbr => lastWord.includes(`${abbr}.`));
    
    if (!isAbbreviation) {
      return false;
    }
  }
  
  // 줄바꿈이 있으면 연결하지 않음
  if (currentSegment.source.includes('\n') || nextSegment.source.includes('\n')) {
    return false;
  }
  
  // 항목으로 시작하는 경우 (번호, 글머리 기호 등)
  const bulletPattern = /^\s*[-•*]|\s*\d+\.\s+/;
  if (nextSegment.source.match(bulletPattern)) {
    return false;
  }
  
  return true;
}

// 세그먼트 그룹화 함수
function groupSegmentsByParagraphs(segments: TranslationUnit[]): TranslationUnit[][] {
  // 세그먼트에 특별한 문단 정보(paragraphId)가 있는지 확인
  const hasParagraphInfo = segments.some(segment => 
    segment.comment && segment.comment.includes('paragraphId:')
  );
  
  // 문단 정보가 있으면 그것을 이용하여 그룹화
  if (hasParagraphInfo) {
    const groups: Record<string, TranslationUnit[]> = {};
    
    // 문단 ID별로 분류
    segments.forEach(segment => {
      const match = segment.comment?.match(/paragraphId:(\d+)/);
      const paragraphId = match ? match[1] : 'default';
      
      if (!groups[paragraphId]) {
        groups[paragraphId] = [];
      }
      groups[paragraphId].push(segment);
    });
    
    // 문단 ID 순서대로 정렬하여 반환
    return Object.entries(groups)
      .sort(([a], [b]) => {
        if (a === 'default') return 1;
        if (b === 'default') return -1;
        return parseInt(a) - parseInt(b);
      })
      .map(([_, segmentGroup]) => segmentGroup);
  }
  
  // 문단 정보가 없으면 텍스트 특성을 기반으로 그룹화
  const groups: TranslationUnit[][] = [];
  let currentGroup: TranslationUnit[] = [];
  
  segments.forEach((segment, index) => {
    currentGroup.push(segment);
    
    // 연결되지 않아야 하면 새 그룹 시작
    if (!shouldBeConnected(segment, segments[index + 1], segments)) {
      groups.push([...currentGroup]);
      currentGroup = [];
    }
  });
  
  // 마지막 그룹이 있으면 추가
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }
  
  // 매우 작은 그룹은 가능하면 병합 (예: 1-2 개 세그먼트만 있는 그룹)
  const mergedGroups: TranslationUnit[][] = [];
  let temp: TranslationUnit[] = [];
  
  groups.forEach((group, i) => {
    // 작은 그룹(1-2개 세그먼트)이 있고, 이전 그룹이 있으면 병합 고려
    if (group.length <= 2 && temp.length > 0 && temp.length < 5) {
      temp = [...temp, ...group];
    } else {
      if (temp.length > 0) {
        mergedGroups.push(temp);
      }
      temp = [...group];
    }
  });
  
  if (temp.length > 0) {
    mergedGroups.push(temp);
  }
  
  return mergedGroups.length > 0 ? mergedGroups : groups;
}

export function DocReviewEditor({
  fileName,
  sourceLanguage,
  targetLanguage,
  segments: propSegments,
  onSave,
  onExport,
  fileId,
  tmMatches = [],
  glossaryTerms = []
}: DocReviewEditorProps) {
  // == React Hooks 정의 - 순서 중요 ==
  // 1. useState hooks
  const [showSource, setShowSource] = useState(true);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [highlightedSegmentId, setHighlightedSegmentId] = useState<number | null>(null);
  const [segmentStatuses, setSegmentStatuses] = useState<Record<number, string>>({});
  
  // 2. useContext hooks
  const { toast } = useToast();
  const isMobile = useMobile();
  
  // 3. Custom hooks
  const { 
    segments = [], 
    isLoading, 
    isError, 
    updateSegment: reactQueryUpdateSegment,
    debouncedUpdateSegment 
  } = useSegments(fileId);
  
  const {
    editingId,
    editedValue,
    setEditedValue,
    selectSegmentForEditing: originalSelectForEditing,
    updateSegment: editingStateUpdateSegment,
    cancelEditing: originalCancelEditing,
    toggleStatus: editingStateToggleStatus
  } = useEditingState(segments, fileId);
  
  // 4. useRef hooks
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const lastScrolledPanel = useRef<'left' | 'right' | null>(null);
  
  // 5. useEffect hooks - ALL useEffect MUST GO HERE
  
  // 이전 상태 값을 저장하는 ref (리렌더링 사이에 지속되지만 변경해도 리렌더링 안 됨)
  const prevStatusCountsRef = useRef<string>('');
  
  // Update status counts when segments change
  useEffect(() => {
    const counts: Record<string, number> = {
      'MT': 0,
      '100%': 0,
      'Fuzzy': 0,
      'Edited': 0,
      'Reviewed': 0,
      'Rejected': 0
    };
    
    segments.forEach(segment => {
      // If segment has a valid status, use it
      if (segment.status && counts[segment.status] !== undefined) {
        counts[segment.status]++;
      } else {
        // Default to MT if status is not recognized
        counts['MT']++;
      }
    });
    
    // JSON.stringify로 객체 비교 (값만 비교)
    const newCountsStr = JSON.stringify(counts);
    
    // 이전 값(ref에 저장된)과 다를 때만 상태 업데이트
    if (newCountsStr !== prevStatusCountsRef.current) {
      setStatusCounts(counts);
      console.log("Status counts updated:", counts);
      
      // 현재 값을 ref에 저장
      prevStatusCountsRef.current = newCountsStr;
    }
  }, [segments]);
  
  // == 문서 보기 처리 ==
  const segmentGroups = groupSegmentsByParagraphs(segments);
  
  // == 사용자 정의 함수 (hooks 호출 이후에 정의) ==
  // 하이라이트 기능이 추가된 선택 함수
  const selectSegmentForEditing = (segment: TranslationUnit) => {
    setHighlightedSegmentId(segment.id);
    originalSelectForEditing(segment);
  };
  
  // 하이라이트 제거가 추가된 취소 함수
  const customCancelEditing = () => {
    setHighlightedSegmentId(null);
    // 원래 세그먼트 상태로 복원
    if (editingId) {
      const segment = segments.find(s => s.id === editingId);
      if (segment) {
        setSegmentStatuses(prev => ({
          ...prev,
          [editingId]: segment.status
        }));
      }
    }
    originalCancelEditing();
  };
  
  // React Query 업데이트 함수를 사용하도록 수정된 저장 함수
  const customUpdateSegment = async (id: number, value: string) => {
    // 현재 편집 중인 세그먼트 찾기
    const segment = segments.find(s => s.id === id);
    if (segment) {
      // 값이 변경되었는지 확인
      const isValueChanged = value !== segment.target;
      
      // 값이 변경되었고 상태가 'Reviewed'였다면 'Edited'로 변경
      let newStatus = segment.status;
      if (isValueChanged && segment.status === 'Reviewed') {
        newStatus = 'Edited';
        setSegmentStatuses(prev => ({
          ...prev,
          [id]: 'Edited'
        }));
      }
      
      try {
        // React Query의 업데이트 함수 사용 (수정된 형식)
        await reactQueryUpdateSegment({
          id,
          target: value,
          status: newStatus,
          origin: isValueChanged && newStatus === 'Edited' ? 'HT' : segment.origin
        });
        
        // UI 상태 업데이트
        setHighlightedSegmentId(null);
      } catch (error) {
        console.error("Failed to update segment:", error);
        toast({
          title: "Error",
          description: "Failed to update segment",
          variant: "destructive"
        });
        setHighlightedSegmentId(null);
      }
    } else {
      console.error("Segment not found:", id);
      setHighlightedSegmentId(null);
    }
  };
  
  // == 조건부 렌더링 ==
  // 로딩 상태 표시
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-center">
          <div className="h-8 w-40 bg-accent rounded-full mx-auto mb-4"></div>
          <div className="h-4 w-60 bg-accent rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }
  
  // 에러 상태 표시
  if (isError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load segments</h3>
          <p className="text-muted-foreground mb-4">There was an error loading translation segments.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }
  
  // Status counts are updated in the useEffect at the top of the component
  
  // Calculate progress percentages
  const totalSegments = segments.length;
  const reviewedPercentage = totalSegments > 0 
    ? (statusCounts['Reviewed'] || 0) / totalSegments * 100 
    : 0;
    
  // Combine all non-reviewed, non-rejected statuses for the progress bar
  // This includes MT, 100%, Fuzzy, and Edited
  const inProgressCount = (statusCounts['MT'] || 0) + 
    (statusCounts['100%'] || 0) + 
    (statusCounts['Fuzzy'] || 0) + 
    (statusCounts['Edited'] || 0);
    
  const inProgressPercentage = totalSegments > 0 
    ? inProgressCount / totalSegments * 100 
    : 0;
    
  const rejectedPercentage = totalSegments > 0 
    ? (statusCounts['Rejected'] || 0) / totalSegments * 100 
    : 0;
  
  // 스크롤 동기화 기능 제거
  
  // Handle save action
  const handleSave = () => {
    onSave?.();
    toast({
      title: "Changes saved",
      description: "Your translations have been saved successfully."
    });
  };
  
  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      {/* Progress bar with controls */}
      <div className="bg-card border-b border-border py-2 px-4">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex-1">
            <div className="h-2.5 rounded-full bg-secondary overflow-hidden flex">
              <div 
                className="h-full bg-green-500" 
                style={{ width: `${reviewedPercentage}%` }}
              />
              <div 
                className="h-full bg-blue-500" 
                style={{ width: `${inProgressPercentage}%` }}
              />
              <div 
                className="h-full bg-red-500" 
                style={{ width: `${rejectedPercentage}%` }}
              />
            </div>
          </div>
          
          <div className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            {statusCounts["Reviewed"] || 0}/{segments.length} Reviewed
          </div>
          
          <div className="flex items-center gap-2 ml-1">
            {/* Side panel toggle button */}
            <Button
              size="sm"
              variant={showSidePanel ? "default" : "outline"}
              onClick={() => setShowSidePanel(!showSidePanel)}
              className="h-7 w-7 p-0"
              title={showSidePanel ? "Hide side panel" : "Show side panel"}
            >
              {showSidePanel ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" />
              )}
            </Button>
            
            {/* Device layout toggle button removed as requested */}
          </div>
        </div>
      </div>
      
      {/* Document Editor Area */}
      <div 
        className={cn(
          "flex-1",
          isMobile ? "flex flex-col" : "flex flex-row"
        )}
      >
        {/* Source Panel - Hidden on mobile when showSource is false */}
        <div 
          className={cn(
            "border-r bg-card/20",
            isMobile 
              ? (showSource ? "h-1/2 overflow-y-auto" : "hidden") 
              : (showSidePanel ? "w-[35%]" : "w-1/2") + " overflow-auto"
          )}
          ref={leftPanelRef}
        >
          {/* Mobile-only header */}
          {isMobile && showSource && (
            <div className="sticky top-0 bg-card/90 backdrop-blur-sm p-2 border-b z-10 flex justify-between items-center">
              <span className="text-sm font-medium">{sourceLanguage} (Source)</span>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setShowSource(false)}
                className="h-7 w-7 p-0"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Source segments as continuous document */}
          <div className="p-4">
            <div className="bg-card/30 rounded-md shadow-sm overflow-hidden border p-5">
              <div className="prose prose-lg max-w-none font-serif">
                {segmentGroups.map((group, groupIndex) => (
                  <div 
                    key={`source-group-${groupIndex}`} 
                    className="paragraph-block mb-6 relative hover:bg-muted/5 transition-colors duration-150 p-2 -mx-2 rounded-md" 
                    data-paragraph-id={groupIndex}
                  >
                    <div className="inline">
                      {group.map((segment, segmentIndex) => (
                        <span key={`source-${segment.id}`} className="inline">
                          <DocSegment
                            segment={segment}
                            isSource={true}
                            isEditing={editingId === segment.id}
                            isDocumentMode={true}
                            className={cn(
                              "py-0 mr-0 border-0",
                              (editingId === segment.id || highlightedSegmentId === segment.id) ? "bg-blue-100 dark:bg-blue-900/50 rounded px-1 shadow-sm" : ""
                            )}
                          />
                          {/* 일반 문서처럼 보이도록 공백 추가 */}
                          {segmentIndex < group.length - 1 && " "}
                        </span>
                      ))}
                    </div>
                    <div className="absolute -left-3 top-0 opacity-20 text-xs font-mono text-muted-foreground">
                      ¶{groupIndex+1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Target Panel */}
        <div 
          className={cn(
            "bg-card/20",
            isMobile 
              ? "flex-1 overflow-auto" 
              : (showSidePanel ? "w-[35%]" : "w-1/2") + " overflow-auto"
          )}
          ref={rightPanelRef}
        >
          {/* Mobile-only header with show source button */}
          {isMobile && !showSource && (
            <div className="sticky top-0 bg-card/90 backdrop-blur-sm p-2 border-b z-10 flex justify-between items-center">
              <span className="text-sm font-medium">{targetLanguage} (Target)</span>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setShowSource(true)}
                className="h-7 w-7 p-0"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Target segments as continuous document */}
          <div className="p-4">
            <div className="bg-card/30 rounded-md shadow-sm overflow-hidden border p-5">
              <div className="prose prose-lg max-w-none font-serif">
                {segmentGroups.map((group, groupIndex) => (
                  <div 
                    key={`target-group-${groupIndex}`} 
                    className="paragraph-block mb-6 relative hover:bg-muted/5 transition-colors duration-150 p-2 -mx-2 rounded-md" 
                    data-paragraph-id={groupIndex}
                  >
                    <div className="inline">
                      {group.map((segment, segmentIndex) => (
                        <span key={`target-${segment.id}`} className="inline">
                          <DocSegment
                            segment={{
                              ...segment,
                              // 로컬 상태에 있는 경우 그것을 사용, 아니면 원래 상태 사용
                              status: segmentStatuses[segment.id] || segment.status
                            }}
                            isSource={false}
                            isEditing={editingId === segment.id}
                            editedValue={editingId === segment.id ? editedValue : segment.target || ''}
                            onEditValueChange={setEditedValue}
                            onSelectForEditing={() => selectSegmentForEditing(segment)}
                            onSave={() => customUpdateSegment(segment.id, editedValue)}
                            onCancel={customCancelEditing}
                            onToggleStatus={() => editingStateToggleStatus(segment.id, segment.target || '')}
                            isDocumentMode={true}
                            showStatusInEditor={true}
                            className={cn(
                              "py-0 mr-0 border-0",
                              (editingId === segment.id || highlightedSegmentId === segment.id) ? "bg-blue-100 dark:bg-blue-900/50 rounded px-1 shadow-sm" : ""
                            )}
                          />
                          {/* 일반 문서처럼 보이도록 공백 추가 */}
                          {segmentIndex < group.length - 1 && " "}
                        </span>
                      ))}
                    </div>
                    <div className="absolute -left-3 top-0 opacity-20 text-xs font-mono text-muted-foreground">
                      ¶{groupIndex+1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Side Panel - Only shown when enabled */}
        {!isMobile && showSidePanel && (
          <SidePanel
            tmMatches={tmMatches}
            glossaryTerms={glossaryTerms}
            selectedSegment={segments.find(s => s.id === editingId)}
            onUseTranslation={(translation) => {
              if (editingId) {
                setEditedValue(translation);
              }
            }}
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
            showStatusInfo={false}
          />
        )}
      </div>
    </div>
  );
}