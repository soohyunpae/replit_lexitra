import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, Download, Languages, AlertCircle } from "lucide-react";
import { EditableSegment } from "./editable-segment";
import { ProgressBar } from "./progress-bar";
import { SidePanel } from "./side-panel";
import { apiRequest } from "@/lib/queryClient";
import { type TranslationUnit, type TranslationMemory, type Glossary } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface TranslationEditorProps {
  fileName: string;
  sourceLanguage: string;
  targetLanguage: string;
  segments: TranslationUnit[];
  onSave?: () => void;
  onExport?: () => void;
}

export function NewTranslationEditor({
  fileName,
  sourceLanguage,
  targetLanguage,
  segments = [],
  onSave,
  onExport
}: TranslationEditorProps) {
  const { toast } = useToast();
  const [localSegments, setLocalSegments] = useState<TranslationUnit[]>(segments);
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null);
  const [tmMatches, setTmMatches] = useState<TranslationMemory[]>([]);
  const [glossaryTerms, setGlossaryTerms] = useState<Glossary[]>([]);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [translatedCount, setTranslatedCount] = useState(0);
  const [totalToTranslate, setTotalToTranslate] = useState(0);
  
  // Update local segments when props change
  useEffect(() => {
    setLocalSegments(segments);
  }, [segments]);
  
  // Synchronize heights for source and target panels
  useEffect(() => {
    const sourcePanel = document.getElementById('source-panel');
    const targetPanel = document.getElementById('target-panel');
    
    if (!sourcePanel || !targetPanel) return;
    
    // Dummy variable to store timeout ID
    let syncTimeoutId: NodeJS.Timeout | null = null;
    
    // Synchronize heights of corresponding source and target segments
    const syncSegmentHeights = () => {
      const sourceDivs = sourcePanel.querySelectorAll<HTMLElement>('.segment-row');
      const targetDivs = targetPanel.querySelectorAll<HTMLElement>('.segment-row');
      
      if (sourceDivs.length !== targetDivs.length) return;
      
      for (let i = 0; i < sourceDivs.length; i++) {
        const sourceSegment = sourceDivs[i];
        const targetSegment = targetDivs[i];
        
        if (sourceSegment && targetSegment) {
          // Reset heights first to ensure proper measurement
          sourceSegment.style.height = 'auto';
          targetSegment.style.height = 'auto';
          
          // Get natural heights
          const sourceHeight = sourceSegment.getBoundingClientRect().height;
          const targetHeight = targetSegment.getBoundingClientRect().height;
          
          // Set both to the maximum height
          const maxHeight = Math.max(sourceHeight, targetHeight);
          sourceSegment.style.height = `${maxHeight}px`;
          targetSegment.style.height = `${maxHeight}px`;
          
          // Make both segments have equal width within their containers
          sourceSegment.style.minWidth = '100%';
          targetSegment.style.minWidth = '100%';
        }
      }
    };
    
    // Run once when component mounts and whenever segments change
    syncSegmentHeights();
    
    // Also run after any potential text edits with a delay for reflow
    const resizeObserver = new ResizeObserver(() => {
      // Use a debounce technique to avoid excessive calls
      if (syncTimeoutId) clearTimeout(syncTimeoutId);
      syncTimeoutId = setTimeout(syncSegmentHeights, 100);
    });
    
    // Observe all segment rows for size changes
    const sourceElements = sourcePanel.querySelectorAll<HTMLElement>('.segment-row');
    const targetElements = targetPanel.querySelectorAll<HTMLElement>('.segment-row');
    
    sourceElements.forEach(row => resizeObserver.observe(row));
    targetElements.forEach(row => resizeObserver.observe(row));
    
    return () => {
      if (syncTimeoutId) clearTimeout(syncTimeoutId);
      resizeObserver.disconnect();
    };
  }, [localSegments.length]);
  
  // Get selected segment
  const selectedSegment = selectedSegmentId 
    ? localSegments.find(segment => segment.id === selectedSegmentId)
    : null;
  
  // Calculate progress
  const completedSegments = localSegments.filter(
    segment => segment.target && segment.target.trim() !== ""
  ).length;
  
  const progressPercentage = localSegments.length > 0
    ? Math.round((completedSegments / localSegments.length) * 100)
    : 0;
  
  // Status counts
  const statusCounts = localSegments.reduce((acc, segment) => {
    acc[segment.status] = (acc[segment.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Search TM for selected segment
  const searchTM = async (source: string) => {
    try {
      const response = await apiRequest(
        "POST", 
        "/api/search_tm", 
        { 
          source,
          sourceLanguage,
          targetLanguage,
          limit: 5
        }
      );
      
      const data = await response.json();
      setTmMatches(data);
      return data;
    } catch (error) {
      console.error("Error searching TM:", error);
      return [];
    }
  };
  
  // Search glossary for selected segment
  const searchGlossary = async (source: string) => {
    try {
      const response = await apiRequest(
        "GET", 
        `/api/glossary?sourceLanguage=${sourceLanguage}&targetLanguage=${targetLanguage}`
      );
      
      const allTerms = await response.json();
      
      // Filter terms that appear in the source text
      const matchingTerms = allTerms.filter((term: Glossary) => 
        source.toLowerCase().includes(term.source.toLowerCase())
      );
      
      setGlossaryTerms(matchingTerms);
      return matchingTerms;
    } catch (error) {
      console.error("Error searching glossary:", error);
      return [];
    }
  };
  
  // Handle segment selection
  const handleSegmentSelect = async (id: number) => {
    setSelectedSegmentId(id);
    
    const segment = localSegments.find(s => s.id === id);
    if (segment) {
      // Search TM and glossary in parallel
      await Promise.all([
        searchTM(segment.source),
        searchGlossary(segment.source)
      ]);
    }
  };
  
  // Handle segment update
  const handleSegmentUpdate = async (id: number, target: string, status = "MT") => {
    // Update segment in database
    try {
      const response = await apiRequest(
        "PATCH", 
        `/api/segments/${id}`, 
        { target, status }
      );
      
      const updatedSegment = await response.json();
      
      // Update local state
      setLocalSegments(prev => 
        prev.map(segment => 
          segment.id === id ? { ...segment, target, status } : segment
        )
      );
      
      return updatedSegment;
    } catch (error) {
      console.error("Error updating segment:", error);
      toast({
        title: "Error",
        description: "Failed to update segment",
        variant: "destructive"
      });
      return null;
    }
  };
  
  // Handle translation with GPT for a single segment
  const handleTranslateWithGPT = async (id: number) => {
    const segment = localSegments.find(s => s.id === id);
    if (!segment) return;
    
    try {
      const response = await apiRequest(
        "POST", 
        "/api/translate", 
        {
          source: segment.source,
          sourceLanguage,
          targetLanguage
        }
      );
      
      const data = await response.json();
      
      if (data.target) {
        await handleSegmentUpdate(id, data.target, "MT");
        toast({
          title: "Translation Complete",
          description: "Segment translated with GPT"
        });
      }
    } catch (error) {
      console.error("Error translating with GPT:", error);
      toast({
        title: "Translation Error",
        description: "Failed to translate segment with GPT",
        variant: "destructive"
      });
    }
  };
  
  // Handle batch translation with GPT
  const handleBatchTranslation = async () => {
    // Find segments without translation
    const untranslatedSegments = localSegments.filter(s => !s.target || s.target.trim() === "");
    
    if (untranslatedSegments.length === 0) {
      toast({
        title: "No segments to translate",
        description: "All segments already have translations"
      });
      return;
    }
    
    setIsTranslatingAll(true);
    setTranslatedCount(0);
    setTotalToTranslate(untranslatedSegments.length);
    
    // Create a new array for updates
    const updatedSegments = [...localSegments];
    
    // Translate segments sequentially to avoid overloading the API
    for (let i = 0; i < untranslatedSegments.length; i++) {
      const segment = untranslatedSegments[i];
      try {
        const response = await apiRequest(
          "POST", 
          "/api/translate", 
          {
            source: segment.source,
            sourceLanguage,
            targetLanguage
          }
        );
        
        const data = await response.json();
        
        if (data.target) {
          // Update the segment in the database
          await apiRequest(
            "PATCH", 
            `/api/segments/${segment.id}`, 
            { target: data.target, status: "MT" }
          );
          
          // Update our local copy
          const segmentIndex = updatedSegments.findIndex(s => s.id === segment.id);
          if (segmentIndex !== -1) {
            updatedSegments[segmentIndex] = {
              ...updatedSegments[segmentIndex],
              target: data.target,
              status: "MT"
            };
          }
          
          // Update the counter and refresh the UI
          setTranslatedCount(i + 1);
          setLocalSegments([...updatedSegments]);
        }
      } catch (error) {
        console.error(`Error translating segment ${segment.id}:`, error);
        // Continue with next segment even if one fails
      }
    }
    
    setIsTranslatingAll(false);
    toast({
      title: "Batch Translation Complete",
      description: `Translated ${untranslatedSegments.length} segments with GPT`
    });
  };
  
  return (
    <main className="flex-1 overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="bg-card border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">{fileName}</div>
          <Separator orientation="vertical" className="h-4" />
          <div className="text-sm flex items-center">
            <span className="mr-2 text-muted-foreground">Source:</span>
            <span>{sourceLanguage}</span>
          </div>
          <div className="text-sm flex items-center">
            <span className="mr-2 text-muted-foreground">Target:</span>
            <span>{targetLanguage}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center"
            onClick={handleBatchTranslation}
            disabled={isTranslatingAll}
          >
            <Languages className="h-4 w-4 mr-1" />
            {isTranslatingAll 
              ? `Translating ${translatedCount}/${totalToTranslate}...` 
              : "Translate all with AI"}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center"
            onClick={onExport}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            className="flex items-center"
            onClick={onSave}
          >
            <Save className="h-4 w-4 mr-1" />
            Save Project
          </Button>
        </div>
      </div>
      
      {/* Progress bar */}
      <ProgressBar 
        percentage={progressPercentage}
        completed={completedSegments}
        total={localSegments.length}
        statusCounts={statusCounts}
        segments={localSegments}
      />
      
      {/* Warning for batch translation */}
      {isTranslatingAll && (
        <div className="bg-warning/10 border-y border-warning/20 px-4 py-2 flex items-center">
          <AlertCircle className="h-4 w-4 text-warning mr-2" />
          <span className="text-sm">
            Batch translation in progress. Please wait... ({translatedCount}/{totalToTranslate})
          </span>
        </div>
      )}
      
      {/* Main content area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Source and Target panels with single scrollbar */}
        <div className="flex-1 overflow-hidden flex relative">
          {/* Container with single scrollbar */}
          <div className="flex-1 overflow-y-auto" id="main-scroll-container">
            <div className="flex w-full">
              {/* Source panel - no individual scrollbar */}
              <div className="w-1/2 overflow-hidden" id="source-panel">
                <div className="px-4 py-3">
                  {localSegments.map((segment, index) => (
                    <div key={segment.id} className="segment-row" data-segment-id={segment.id}>
                      <EditableSegment
                        segment={segment}
                        index={index + 1}
                        isSource={true}
                        onSelect={() => handleSegmentSelect(segment.id)}
                        isSelected={selectedSegmentId === segment.id}
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Divider */}
              <div className="border-l border-border sticky top-0 h-full cursor-col-resize"></div>
              
              {/* Target panel - no individual scrollbar */}
              <div className="w-1/2 overflow-hidden" id="target-panel">
                <div className="px-4 py-3">
                  {localSegments.map((segment, index) => (
                    <div key={segment.id} className="segment-row" data-segment-id={segment.id}>
                      <EditableSegment
                        segment={segment}
                        index={index + 1}
                        isSource={false}
                        onSelect={() => handleSegmentSelect(segment.id)}
                        onUpdate={(target, status) => handleSegmentUpdate(segment.id, target, status)}
                        onTranslateWithGPT={() => handleTranslateWithGPT(segment.id)}
                        isSelected={selectedSegmentId === segment.id}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Side panel */}
        <SidePanel
          tmMatches={tmMatches}
          glossaryTerms={glossaryTerms}
          selectedSegment={selectedSegment}
          onUseTranslation={(translation: string) => {
            if (selectedSegmentId) {
              handleSegmentUpdate(selectedSegmentId, translation, "MT");
            }
          }}
        />
      </div>
    </main>
  );
}