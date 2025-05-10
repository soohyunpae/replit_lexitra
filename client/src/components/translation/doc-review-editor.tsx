import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Save, Download, Languages, Eye, EyeOff, Check, X,
  ArrowUp, ArrowDown, Smartphone, Monitor
} from 'lucide-react';
import { TranslationUnit } from '@/types';
import { DocSegment } from './doc-segment';
import { useEditingState } from '@/hooks/useEditingState';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMobile } from '@/hooks/use-mobile';

interface DocReviewEditorProps {
  fileName: string;
  sourceLanguage: string;
  targetLanguage: string;
  segments: TranslationUnit[];
  onSave?: () => void;
  onExport?: () => void;
  fileId?: number; // fileId는 선택적으로 변경
}

export function DocReviewEditor({
  fileName,
  sourceLanguage,
  targetLanguage,
  segments = [],
  onSave,
  onExport,
  fileId = 0 // 기본값 제공
}: DocReviewEditorProps) {
  const { toast } = useToast();
  const isMobile = useMobile();
  const [showSource, setShowSource] = useState(true);
  const [scrollSyncEnabled, setScrollSyncEnabled] = useState(true);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  
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
    selectSegmentForEditing,
    updateSegment,
    cancelEditing
  } = useEditingState(segments, fileId);
  
  // Update status counts when segments change
  useEffect(() => {
    const counts: Record<string, number> = {
      'Draft': 0,
      'Reviewed': 0,
      'Rejected': 0
    };
    
    segments.forEach(segment => {
      if (segment.status && counts[segment.status] !== undefined) {
        counts[segment.status]++;
      } else {
        counts['Draft']++;
      }
    });
    
    setStatusCounts(counts);
  }, [segments]);
  
  // Calculate progress percentages
  const totalSegments = segments.length;
  const reviewedPercentage = totalSegments > 0 
    ? (statusCounts['Reviewed'] || 0) / totalSegments * 100 
    : 0;
  const draftPercentage = totalSegments > 0 
    ? (statusCounts['Draft'] || 0) / totalSegments * 100 
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
            style={{ width: `${draftPercentage}%` }}
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
            "border-r",
            isMobile ? (showSource ? "h-1/2 overflow-y-auto" : "hidden") : "w-1/2 overflow-y-auto"
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
          
          {/* Source segments */}
          <div className="divide-y">
            {segments.map(segment => (
              <DocSegment
                key={`source-${segment.id}`}
                segment={segment}
                isSource={true}
                isEditing={editingId === segment.id}
                className={isMobile ? "" : "h-auto"}
              />
            ))}
          </div>
        </div>
        
        {/* Target Panel */}
        <div 
          className={cn(
            isMobile ? "flex-1 overflow-y-auto" : "w-1/2 overflow-y-auto"
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
          
          {/* Target segments (editable) */}
          <div className="divide-y">
            {segments.map(segment => (
              <DocSegment
                key={`target-${segment.id}`}
                segment={segment}
                isSource={false}
                isEditing={editingId === segment.id}
                editedValue={editingId === segment.id ? editedValue : segment.target || ''}
                onEditValueChange={setEditedValue}
                onSelectForEditing={() => selectSegmentForEditing(segment)}
                onSave={() => updateSegment(segment.id, editedValue)}
                onCancel={cancelEditing}
                className={isMobile ? "" : "h-auto"}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}