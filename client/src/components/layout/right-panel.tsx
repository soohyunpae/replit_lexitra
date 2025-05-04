import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { TmMatch } from "@/components/translation/tm-match";
import { type TranslationMemory, type Glossary } from "@/types";

interface RightPanelProps {
  tmMatches?: TranslationMemory[];
  glossaryTerms?: Glossary[];
  onUseTranslation?: (translation: string) => void;
  selectedSegment?: {
    source: string;
    target?: string;
  };
}

export function RightPanel({ 
  tmMatches = [], 
  glossaryTerms = [],
  onUseTranslation,
  selectedSegment
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState("tm");
  
  return (
    <aside className="w-80 border-l border-border bg-card hidden xl:block">
      <div className="h-full flex flex-col">
        {/* Tab navigation */}
        <div className="px-4 py-3 border-b border-border">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="tm">TM Matches</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <TabsContent value="tm" className="flex-1 flex flex-col p-0 m-0">
          {/* TM Matches content */}
          <div className="p-4 overflow-y-auto flex-1">
            <div className="text-sm font-medium mb-2">Translation Memory Matches</div>
            
            {tmMatches.length > 0 ? (
              tmMatches.map((match, index) => (
                <TmMatch 
                  key={index} 
                  match={match} 
                  onUse={onUseTranslation} 
                  sourceSimilarity={match.source.includes(selectedSegment?.source || "") ? 100 : 85}
                />
              ))
            ) : (
              <div className="bg-accent rounded-md p-3 text-sm text-muted-foreground">
                No TM matches found for this segment.
              </div>
            )}
            
            {/* TM Context info */}
            <div className="bg-accent rounded-md p-3 mt-4">
              <div className="text-sm font-medium mb-2">GPT &amp; TM Integration Info</div>
              <div className="text-xs text-muted-foreground">
                <p className="mb-2">When using GPT translation, this segment will be paired with the following TM context:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>100% match from segments with similar patterns</li>
                  <li>Fuzzy matches with similarity &gt; 70%</li>
                  <li>Terminology from glossary will be prioritized</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Glossary section */}
          <div className="border-t border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Project Glossary</div>
              <Button variant="link" size="sm" className="h-5 p-0 text-xs">
                Show All
              </Button>
            </div>
            
            <div className="space-y-2">
              {glossaryTerms.length > 0 ? (
                glossaryTerms.map((term, index) => (
                  <div key={index} className="flex justify-between text-xs py-1 border-b border-border">
                    <div className="font-mono">{term.source}</div>
                    <div className="font-mono text-muted-foreground">{term.target}</div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground italic">
                  No glossary terms available.
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="comments" className="flex-1 flex flex-col p-4 m-0">
          <div className="text-sm font-medium mb-2">Comments</div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-muted-foreground">
              No comments available for this segment.
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="history" className="flex-1 flex flex-col p-4 m-0">
          <div className="text-sm font-medium mb-2">Revision History</div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-muted-foreground">
              No revision history available for this segment.
            </div>
          </div>
        </TabsContent>
      </div>
    </aside>
  );
}
