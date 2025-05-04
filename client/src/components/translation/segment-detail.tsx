import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Languages, Save } from "lucide-react";
import { TmMatch } from "./tm-match";
import { type TranslationUnit, type TranslationMemory, type Glossary } from "@/types";

interface SegmentDetailProps {
  segment: TranslationUnit;
  tmMatches?: TranslationMemory[];
  glossaryTerms?: Glossary[];
  onClose: () => void;
  onUpdate: (target: string, status: string) => void;
  onTranslateWithGPT: () => void;
  onUseTmMatch: (translation: string) => void;
}

export function SegmentDetail({
  segment,
  tmMatches = [],
  glossaryTerms = [],
  onClose,
  onUpdate,
  onTranslateWithGPT,
  onUseTmMatch
}: SegmentDetailProps) {
  const [targetText, setTargetText] = useState(segment.target || "");
  const [status, setStatus] = useState(segment.status);
  
  // Update local state when segment changes
  useEffect(() => {
    setTargetText(segment.target || "");
    setStatus(segment.status);
  }, [segment]);
  
  // Handle save
  const handleSave = () => {
    onUpdate(targetText, "MT");
    onClose();
  };
  
  // Handle approve
  const handleApprove = () => {
    onUpdate(targetText, "Reviewed");
    onClose();
  };
  
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium">Editing Segment {segment.id}</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-muted-foreground mb-2">Source Text</label>
          <div className="bg-accent p-3 rounded-lg font-mono text-sm">
            {segment.source}
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-muted-foreground">Target Text</label>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={onTranslateWithGPT}
              >
                Use GPT
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={tmMatches.length === 0}
                onClick={() => tmMatches.length > 0 && onUseTmMatch(tmMatches[0].target)}
              >
                Use TM
              </Button>
            </div>
          </div>
          <Textarea 
            className="w-full bg-accent p-3 rounded-lg font-mono text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none h-32"
            placeholder="Enter translation here..."
            value={targetText}
            onChange={(e) => setTargetText(e.target.value)}
          />
        </div>
        
        <div className="space-y-4">
          {/* Glossary terms section */}
          {glossaryTerms.length > 0 && (
            <div className="bg-accent/50 border border-border rounded-md p-4 mb-4">
              <div className="text-sm font-medium mb-3">Glossary Terms</div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {glossaryTerms.map((term, index) => (
                  <div 
                    key={index} 
                    className="bg-background rounded-md p-2 flex justify-between items-center border border-border/50"
                  >
                    <div>
                      <div className="text-sm font-mono font-medium">{term.source}</div>
                      <div className="text-sm font-mono text-muted-foreground">{term.target}</div>
                    </div>
                    <Button 
                      size="sm"
                      variant="ghost"
                      className="h-7"
                      onClick={() => onUseTmMatch(term.target)}
                    >
                      Use
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* TM Matches */}
          {tmMatches.length > 0 ? (
            tmMatches.map((match, index) => (
              <TmMatch 
                key={index} 
                match={match} 
                onUse={onUseTmMatch} 
                sourceSimilarity={match.source === segment.source ? 100 : 85}
                isDetailed
              />
            ))
          ) : (
            <div className="bg-accent rounded-md p-3">
              <div className="text-sm font-medium mb-2">No TM Matches</div>
              <p className="text-xs text-muted-foreground">
                No translation memory matches found for this segment.
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex items-center">
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button 
            variant="default" 
            className="bg-secondary hover:bg-secondary/90"
            onClick={handleApprove}
          >
            Approve & Save to TM
          </Button>
        </div>
      </div>
    </div>
  );
}
