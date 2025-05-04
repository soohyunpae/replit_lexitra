import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, Download, Languages } from "lucide-react";
import { SegmentItem } from "./segment-item";
import { SegmentDetail } from "./segment-detail";
import { ProgressBar } from "./progress-bar";
import { apiRequest } from "@/lib/queryClient";
import { type TranslationUnit, type TranslationMemory, type Glossary } from "@/types";

interface TranslationEditorProps {
  fileName: string;
  sourceLanguage: string;
  targetLanguage: string;
  segments: TranslationUnit[];
  tmMatches?: TranslationMemory[];
  onSave?: () => void;
  onExport?: () => void;
}

export function TranslationEditor({
  fileName,
  sourceLanguage,
  targetLanguage,
  segments = [],
  tmMatches = [],
  onSave,
  onExport
}: TranslationEditorProps) {
  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);
  const [localSegments, setLocalSegments] = useState<TranslationUnit[]>(segments);
  const [selectedSegmentTmMatches, setSelectedSegmentTmMatches] = useState<TranslationMemory[]>([]);
  const [selectedSegmentGlossaryTerms, setSelectedSegmentGlossaryTerms] = useState<Glossary[]>([]);
  
  // Update local segments when props change
  useEffect(() => {
    setLocalSegments(segments);
  }, [segments]);
  
  // Synchronize scroll between source and target panels
  useEffect(() => {
    const sourcePanel = document.getElementById('source-panel');
    const targetPanel = document.getElementById('target-panel');
    
    if (!sourcePanel || !targetPanel) return;
    
    // Synchronize source panel scroll to target panel
    const handleSourceScroll = () => {
      targetPanel.scrollTop = sourcePanel.scrollTop;
    };
    
    // Synchronize target panel scroll to source panel
    const handleTargetScroll = () => {
      sourcePanel.scrollTop = targetPanel.scrollTop;
    };
    
    sourcePanel.addEventListener('scroll', handleSourceScroll);
    targetPanel.addEventListener('scroll', handleTargetScroll);
    
    // Match segment heights for better alignment
    const syncSegmentHeights = () => {
      const sourceRows = document.querySelectorAll('#source-panel .segment-row');
      const targetRows = document.querySelectorAll('#target-panel .segment-row');
      
      // Reset heights first
      sourceRows.forEach(row => (row as HTMLElement).style.height = 'auto');
      targetRows.forEach(row => (row as HTMLElement).style.height = 'auto');
      
      // Then set all to the max height of each pair
      sourceRows.forEach((sourceRow, index) => {
        if (index < targetRows.length) {
          const targetRow = targetRows[index];
          const maxHeight = Math.max(
            (sourceRow as HTMLElement).clientHeight,
            (targetRow as HTMLElement).clientHeight
          );
          
          (sourceRow as HTMLElement).style.height = `${maxHeight}px`;
          (targetRow as HTMLElement).style.height = `${maxHeight}px`;
        }
      });
    };
    
    // Run once after render
    setTimeout(syncSegmentHeights, 500);
    
    return () => {
      sourcePanel.removeEventListener('scroll', handleSourceScroll);
      targetPanel.removeEventListener('scroll', handleTargetScroll);
    };
  }, [localSegments.length]);
  
  // Get active segment
  const activeSegment = activeSegmentId 
    ? localSegments.find(segment => segment.id === activeSegmentId)
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
  
  // Search TM for active segment
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
      setSelectedSegmentTmMatches(data);
      return data;
    } catch (error) {
      console.error("Error searching TM:", error);
      return [];
    }
  };
  
  // Handle segment click
  const handleSegmentClick = async (id: number) => {
    setActiveSegmentId(id);
    
    const segment = localSegments.find(s => s.id === id);
    if (segment) {
      // Search TM and glossary in parallel
      const [tmMatches, glossaryTerms] = await Promise.all([
        searchTM(segment.source),
        searchGlossary(segment.source)
      ]);
      
      setSelectedSegmentTmMatches(tmMatches);
      setSelectedSegmentGlossaryTerms(glossaryTerms);
    }
  };
  
  // Handle segment update
  const handleSegmentUpdate = async (
    id: number, 
    target: string, 
    status = "MT"
  ) => {
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
      return null;
    }
  };
  
  // Handle translation with GPT
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
      
      // Update TM matches if they came back from the API
      if (data.tmMatches && data.tmMatches.length > 0) {
        setSelectedSegmentTmMatches(data.tmMatches);
      }
      
      // Update glossary terms if they came back from the API
      if (data.glossaryTerms && data.glossaryTerms.length > 0) {
        setSelectedSegmentGlossaryTerms(data.glossaryTerms);
      }
      
      if (data.target) {
        await handleSegmentUpdate(id, data.target, "MT");
      }
    } catch (error) {
      console.error("Error translating with GPT:", error);
    }
  };
  
  // Search glossary for active segment
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
      
      setSelectedSegmentGlossaryTerms(matchingTerms);
      return matchingTerms;
    } catch (error) {
      console.error("Error searching glossary:", error);
      return [];
    }
  };

  // Handle close detail view
  const handleCloseDetail = () => {
    setActiveSegmentId(null);
    setSelectedSegmentTmMatches([]);
    setSelectedSegmentGlossaryTerms([]);
  };
  
  // Handle use TM match
  const handleUseTmMatch = async (translation: string) => {
    if (!activeSegmentId) return;
    await handleSegmentUpdate(activeSegmentId, translation, "MT");
  };
  
  return (
    <main className="flex-1 flex flex-col overflow-hidden">
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
      
      {activeSegment ? (
        <SegmentDetail
          segment={activeSegment}
          tmMatches={selectedSegmentTmMatches}
          glossaryTerms={selectedSegmentGlossaryTerms}
          onClose={handleCloseDetail}
          onUpdate={(target, status) => 
            handleSegmentUpdate(activeSegment.id, target, status)
          }
          onTranslateWithGPT={() => handleTranslateWithGPT(activeSegment.id)}
          onUseTmMatch={handleUseTmMatch}
        />
      ) : (
        <div className="flex-1 overflow-hidden flex">
          {/* Two column layout with synchronized scroll */}
          <div className="w-1/2 overflow-y-auto" id="source-panel">
            <div className="px-4 py-3">
              {localSegments.map((segment, index) => (
                <div key={segment.id} className="segment-row" data-segment-id={segment.id}>
                  <SegmentItem
                    segment={segment}
                    index={index + 1}
                    isSource={true}
                    onClick={() => handleSegmentClick(segment.id)}
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* Divider */}
          <div className="border-l border-border w-1 cursor-col-resize"></div>
          
          {/* Target panel */}
          <div className="w-1/2 overflow-y-auto" id="target-panel">
            <div className="px-4 py-3">
              {localSegments.map((segment, index) => (
                <div key={segment.id} className="segment-row" data-segment-id={segment.id}>
                  <SegmentItem
                    segment={segment}
                    index={index + 1}
                    isSource={false}
                    onClick={() => handleSegmentClick(segment.id)}
                    onTranslateWithGPT={() => handleTranslateWithGPT(segment.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile floating action button */}
      <div className="fixed bottom-4 right-4 xl:hidden">
        <Button size="icon" className="h-12 w-12 rounded-full shadow-lg">
          <Languages className="h-6 w-6" />
        </Button>
      </div>
    </main>
  );
}
