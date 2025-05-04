import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, Download, Languages } from "lucide-react";
import { SegmentItem } from "./segment-item";
import { SegmentDetail } from "./segment-detail";
import { ProgressBar } from "./progress-bar";
import { apiRequest } from "@/lib/queryClient";
import { type TranslationUnit, type TranslationMemory } from "@/types";

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
  
  // Update local segments when props change
  useEffect(() => {
    setLocalSegments(segments);
  }, [segments]);
  
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
      const matches = await searchTM(segment.source);
      setSelectedSegmentTmMatches(matches);
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
      
      if (data.target) {
        await handleSegmentUpdate(id, data.target, "MT");
      }
    } catch (error) {
      console.error("Error translating with GPT:", error);
    }
  };
  
  // Handle close detail view
  const handleCloseDetail = () => {
    setActiveSegmentId(null);
    setSelectedSegmentTmMatches([]);
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
          onClose={handleCloseDetail}
          onUpdate={(target, status) => 
            handleSegmentUpdate(activeSegment.id, target, status)
          }
          onTranslateWithGPT={() => handleTranslateWithGPT(activeSegment.id)}
          onUseTmMatch={handleUseTmMatch}
        />
      ) : (
        <div className="flex-1 overflow-hidden flex">
          {/* Source panel */}
          <div className="w-1/2 overflow-y-auto">
            <div className="px-4 py-3">
              {localSegments.map((segment, index) => (
                <SegmentItem
                  key={segment.id}
                  segment={segment}
                  index={index + 1}
                  isSource={true}
                  onClick={() => handleSegmentClick(segment.id)}
                />
              ))}
            </div>
          </div>
          
          {/* Divider */}
          <div className="border-l border-border w-1 cursor-col-resize"></div>
          
          {/* Target panel */}
          <div className="w-1/2 overflow-y-auto">
            <div className="px-4 py-3">
              {localSegments.map((segment, index) => (
                <SegmentItem
                  key={segment.id}
                  segment={segment}
                  index={index + 1}
                  isSource={false}
                  onClick={() => handleSegmentClick(segment.id)}
                  onTranslateWithGPT={() => handleTranslateWithGPT(segment.id)}
                />
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
