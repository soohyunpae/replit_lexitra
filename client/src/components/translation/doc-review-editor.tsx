import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Save, Download, Languages, Eye, EyeOff, Check, X,
  ArrowUp, ArrowDown, Smartphone, Monitor, FileText, 
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { TranslationUnit, TranslationMemory, Glossary } from '@/types';
import { DocSegment } from './doc-segment';
import { useEditingState } from '@/hooks/useEditingState';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMobile } from '@/hooks/use-mobile';
import { SidePanel } from './side-panel';

interface DocReviewEditorProps {
  fileName: string;
  sourceLanguage: string;
  targetLanguage: string;
  segments: TranslationUnit[];
  onSave?: () => void;
  onExport?: () => void;
  fileId?: number; // fileId는 선택적으로 변경
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
  segments = [],
  onSave,
  onExport,
  fileId = 0, // 기본값 제공
  tmMatches = [],
  glossaryTerms = []
}: DocReviewEditorProps) {
  const { toast } = useToast();
  const isMobile = useMobile();
  const [showSource, setShowSource] = useState(true);
  const [scrollSyncEnabled, setScrollSyncEnabled] = useState(true);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [showSidePanel, setShowSidePanel] = useState(true);
  // 문장 하이라이트를 위한 상태 변수 추가
  const [highlightedSegmentId, setHighlightedSegmentId] = useState<number | null>(null);
  
  // 문서 보기를 위해 세그먼트를 그룹화
  const segmentGroups = groupSegmentsByParagraphs(segments);
  
  // References for the panels to sync scrolling
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  
  // Track if user is currently scrolling a panel to prevent infinite loop
  const isUserScrolling = useRef(false);
  
  // Keep track of which panel was scrolled last
  const lastScrolledPanel = useRef<'left' | 'right' | null>(null);
  
  // Use our custom hook for managing editing state
  const {
    editingId,
    editedValue,
    setEditedValue,
    selectSegmentForEditing: originalSelectForEditing,
    updateSegment,
    cancelEditing
  } = useEditingState(segments, fileId);
  
  // 수정된 선택 함수 - 하이라이트 기능 추가
  const selectSegmentForEditing = (segment: TranslationUnit) => {
    setHighlightedSegmentId(segment.id);
    originalSelectForEditing(segment);
  };
  
  // 수정된 취소 함수 - 하이라이트 제거
  const originalCancelEditing = cancelEditing;
  const customCancelEditing = () => {
    setHighlightedSegmentId(null);
    originalCancelEditing();
  };
  
  // 수정된 저장 함수 - 하이라이트 제거
  const originalUpdateSegment = updateSegment;
  const customUpdateSegment = (id: number, value: string) => {
    originalUpdateSegment(id, value);
    setHighlightedSegmentId(null);
  };
  
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
    
    setStatusCounts(counts);
    console.log("Status counts updated:", counts);
  }, [segments]);
  
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
  
  // Sync scroll between panels
  useEffect(() => {
    if (!scrollSyncEnabled) return;
    
    const handleScroll = (e: Event) => {
      if (isUserScrolling.current) return;
      isUserScrolling.current = true;
      
      const target = e.target as HTMLDivElement;
      const isLeftPanel = target === leftPanelRef.current;
      const isRightPanel = target === rightPanelRef.current;
      
      if (!isLeftPanel && !isRightPanel) {
        isUserScrolling.current = false;
        return;
      }
      
      lastScrolledPanel.current = isLeftPanel ? 'left' : 'right';
      
      if (isLeftPanel && rightPanelRef.current) {
        rightPanelRef.current.scrollTop = target.scrollTop;
      } else if (isRightPanel && leftPanelRef.current) {
        leftPanelRef.current.scrollTop = target.scrollTop;
      }
      
      // Reset after a short delay
      setTimeout(() => {
        isUserScrolling.current = false;
      }, 50);
    };
    
    const leftPanel = leftPanelRef.current;
    const rightPanel = rightPanelRef.current;
    
    if (leftPanel) leftPanel.addEventListener('scroll', handleScroll);
    if (rightPanel) rightPanel.addEventListener('scroll', handleScroll);
    
    return () => {
      if (leftPanel) leftPanel.removeEventListener('scroll', handleScroll);
      if (rightPanel) rightPanel.removeEventListener('scroll', handleScroll);
    };
  }, [scrollSyncEnabled]);
  
  // Handle save action
  const handleSave = () => {
    onSave?.();
    toast({
      title: "Changes saved",
      description: "Your translations have been saved successfully."
    });
  };
  
  return (
    <div className="flex flex-col h-full w-full">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 border-b bg-card">
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            size="sm" 
            onClick={handleSave}
            className="gap-1.5"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Save</span>
          </Button>
          
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onExport}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          
          <Separator orientation="vertical" className="h-6 mx-1" />
          
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="bg-muted/50">
              <Languages className="h-3.5 w-3.5 mr-1" />
              {sourceLanguage} → {targetLanguage}
            </Badge>
            <Badge variant="outline" className="bg-muted/50">
              <FileText className="h-3.5 w-3.5 mr-1" />
              {fileName}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Responsive layout controls for mobile */}
          <Button
            size="sm"
            variant="ghost"
            title={showSource ? "Hide source text" : "Show source text"}
            onClick={() => setShowSource(!showSource)}
            className="md:hidden"
          >
            {showSource ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          
          {/* Desktop-only controls */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              size="sm"
              variant={scrollSyncEnabled ? "default" : "outline"}
              onClick={() => setScrollSyncEnabled(!scrollSyncEnabled)}
              className="gap-1.5"
            >
              {scrollSyncEnabled ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span className="text-xs">Sync Scroll</span>
                </>
              ) : (
                <>
                  <X className="h-3.5 w-3.5" />
                  <span className="text-xs">Sync Scroll</span>
                </>
              )}
            </Button>
          </div>
          
          {/* Side panel toggle button */}
          <Button
            size="sm"
            variant={showSidePanel ? "default" : "outline"}
            onClick={() => setShowSidePanel(!showSidePanel)}
            className="gap-1.5"
            title={showSidePanel ? "Hide side panel" : "Show side panel"}
          >
            {showSidePanel ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
          
          {/* Device layout toggle button (just visual indicator for demo) */}
          <Button
            size="sm"
            variant="ghost"
            title="Current layout mode"
            className="opacity-70"
          >
            {isMobile ? (
              <Smartphone className="h-4 w-4" />
            ) : (
              <Monitor className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="px-3 py-2 bg-muted/30 border-b">
        <div className="text-xs text-muted-foreground mb-1.5 flex justify-between">
          <span>Translation Progress</span>
          <span>
            {statusCounts['Reviewed'] || 0} of {totalSegments} segments
          </span>
        </div>
        <div className="h-2 w-full bg-muted overflow-hidden rounded-full flex">
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
      
      {/* Document Editor Area */}
      <div 
        className={cn(
          "flex-1 overflow-hidden",
          isMobile ? "flex flex-col" : "flex flex-row"
        )}
      >
        {/* Source Panel - Hidden on mobile when showSource is false */}
        <div 
          className={cn(
            "border-r bg-card/20",
            isMobile 
              ? (showSource ? "h-1/2 overflow-y-auto" : "hidden") 
              : (showSidePanel ? "w-[35%]" : "w-1/2") + " overflow-y-auto"
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
                              (editingId === segment.id || highlightedSegmentId === segment.id) ? "bg-muted/50 rounded px-1" : ""
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
              ? "flex-1 overflow-y-auto" 
              : (showSidePanel ? "w-[35%]" : "w-1/2") + " overflow-y-auto"
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
                            segment={segment}
                            isSource={false}
                            isEditing={editingId === segment.id}
                            editedValue={editingId === segment.id ? editedValue : segment.target || ''}
                            onEditValueChange={setEditedValue}
                            onSelectForEditing={() => selectSegmentForEditing(segment)}
                            onSave={() => updateSegment(segment.id, editedValue)}
                            onCancel={cancelEditing}
                            isDocumentMode={true}
                            showStatusInEditor={true}
                            className={cn(
                              "py-0 mr-0 border-0",
                              editingId === segment.id ? "bg-accent/30 rounded px-1" : ""
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