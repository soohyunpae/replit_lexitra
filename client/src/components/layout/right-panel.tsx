import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Search, X } from "lucide-react";
import { TmMatch } from "@/components/translation/tm-match";
import { type TranslationMemory, type Glossary } from "@/types";
import { useTranslation } from "react-i18next";

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
  const [tmSearchQuery, setTmSearchQuery] = useState("");
  const [tbSearchQuery, setTbSearchQuery] = useState("");
  const { t } = useTranslation();
  
  // Create a callback handler that safely calls onUseTranslation if defined
  const handleUseTranslation = (translation: string) => {
    if (onUseTranslation) {
      onUseTranslation(translation);
    }
  };
  
  return (
    <aside className="w-80 border-l border-border bg-card hidden xl:block">
      <div className="h-full flex flex-col">
        {/* Tab navigation */}
        <div className="px-4 py-3 border-b border-border">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="tm">{t('translation.suggestions')}</TabsTrigger>
              <TabsTrigger value="tb">{t('common.glossaries')}</TabsTrigger>
              <TabsTrigger value="comments">{t('translation.comments')}</TabsTrigger>
              <TabsTrigger value="history">{t('translation.history')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === "tm" && (
            <div className="flex flex-col h-full">
              {/* TM Matches content */}
              <div className="p-4">
                <div className="text-sm font-medium mb-2">{t('common.tm')}</div>
                
                {/* TM Search */}
                <div className="mb-4">
                  <div className="relative">
                    <Input
                      placeholder={t('tm.searchEntries')}
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
                
                {tmMatches.length > 0 ? (
                  tmMatches
                    .filter(match => 
                      !tmSearchQuery || 
                      match.source.toLowerCase().includes(tmSearchQuery.toLowerCase()) ||
                      match.target.toLowerCase().includes(tmSearchQuery.toLowerCase())
                    )
                    .map((match, index) => (
                      <TmMatch 
                        key={index} 
                        match={match} 
                        onUse={handleUseTranslation} 
                        sourceSimilarity={match.source.includes(selectedSegment?.source || "") ? 100 : 85}
                      />
                    ))
                ) : (
                  <div className="bg-accent rounded-md p-3 text-sm text-muted-foreground">
                    {tmSearchQuery ? t('sidePanel.tm.noSearchResults') : t('sidePanel.tm.noMatches')}
                  </div>
                )}
                
                {/* TM Context info */}
                <div className="bg-accent rounded-md p-3 mt-4">
                  <div className="text-sm font-medium mb-2">{t('tm.integration.title', 'GPT & TM Integration Info')}</div>
                  <div className="text-xs text-muted-foreground">
                    <p className="mb-2">{t('tm.integration.description', 'When using GPT translation, this segment will be paired with the following TM context:')}</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>{t('tm.integration.exactMatch', '100% match from segments with similar patterns')}</li>
                      <li>{t('tm.integration.fuzzyMatch', 'Fuzzy matches with similarity > 70%')}</li>
                      <li>{t('tm.integration.terminology', 'Terminology from glossary will be prioritized')}</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Glossary section */}
              <div className="border-t border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">{t('glossaries.title')}</div>
                  <Button variant="link" size="sm" className="h-5 p-0 text-xs">
                    {t('common.showAll', 'Show All')}
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
                      {t('glossaries.noGlossaries')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === "comments" && (
            <div className="p-4">
              <div className="text-sm font-medium mb-2">{t('translation.comments')}</div>
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">
                  {t('sidePanel.comments.noComments')}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === "tb" && (
            <div className="p-4">
              <div className="text-sm font-medium mb-2">{t('sidePanel.glossary.title')}</div>
              
              {/* TB Search */}
              <div className="mb-4">
                <div className="relative">
                  <Input
                    placeholder={t('sidePanel.glossary.searchPlaceholder')}
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
              
              {selectedSegment?.source && !tbSearchQuery ? (
                <div className="mb-4">
                  <div className="text-xs font-semibold mb-1 text-muted-foreground">{t('glossaries.sourceText')}</div>
                  <div className="text-sm mb-2 bg-accent p-2 rounded">{selectedSegment.source}</div>
                </div>
              ) : null}
              
              {glossaryTerms.length > 0 ? (
                <div className="space-y-3">
                  {glossaryTerms
                    .filter(term => 
                      !tbSearchQuery || 
                      term.source.toLowerCase().includes(tbSearchQuery.toLowerCase()) ||
                      term.target.toLowerCase().includes(tbSearchQuery.toLowerCase())
                    )
                    .map((term, index) => (
                      <div key={index} className="bg-accent rounded-md p-3">
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
                            onClick={() => handleUseTranslation(term.target)}
                          >
                            {t('sidePanel.useTerm')}
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : selectedSegment?.source ? (
                <div className="bg-accent rounded-md p-3 text-sm text-muted-foreground">
                  {tbSearchQuery ? t('sidePanel.glossary.noSearchResults') : t('sidePanel.glossary.noMatchingTerms')}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">
                    {tbSearchQuery ? t('sidePanel.glossary.noSearchResults') : t('glossaries.selectSegment', 'Select a segment to see matching glossary terms.')}
                  </div>
                </div>
              )}
              
              <div className="mt-4 pt-3 border-t border-border">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <a href="/glossary" target="_blank" rel="noopener noreferrer">
                    {t('glossaries.manageEntries')}
                  </a>
                </Button>
              </div>
            </div>
          )}
          
          {activeTab === "history" && (
            <div className="p-4">
              <div className="text-sm font-medium mb-2">{t('sidePanel.history.title')}</div>
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">
                  {t('sidePanel.selectSegmentForHistory')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
