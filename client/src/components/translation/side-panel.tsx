import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, X, Database, Lightbulb, MessageSquare, MessageSquarePlus, History, FileSearch, User } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { type TranslationMemory, type Glossary, type TranslationUnit, type Comment } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { searchGlossaryTerms, updateSegment, addComment } from "@/lib/api";

interface SidePanelProps {
  tmMatches: TranslationMemory[];
  glossaryTerms: Glossary[];
  selectedSegment: TranslationUnit | null | undefined;
  onUseTranslation: (translation: string) => void;
  sourceLanguage: string;
  targetLanguage: string;
}

interface TmMatchProps {
  match: TranslationMemory;
  onUse: (translation: string) => void;
  sourceSimilarity: number;
  highlightTerms?: string[];
}

// TM Match Component
function TmMatch({ match, onUse, sourceSimilarity, highlightTerms = [] }: TmMatchProps) {
  // Function to highlight terms in the text
  const highlightText = (text: string) => {
    if (!highlightTerms.length) return text;
    
    // Create a regex to match any of the terms (case insensitive)
    const regex = new RegExp(`(${highlightTerms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    
    // Return the original text if no matches
    if (!regex.test(text)) return text;
    
    // Split the text on matches and create spans with highlights
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) => {
          // Check if part matches any term (case insensitive)
          const isMatch = highlightTerms.some(term => 
            part.toLowerCase() === term.toLowerCase()
          );
          
          return isMatch ? (
            <span key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-1">{part}</span>
          ) : (
            <span key={i}>{part}</span>
          );
        })}
      </>
    );
  };
  
  return (
    <div className="bg-accent/50 rounded-md p-3 mb-3">
      <div className="mb-1">
        <div className="font-mono text-sm">{highlightText(match.source)}</div>
      </div>
      <div className="font-mono text-xs text-muted-foreground mb-2">
        {highlightText(match.target)}
      </div>
      <div className="flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold">{sourceSimilarity}%</span> Match
        </div>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-6 text-xs" 
          onClick={() => onUse(match.target)}
        >
          Use Translation
        </Button>
      </div>
    </div>
  );
}

// Glossary Term Component
function GlossaryTerm({ term, onUse }: { term: Glossary, onUse: (term: string) => void }) {
  return (
    <div className="bg-accent/50 rounded-md p-3 mb-3">
      <div className="flex justify-between items-center mb-1">
        <div className="font-mono text-sm">{term.source}</div>
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold">Glossary</span>
        </div>
      </div>
      <div className="font-mono text-xs text-muted-foreground mb-2">
        {term.target}
      </div>
      <div className="flex justify-end">
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-6 text-xs" 
          onClick={() => onUse(term.target)}
        >
          Use Term
        </Button>
      </div>
    </div>
  );
}

export function SidePanel({
  tmMatches = [],
  glossaryTerms = [],
  selectedSegment,
  onUseTranslation,
  sourceLanguage,
  targetLanguage
}: SidePanelProps) {
  const [activeTab, setActiveTab] = useState("tm");
  const [tmSearchQuery, setTmSearchQuery] = useState("");
  const [tbSearchQuery, setTbSearchQuery] = useState("");
  const [globalTmResults, setGlobalTmResults] = useState<TranslationMemory[]>([]);
  const [globalGlossaryResults, setGlobalGlossaryResults] = useState<Glossary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSavingComment, setIsSavingComment] = useState(false);
  
  // Function to search TM globally
  const searchGlobalTM = async (query: string) => {
    if (!query.trim()) {
      setGlobalTmResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await apiRequest(
        "POST", 
        "/api/search_tm", 
        { 
          source: query,
          sourceLanguage,
          targetLanguage,
          limit: 10,
          fuzzy: true
        }
      );
      
      const data = await response.json();
      setGlobalTmResults(data);
    } catch (error) {
      console.error("Error searching TM globally:", error);
      setGlobalTmResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Function to search glossary globally
  const searchGlobalGlossary = async (query: string) => {
    if (!query.trim()) {
      setGlobalGlossaryResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      // Use the dedicated API function instead of making the request directly
      const results = await searchGlossaryTerms(query, sourceLanguage, targetLanguage);
      setGlobalGlossaryResults(results);
    } catch (error) {
      console.error("Error searching glossary globally:", error);
      setGlobalGlossaryResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Debounced global search when query changes
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (activeTab === "tm" && tmSearchQuery.length >= 2) {
        searchGlobalTM(tmSearchQuery);
      }
    }, 500);
    
    return () => clearTimeout(delaySearch);
  }, [tmSearchQuery, activeTab, sourceLanguage, targetLanguage]);
  
  // Debounced global glossary search
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (activeTab === "tb" && tbSearchQuery.length >= 2) {
        searchGlobalGlossary(tbSearchQuery);
      }
    }, 500);
    
    return () => clearTimeout(delaySearch);
  }, [tbSearchQuery, activeTab, sourceLanguage, targetLanguage]);
  
  // Clear search results when switching tabs
  useEffect(() => {
    setGlobalTmResults([]);
    setGlobalGlossaryResults([]);
  }, [activeTab]);
  
  // Load existing comment when selected segment changes
  useEffect(() => {
    if (selectedSegment) {
      setCommentText(selectedSegment.comment || "");
    } else {
      setCommentText("");
    }
  }, [selectedSegment]);
  
  // Get the current username (temporary solution - in real app this should come from the auth system)
  const getCurrentUsername = () => {
    return "Soohyun"; // Hard-coded for now, should come from auth context in real app
  };
  
  // Add a new comment to the segment
  const handleAddComment = async () => {
    if (!selectedSegment || !commentText.trim()) return;
    
    setIsSavingComment(true);
    try {
      // Use addComment function which handles getting the current segment and adding a new comment
      const updatedSegment = await addComment(
        selectedSegment.id,
        commentText.trim(),
        getCurrentUsername()
      );
      
      // Clear the input field after successful add
      setCommentText("");
      
      // Toast notification for success
      alert("Comment added successfully");
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Failed to add comment");
    } finally {
      setIsSavingComment(false);
    }
  };
  
  // Determine which TM matches to display
  const displayedTmMatches = tmSearchQuery.length >= 2 
    ? globalTmResults 
    : tmMatches;
    
  // Get glossary terms for highlighting in TM matches
  const glossarySourceTerms = glossaryTerms.map(term => term.source);
  
  return (
    <aside className="w-80 border-l border-border bg-card overflow-hidden flex flex-col">
      <Tabs defaultValue="tm" value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-border">
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
        </div>
        
        <TabsContent value="tm" className="flex-1 overflow-auto">
          <div className="p-4">
            <div className="text-sm font-medium mb-2">Translation Memory</div>
            
            <div className="mb-4">
              <div className="relative">
                <Input
                  placeholder="Search translation memory..."
                  className="pr-10"
                  value={tmSearchQuery}
                  onChange={(e) => setTmSearchQuery(e.target.value)}
                />
                <div 
                  className={`absolute right-2 top-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer ${isSearching ? 'animate-spin' : ''}`}
                  onClick={() => setTmSearchQuery("")}
                >
                  {isSearching ? (
                    <FileSearch className="h-4 w-4" />
                  ) : tmSearchQuery ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </div>
              </div>
              {tmSearchQuery.length > 0 && tmSearchQuery.length < 2 && (
                <p className="text-xs text-muted-foreground mt-1">Type at least 2 characters to search</p>
              )}
            </div>
            
            {/* Removed Active Segment section as requested */}
            
            {displayedTmMatches.length > 0 ? (
              <div className="space-y-4">
                {displayedTmMatches.map((match, index) => (
                  <TmMatch 
                    key={index} 
                    match={match} 
                    onUse={onUseTranslation} 
                    sourceSimilarity={
                      selectedSegment && match.source === selectedSegment.source ? 100 : 85
                    }
                    highlightTerms={glossarySourceTerms}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-accent/50 rounded-md p-3 text-sm text-muted-foreground">
                {isSearching ? (
                  "Searching translation memory..."
                ) : tmSearchQuery 
                  ? "No matches found for your search." 
                  : "No TM matches found for this segment."}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="tb" className="flex-1 overflow-auto">
          <div className="p-4">
            <div className="text-sm font-medium mb-2">Terminology Base</div>
            
            <div className="mb-4">
              <div className="relative">
                <Input
                  placeholder="Search terminology..."
                  className="pr-10"
                  value={tbSearchQuery}
                  onChange={(e) => setTbSearchQuery(e.target.value)}
                />
                <div 
                  className={`absolute right-2 top-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer ${isSearching ? 'animate-spin' : ''}`}
                  onClick={() => setTbSearchQuery("")}
                >
                  {isSearching ? (
                    <FileSearch className="h-4 w-4" />
                  ) : tbSearchQuery ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </div>
              </div>
              {tbSearchQuery.length > 0 && tbSearchQuery.length < 2 && (
                <p className="text-xs text-muted-foreground mt-1">Type at least 2 characters to search</p>
              )}
            </div>
            
            {/* Removed Active Segment section as requested */}
            
            {tbSearchQuery.length >= 2 ? (
              globalGlossaryResults.length > 0 ? (
                <div className="space-y-3">
                  {globalGlossaryResults.map((term, index) => (
                    <GlossaryTerm key={index} term={term} onUse={onUseTranslation} />
                  ))}
                </div>
              ) : (
                <div className="bg-accent/50 rounded-md p-3 text-sm text-muted-foreground">
                  {isSearching ? "Searching terminology..." : "No terms found for your search."}
                </div>
              )
            ) : (
              glossaryTerms.length > 0 ? (
                <div className="space-y-3">
                  {glossaryTerms.map((term, index) => (
                    <GlossaryTerm key={index} term={term} onUse={onUseTranslation} />
                  ))}
                </div>
              ) : (
                <div className="bg-accent/50 rounded-md p-3 text-sm text-muted-foreground">
                  No matching terms found in the glossary for this segment.
                </div>
              )
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="comments" className="flex-1 overflow-auto">
          <div className="p-4">
            <div className="text-sm font-medium mb-2">Comments</div>
            
            {/* Removed Active Segment section as requested */}
            
            <div className="space-y-4">
              {selectedSegment && selectedSegment.comments && selectedSegment.comments.length > 0 ? (
                <div className="space-y-3 mb-4">
                  <div className="font-medium text-xs text-muted-foreground">Comments History:</div>
                  {selectedSegment.comments.map((comment, index) => (
                    <div key={index} className="bg-accent/50 rounded-md p-3 text-sm">
                      <div className="flex items-center gap-1.5 mb-1 text-xs font-medium">
                        <User className="h-3 w-3" />
                        <span>{comment.username}</span>
                        <span className="text-muted-foreground ml-auto text-xs font-normal">
                          {new Date(comment.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap pl-1">{comment.text}</div>
                    </div>
                  ))}
                </div>
              ) : selectedSegment && selectedSegment.comment ? (
                <div className="bg-accent/50 rounded-md p-3 text-sm mb-4">
                  <div className="font-medium text-xs text-muted-foreground mb-1">Legacy Comment:</div>
                  <div className="whitespace-pre-wrap">{selectedSegment.comment}</div>
                </div>
              ) : (
                <div className="bg-accent/50 rounded-md p-3 text-sm text-muted-foreground text-center mb-4">
                  No comments available for this segment. Add a comment below.
                </div>
              )}
              
              <div className="space-y-2">
                <Textarea 
                  placeholder="Add a comment about this segment..." 
                  className="min-h-[80px] text-sm"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  disabled={!selectedSegment}
                />
                <div className="flex justify-end">
                  <Button 
                    size="sm"
                    className="text-xs"
                    onClick={handleAddComment}
                    disabled={!selectedSegment || isSavingComment || !commentText.trim()}
                  >
                    {isSavingComment ? (
                      <>
                        <FileSearch className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <MessageSquarePlus className="h-3.5 w-3.5 mr-1.5" />
                        Add Comment
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground mt-2">
                <span className="font-medium">Tip:</span> You can use simple Markdown in comments: 
                **bold**, *italic*, `code`, and • bullet points.
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="history" className="flex-1 overflow-auto">
          <div className="p-4">
            <div className="text-sm font-medium mb-2">Revision History</div>
            
            {/* Removed Active Segment section as requested */}
            
            <div className="space-y-3">              
              {selectedSegment ? (
                <>
                  <div className="border border-border rounded-md overflow-hidden">
                    <div className="bg-accent/30 px-3 py-2 border-b border-border flex justify-between items-center">
                      <div className="text-xs font-medium">Current Version</div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-semibold">{selectedSegment.status}</span> • 
                        <span className="font-semibold ml-1">{selectedSegment.origin}</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="font-mono text-xs">{selectedSegment.target || "(No translation)"}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Last modified: {new Date(selectedSegment.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="border border-muted rounded-md overflow-hidden opacity-60">
                    <div className="bg-muted/30 px-3 py-2 border-b border-border flex justify-between items-center">
                      <div className="text-xs font-medium">Previous Version</div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-semibold">Draft</span> • 
                        <span className="font-semibold ml-1">MT</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="font-mono text-xs">{selectedSegment.target || "(No translation)"}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Created: {new Date(selectedSegment.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-accent/50 rounded-md p-3 text-sm text-muted-foreground text-center">
                  Select a segment to view its revision history.
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
}