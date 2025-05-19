import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import {
  Search,
  X,
  Database,
  Lightbulb,
  MessageSquare,
  MessageSquarePlus,
  History,
  FileSearch,
  CheckCircle,
  XCircle,
  AlertCircle,
  PenLine,
  Bot,
  User,
  PenSquare,
  Circle,
  Info,
  Loader2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  type TranslationMemory,
  type Glossary,
  type TranslationUnit,
} from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { searchGlossaryTerms } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

interface SidePanelProps {
  tmMatches: TranslationMemory[];
  glossaryTerms: Glossary[];
  selectedSegment: TranslationUnit | null | undefined;
  onUseTranslation: (translation: string) => void;
  sourceLanguage: string;
  targetLanguage: string;
  onSegmentUpdated?: (id: number, newTarget: string) => void;
  previousVersions?: Record<number, string>;
  showStatusInfo?: boolean;
}

interface TmMatchProps {
  match: TranslationMemory;
  onUse: (translation: string) => void;
  sourceSimilarity: number;
  highlightTerms?: string[];
}

// TM Match Component
function TmMatch({
  match,
  onUse,
  sourceSimilarity,
  highlightTerms = [],
}: TmMatchProps) {
  const { t } = useTranslation();
  const [isApplying, setIsApplying] = useState(false);

  // Function to highlight terms in the text
  const highlightText = (text: string) => {
    if (!highlightTerms.length) return text;

    // Create a regex to match any of the terms (case insensitive)
    const regex = new RegExp(
      `(${highlightTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
      "gi",
    );

    // Return the original text if no matches
    if (!regex.test(text)) return text;

    // Split the text on matches and create spans with highlights
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) => {
          // Check if part matches any term (case insensitive)
          const isMatch = highlightTerms.some(
            (term) => part.toLowerCase() === term.toLowerCase(),
          );

          return isMatch ? (
            <span
              key={i}
              className="bg-yellow-200 dark:bg-yellow-800 rounded px-1"
            >
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          );
        })}
      </>
    );
  };

  // 최적화된 UI 업데이트를 위한 함수
  const handleUseTranslation = useCallback(() => {
    setIsApplying(true);

    try {
      // 즉시 UI 피드백을 위해 바로 번역 적용
      onUse(match.target);

      // 성공 토스트 메시지 표시
      toast({
        title: "번역 적용됨",
        description: "선택한 번역이 세그먼트에 적용되었습니다.",
        variant: "default",
      });
    } catch (error) {
      // 오류 발생시 토스트 메시지 표시
      toast({
        title: "번역 적용 실패",
        description:
          "번역을 적용하는 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
      console.error("번역 적용 중 오류:", error);
    } finally {
      // 시각적 피드백을 위해 약간의 딜레이 후 버튼 상태 복원
      setTimeout(() => {
        setIsApplying(false);
      }, 500);
    }
  }, [match.target, onUse]);

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
          className={cn(
            "h-6 text-xs transition-all duration-200",
            isApplying && "bg-primary/10",
          )}
          onClick={handleUseTranslation}
          disabled={isApplying}
        >
          {isApplying ? (
            <>
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              적용 중...
            </>
          ) : (
            "            {t('sidePanel.useTranslation')}"
          )}
        </Button>
      </div>
    </div>
  );
}

// Segment Status Info Component
function StatusInfoPanel({
  segment,
}: {
  segment: TranslationUnit | null | undefined;
}) {
  if (!segment) {
    return (
      <div className="bg-muted/50 rounded-md p-4 text-center text-muted-foreground">
        <Info className="h-5 w-5 mx-auto mb-2 opacity-50" />
        <p className="text-sm">
          Select a segment to view its status information
        </p>
      </div>
    );
  }

  // Get appropriate icon for status
  const getStatusIcon = () => {
    switch (segment.status) {
      case "Reviewed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "Rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "Edited":
        return <PenLine className="h-4 w-4 text-purple-500" />;
      case "100%":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "Fuzzy":
        return <Circle className="h-4 w-4 text-yellow-500" />;
      case "MT":
      default:
        return <Bot className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get color for status badge
  const getStatusColor = () => {
    switch (segment.status) {
      case "Reviewed":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900";
      case "Rejected":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900";
      case "Edited":
        return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-900";
      case "100%":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900";
      case "Fuzzy":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900";
      case "MT":
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-900";
    }
  };

  // Get status description
  const getStatusDescription = () => {
    switch (segment.status) {
      case "Reviewed":
        return "Final approved version";
      case "Rejected":
        return "Marked as incorrect";
      case "Edited":
        return "Modified by human";
      case "100%":
        return "Exact match from TM";
      case "Fuzzy":
        return "Partial match from TM";
      case "MT":
      default:
        return "Machine translated";
    }
  };

  return (
    <div className="bg-card rounded-md border p-4 mb-4">
      <h3 className="text-sm font-medium mb-3">Segment Information</h3>

      <div className="space-y-3">
        {/* Status */}
        <div className="flex items-start gap-3">
          <div className="bg-muted/50 rounded-full p-2">{getStatusIcon()}</div>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-1">Status</div>
            <div className="flex items-center gap-2">
              <Badge className={cn("font-normal", getStatusColor())}>
                {segment.status || "MT"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {getStatusDescription()}
              </span>
            </div>
          </div>
        </div>

        {/* Comment */}
        {segment.comment && (
          <div className="flex items-start gap-3">
            <div className="bg-muted/50 rounded-full p-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground mb-1">Comment</div>
              <div className="text-sm bg-muted/30 p-2 rounded">
                {segment.comment}
              </div>
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="pt-2">
          <Separator className="mb-3" />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground mb-1">Created</div>
              <div>{new Date(segment.createdAt).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Updated</div>
              <div>{new Date(segment.updatedAt).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Glossary Term Component
function GlossaryTerm({
  term,
  onUse,
}: {
  term: Glossary;
  onUse: (term: string) => void;
}) {
  const [isApplying, setIsApplying] = useState(false);

  // 최적화된 UI 업데이트를 위한 함수
  const handleUseTerm = useCallback(() => {
    setIsApplying(true);

    try {
      // 즉시 UI 피드백을 위해 바로 용어 적용
      onUse(term.target);

      // 성공 토스트 메시지 표시
      toast({
        title: "용어 적용됨",
        description: "선택한 용어가 세그먼트에 적용되었습니다.",
        variant: "default",
      });
    } catch (error) {
      // 오류 발생시 토스트 메시지 표시
      toast({
        title: "용어 적용 실패",
        description:
          "용어를 적용하는 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
      console.error("용어 적용 중 오류:", error);
    } finally {
      // 시각적 피드백을 위해 약간의 딜레이 후 버튼 상태 복원
      setTimeout(() => {
        setIsApplying(false);
      }, 500);
    }
  }, [term.target, onUse]);

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
          className={cn(
            "h-6 text-xs transition-all duration-200",
            isApplying && "bg-primary/10",
          )}
          onClick={handleUseTerm}
          disabled={isApplying}
        >
          {isApplying ? (
            <>
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              적용 중...
            </>
          ) : (
            "Use Term"
          )}
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
  targetLanguage,
  onSegmentUpdated,
  previousVersions: propPreviousVersions,
  showStatusInfo = false,
}: SidePanelProps) {
  const [activeTab, setActiveTab] = useState("tm");
  const [tmSearchQuery, setTmSearchQuery] = useState("");
  const [tbSearchQuery, setTbSearchQuery] = useState("");
  const [globalTmResults, setGlobalTmResults] = useState<TranslationMemory[]>(
    [],
  );
  const [globalGlossaryResults, setGlobalGlossaryResults] = useState<
    Glossary[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [previousVersions, setPreviousVersions] = useState<
    Record<number, string>
  >({});
  const [commentText, setCommentText] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Function to search TM globally
  const searchGlobalTM = async (query: string) => {
    if (!query.trim()) {
      setGlobalTmResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await apiRequest("POST", "/api/search_tm", {
        source: query,
        sourceLanguage,
        targetLanguage,
        limit: 10,
        fuzzy: true,
      });

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
      const results = await searchGlossaryTerms(
        query,
        sourceLanguage,
        targetLanguage,
      );
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

  // Initialize local previous versions state from props
  useEffect(() => {
    if (propPreviousVersions && Object.keys(propPreviousVersions).length > 0) {
      setPreviousVersions(propPreviousVersions);
    }
  }, [propPreviousVersions]);

  // 댓글 추가 기능 구현
  const handleAddComment = useCallback(async () => {
    if (!commentText.trim() || !selectedSegment) return;

    setIsAddingComment(true);

    try {
      const response = await apiRequest("POST", `/api/segments/${selectedSegment.id}/comments`, {
        text: commentText,
        segmentId: selectedSegment.id
      });

      if (!response.ok) {
        throw new Error(`Failed to add comment: ${response.status}`);
      }

      const result = await response.json();
      
      if (!selectedSegment) return;

      // 새로운 댓글 객체 생성
      const newComment = {
        id: result.id,
        text: commentText,
        author: "User",
        createdAt: new Date().toISOString()
      };

      // selectedSegment를 완전히 새로운 객체로 복사
      const updatedSegment = {
        ...selectedSegment,
        comments: selectedSegment.comments ? 
          [...selectedSegment.comments, newComment] : 
          [newComment]
      };

      // 상태 업데이트
      setSelectedSegment(updatedSegment);

      // 부모 컴포넌트에 변경 알림
      if (onSegmentUpdated) {
        onSegmentUpdated(updatedSegment.id, updatedSegment.target || '');
      }

      // 입력란 초기화
      setCommentText("");
      setIsAddingComment(false);

      // 성공 메시지 표시
      toast({
        title: "댓글 추가됨",
        description: "댓글이 성공적으로 추가되었습니다.",
        variant: "default",
      });

    } catch (error) {
      console.error("댓글 추가 중 오류:", error);
      toast({
        title: "댓글 추가 실패",
        description: "댓글 추가 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
      console.error("댓글 추가 중 오류:", error);
    } finally {
      setIsAddingComment(false);
    }
  }, [commentText, selectedSegment, onSegmentUpdated]);

  // Determine which TM matches to display
  const displayedTmMatches =
    tmSearchQuery.length >= 2 ? globalTmResults : tmMatches;

  // Get glossary terms for highlighting in TM matches
  const glossarySourceTerms = glossaryTerms.map((term) => term.source);

  return (
    <aside className="w-80 border-l border-border bg-card min-h-screen flex flex-col overflow-hidden">
      <Tabs
        defaultValue="tm"
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col h-full"
      >
        {/* 고정 탭 영역 - 최상단에 sticky로 고정 */}
        <div className="px-4 py-3 border-b border-border bg-card z-50 shadow-md sticky top-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger
              value="tm"
              className="flex items-center justify-center"
            >
              <Database className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">TM</span>
            </TabsTrigger>

            <TabsTrigger
              value="tb"
              className="flex items-center justify-center"
            >
              <Lightbulb className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Terms</span>
            </TabsTrigger>

            <TabsTrigger
              value="comments"
              className="flex items-center justify-center"
            >
              <MessageSquare className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Comments</span>
            </TabsTrigger>

            <TabsTrigger
              value="history"
              className="flex items-center justify-center"
            >
              <History className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="tm" className="flex-1 overflow-y-auto">
          <div className="p-4 pt-2">
            {/* Segment Status Info Panel - 요청에 따라 제거 */}
            {activeTab === "tm" && showStatusInfo && (
              <StatusInfoPanel segment={selectedSegment} />
            )}

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
                  className={`absolute right-2 top-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer ${isSearching ? "animate-spin" : ""}`}
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
                <p className="text-xs text-muted-foreground mt-1">
                  Type at least 2 characters to search
                </p>
              )}
            </div>

            {/* TM Matches list */}
            {displayedTmMatches.length > 0 ? (
              <div className="space-y-4">
                {displayedTmMatches.map((match, index) => (
                  <TmMatch
                    key={index}
                    match={match}
                    onUse={onUseTranslation}
                    sourceSimilarity={
                      selectedSegment && match.source === selectedSegment.source
                        ? 100
                        : 85
                    }
                    highlightTerms={glossarySourceTerms}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-accent/50 rounded-md p-3 text-sm text-muted-foreground">
                {isSearching
                  ? "Searching translation memory..."
                  : tmSearchQuery
                    ? "No matches found for your search."
                    : "No TM matches found for this segment."}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tb" className="flex-1 overflow-y-auto">
          <div className="p-4 pt-2">
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
                  className={`absolute right-2 top-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer ${isSearching ? "animate-spin" : ""}`}
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
                <p className="text-xs text-muted-foreground mt-1">
                  Type at least 2 characters to search
                </p>
              )}
            </div>

            {/* Removed Active Segment section as requested */}

            {tbSearchQuery.length >= 2 ? (
              globalGlossaryResults.length > 0 ? (
                <div className="space-y-3">
                  {globalGlossaryResults.map((term, index) => (
                    <GlossaryTerm
                      key={index}
                      term={term}
                      onUse={onUseTranslation}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-accent/50 rounded-md p-3 text-sm text-muted-foreground">
                  {isSearching
                    ? "Searching terminology..."
                    : "No terms found for your search."}
                </div>
              )
            ) : glossaryTerms.length > 0 ? (
              <div className="space-y-3">
                {glossaryTerms.map((term, index) => (
                  <GlossaryTerm
                    key={index}
                    term={term}
                    onUse={onUseTranslation}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-accent/50 rounded-md p-3 text-sm text-muted-foreground">
                No matching terms found in the glossary for this segment.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="comments" className="flex-1 overflow-y-auto">
          <div className="p-4 pt-2">
            <div className="text-sm font-medium mb-2">Comments</div>

            {/* Removed Active Segment section as requested */}

            <div className="space-y-4">
              {/* 댓글 목록 표시 */}
              {selectedSegment?.comments && selectedSegment.comments.length > 0 ? (
                <div className="space-y-3">
                  {selectedSegment.comments.map((comment, index) => (
                    <div key={index} className="bg-accent/50 rounded-md p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium">{comment.author || 'User'}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm mt-2">{comment.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-accent/50 rounded-md p-3 text-sm text-muted-foreground text-center mb-4">
                  No comments available for this segment. Add a comment below.
                </div>
              )}

              <div className="space-y-2">
                <Textarea
                  placeholder="Add a comment about this segment..."
                  className="min-h-[100px] text-sm"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className={cn(
                      "text-xs transition-all duration-200",
                      isAddingComment && "bg-primary/10",
                    )}
                    onClick={handleAddComment}
                    disabled={isAddingComment || !commentText.trim()}
                  >
                    {isAddingComment ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        추가 중...
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
                <span className="font-medium">Tip:</span> You can use simple
                Markdown in comments: **bold**, *italic*, `code`, and • bullet
                points.
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-y-auto">
          <div className="p-4 pt-2">
            <div className="text-sm font-medium mb-2">Revision History</div>

            {/* Removed Active Segment section as requested */}

            <div className="space-y-3">
              {selectedSegment ? (
                <>
                  <div className="border border-border rounded-md overflow-hidden">
                    <div className="bg-accent/30 px-3 py-2 border-b border-border flex justify-between items-center">
                      <div className="text-xs font-medium">Current Version</div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-semibold">
                          {selectedSegment.status}
                        </span>{" "}
                        •
                        <span className="font-semibold ml-1">
                          {selectedSegment.origin}
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="font-mono text-xs">
                        {selectedSegment.target || "(No translation)"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Last modified:{" "}
                        {new Date(selectedSegment.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Only display previous version if it exists and is different from current version */}
                  {selectedSegment.id &&
                  previousVersions[selectedSegment.id] &&
                  previousVersions[selectedSegment.id] !==
                    selectedSegment.target ? (
                    <div className="border border-muted rounded-md overflow-hidden opacity-80">
                      <div className="bg-muted/30 px-3 py-2 border-b border-border flex justify-between items-center">
                        <div className="text-xs font-medium">
                          Previous Version
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="font-semibold">
                            {selectedSegment.status === "Reviewed"
                              ? "Draft"
                              : selectedSegment.status}
                          </span>
                          {selectedSegment.origin && (
                            <>
                              <span className="mx-1">•</span>
                              <span className="font-semibold">
                                {selectedSegment.origin === "HT"
                                  ? "MT"
                                  : selectedSegment.origin}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="font-mono text-xs">
                          {previousVersions[selectedSegment.id] ||
                            "(No translation)"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Last edited: {new Date().toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-accent/50 rounded-md p-3 text-sm text-muted-foreground text-center">
                      No previous versions available for this segment. Previous
                      versions will appear when you edit and save a segment.
                    </div>
                  )}
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