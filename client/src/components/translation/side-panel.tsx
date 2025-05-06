import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Search, X, Database, Lightbulb, MessageSquare, History } from "lucide-react";
import { TmMatch } from "./tm-match";
import { type TranslationMemory, type Glossary, type TranslationUnit } from "@/types";

interface SidePanelProps {
  tmMatches: TranslationMemory[];
  glossaryTerms: Glossary[];
  selectedSegment: TranslationUnit | null | undefined;
  onUseTranslation: (translation: string) => void;
}

export function SidePanel({
  tmMatches = [],
  glossaryTerms = [],
  selectedSegment,
  onUseTranslation
}: SidePanelProps) {
  const [activeTab, setActiveTab] = useState("tm");
  const [tmSearchQuery, setTmSearchQuery] = useState("");
  const [tbSearchQuery, setTbSearchQuery] = useState("");
  
  return (
    <aside className="w-80 border-l border-border bg-card overflow-hidden flex flex-col">
      {/* Tab navigation */}
      <div className="px-4 py-3 border-b border-border">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tm" className="flex items-center justify-center">
              <Database className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">TM</span>
            </TabsTrigger>
            <TabsTrigger value="tb" className="flex items-center justify-center">
              <Lightbulb className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Terms</span>
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center justify-center">
              <MessageSquare className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Comments</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center justify-center">
              <History className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* TM Matches Tab Content */}
        <TabsContent value="tm" className="h-full overflow-y-auto m-0 p-0">
          <div className="p-4">
            <div className="text-sm font-medium mb-2">Translation Memory</div>
            
            {/* TM Search */}
            <div className="mb-4">
              <div className="relative">
                <Input
                  placeholder="Search translation memory..."
                  className="pr-10"
                  value={tmSearchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTmSearchQuery(e.target.value)}
                />
                <button 
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setTmSearchQuery("")}
                >
                  {tmSearchQuery ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            {/* Selected segment info */}
            {selectedSegment && (
              <div className="mb-4">
                <div className="text-xs font-semibold mb-1 text-muted-foreground">Active Segment</div>
                <div className="text-sm mb-2 bg-accent/50 p-2 rounded font-mono">{selectedSegment.source}</div>
              </div>
            )}
            
            {tmMatches.length > 0 ? (
              <div className="space-y-4">
                {tmMatches
                  .filter(match => 
                    !tmSearchQuery || 
                    match.source.toLowerCase().includes(tmSearchQuery.toLowerCase()) ||
                    match.target.toLowerCase().includes(tmSearchQuery.toLowerCase())
                  )
                  .map((match, index) => (
                    <TmMatch 
                      key={index} 
                      match={match} 
                      onUse={onUseTranslation} 
                      sourceSimilarity={
                        selectedSegment && match.source === selectedSegment.source ? 100 : 85
                      }
                    />
                  ))}
              </div>
            ) : (
              <div className="bg-accent/50 rounded-md p-3 text-sm text-muted-foreground">
                {tmSearchQuery 
                  ? "No matches found for your search." 
                  : "No TM matches found for this segment."}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Glossary Tab Content */}
        <TabsContent value="tb" className="h-full overflow-y-auto m-0 p-0">
          <div className="p-4">
            <div className="text-sm font-medium mb-2">Terminology Base</div>
            
            {/* TB Search */}
            <div className="mb-4">
              <div className="relative">
                <Input
                  placeholder="Search terminology..."
                  className="pr-10"
                  value={tbSearchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTbSearchQuery(e.target.value)}
                />
                <button 
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setTbSearchQuery("")}
                >
                  {tbSearchQuery ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Selected segment info */}
            {selectedSegment && !tbSearchQuery && (
              <div className="mb-4">
                <div className="text-xs font-semibold mb-1 text-muted-foreground">Active Segment</div>
                <div className="text-sm mb-2 bg-accent/50 p-2 rounded font-mono">{selectedSegment.source}</div>
              </div>
            )}
            
            {glossaryTerms.length > 0 ? (
              <div className="space-y-3">
                {glossaryTerms
                  .filter(term => 
                    !tbSearchQuery || 
                    term.source.toLowerCase().includes(tbSearchQuery.toLowerCase()) ||
                    term.target.toLowerCase().includes(tbSearchQuery.toLowerCase())
                  )
                  .map((term, index) => (
                    <div key={index} className="bg-accent/50 rounded-md p-3">
                      <div className="flex justify-between items-center mb-1">
                        <div className="font-mono font-medium">{term.source}</div>
                        <div className="text-xs text-muted-foreground">
                          {term.sourceLanguage} → {term.targetLanguage}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="font-mono text-muted-foreground">{term.target}</div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 text-xs" 
                          onClick={() => onUseTranslation(term.target)}
                        >
                          Use Term
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="bg-accent/50 rounded-md p-3 text-sm text-muted-foreground">
                {tbSearchQuery 
                  ? "No terms found for your search." 
                  : "No matching terms found in the glossary for this segment."}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Comments Tab Content */}
        <TabsContent value="comments" className="h-full overflow-y-auto m-0 p-0">
          <div className="p-4">
            <div className="text-sm font-medium mb-2">Comments</div>
            
            {selectedSegment && (
              <div className="mb-4">
                <div className="text-xs font-semibold mb-1 text-muted-foreground">Active Segment</div>
                <div className="text-sm mb-2 bg-accent/50 p-2 rounded font-mono">{selectedSegment.source}</div>
              </div>
            )}
            
            {/* Future: Comment input and list */}
            <div className="bg-accent/50 rounded-md p-3 text-sm text-muted-foreground text-center">
              No comments available for this segment.
            </div>
          </div>
        </TabsContent>

        {/* History Tab Content */}
        <TabsContent value="history" className="h-full overflow-y-auto m-0 p-0">
          <div className="p-4">
            <div className="text-sm font-medium mb-2">Revision History</div>
            
            {selectedSegment && (
              <div className="mb-4">
                <div className="text-xs font-semibold mb-1 text-muted-foreground">Active Segment</div>
                <div className="text-sm mb-2 bg-accent/50 p-2 rounded font-mono">{selectedSegment.source}</div>
              </div>
            )}
            
            {/* Future: History list */}
            <div className="bg-accent/50 rounded-md p-3 text-sm text-muted-foreground text-center">
              No revision history available for this segment.
            </div>
          </div>
        </TabsContent>
      </div>
    </aside>
  );
}