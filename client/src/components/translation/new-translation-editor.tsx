import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Save,
  Download,
  Languages,
  AlertCircle,
  Check,
  X,
  FileCheck,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  ListFilter,
  Search,
} from "lucide-react";
import { EditableSegment } from "./editable-segment";
import { Progress } from "@/components/ui/progress";
import { SidePanel } from "./side-panel";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { saveToTM } from "@/lib/api";
import {
  type TranslationUnit,
  type TranslationMemory,
  type Glossary,
  type StatusType,
} from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useSegments } from "@/hooks/useSegments";
import { useSegmentMutation } from "@/hooks/mutations/useSegmentMutation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TranslationEditorProps {
  fileName: string;
  sourceLanguage: string;
  targetLanguage: string;
  segments?: TranslationUnit[]; // 기존 호환성 유지
  fileId: number;
  onSave?: () => void;
  onExport?: () => void;
}

export function NewTranslationEditor({
  fileName,
  sourceLanguage,
  targetLanguage,
  segments: propSegments,
  fileId,
  onSave,
  onExport,
}: TranslationEditorProps) {
  const { toast } = useToast();

  // Side panel toggle state
  const [showSidePanel, setShowSidePanel] = useState(true);

  // React Query로 segments 상태 관리
  const {
    segments = [],
    isLoading,
    isError,
    updateSegment: updateSegmentFromHook
  } = useSegments(fileId);

  // Segment mutation 훅 사용
  const { mutate: updateSegmentMutation } = useSegmentMutation();

  // 로컬 필터링 상태
  const [filteredSegments, setFilteredSegments] = useState<TranslationUnit[]>(
    [],
  );
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(
    null,
  );
  const [tmMatches, setTmMatches] = useState<TranslationMemory[]>([]);
  const [glossaryTerms, setGlossaryTerms] = useState<Glossary[]>([]);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [translatedCount, setTranslatedCount] = useState(0);
  const [totalToTranslate, setTotalToTranslate] = useState(0);
  const [checkedSegments, setCheckedSegments] = useState<
    Record<number, boolean>
  >({});

  // Get count of checked segments for bulk actions
  const checkedCount = Object.values(checkedSegments).filter(Boolean).length;

  // State to track previous versions of segments for history
  const [previousVersions, setPreviousVersions] = useState<
    Record<number, string>
  >({});

  // Filter and pagination states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<string>("all");

  // Track status counts for progress bar
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [segmentsPerPage, setSegmentsPerPage] = useState<number>(10);
  const [paginationMode, setPaginationMode] = useState<
    "pagination" | "infinite"
  >("infinite");
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);

  // 로딩 및 에러 상태는 모든 훅이 호출된 이후 렌더링 시점에서 처리합니다

  // Apply filters and update filtered segments
  useEffect(() => {
    if (!segments) return;

    const filtered = segments.filter(segment => {
      const statusMatch = statusFilter === "all" || segment.status === statusFilter;
      const originMatch = originFilter === "all" || segment.origin === originFilter;
      return statusMatch && originMatch;
    });

    // 이전 필터링된 세그먼트와 비교하여 변경이 있을 때만 상태 업데이트
    setFilteredSegments(prevFiltered => {
      if (JSON.stringify(prevFiltered) === JSON.stringify(filtered)) {
        return prevFiltered;
      }
      return filtered;
    });
  }, [segments, statusFilter, originFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [segments, statusFilter, originFilter]);

  // Synchronize heights for source and target panels
  useEffect(() => {
    const sourcePanel = document.getElementById("source-panel");
    const targetPanel = document.getElementById("target-panel");

    if (!sourcePanel || !targetPanel) return;

    // Dummy variable to store timeout ID
    let syncTimeoutId: NodeJS.Timeout | null = null;

    // Synchronize heights of corresponding source and target segments
    const syncSegmentHeights = () => {
      const sourceDivs =
        sourcePanel.querySelectorAll<HTMLElement>(".segment-row");
      const targetDivs =
        targetPanel.querySelectorAll<HTMLElement>(".segment-row");

      if (sourceDivs.length !== targetDivs.length) return;

      for (let i = 0; i < sourceDivs.length; i++) {
        const sourceSegment = sourceDivs[i];
        const targetSegment = targetDivs[i];

        if (sourceSegment && targetSegment) {
          // Reset heights first to ensure proper measurement
          sourceSegment.style.height = "auto";
          targetSegment.style.height = "auto";

          // Get natural heights
          const sourceHeight = sourceSegment.getBoundingClientRect().height;
          const targetHeight = targetSegment.getBoundingClientRect().height;

          // Set both to the maximum height
          const maxHeight = Math.max(sourceHeight, targetHeight);
          sourceSegment.style.height = `${maxHeight}px`;
          targetSegment.style.height = `${maxHeight}px`;

          // Make both segments have equal width within their containers
          sourceSegment.style.minWidth = "100%";
          targetSegment.style.minWidth = "100%";
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
    const sourceElements =
      sourcePanel.querySelectorAll<HTMLElement>(".segment-row");
    const targetElements =
      targetPanel.querySelectorAll<HTMLElement>(".segment-row");

    sourceElements.forEach((row) => resizeObserver.observe(row));
    targetElements.forEach((row) => resizeObserver.observe(row));

    return () => {
      if (syncTimeoutId) clearTimeout(syncTimeoutId);
      resizeObserver.disconnect();
    };
  }, [segments?.length]);

  // Get selected segment
  const selectedSegment =
    selectedSegmentId && segments
      ? segments.find((segment) => segment.id === selectedSegmentId)
      : null;

  // Calculate progress
  const completedSegments = segments
    ? segments.filter(
        (segment) => segment.target && segment.target.trim() !== "",
      ).length
    : 0;

  const progressPercentage =
    segments && segments.length > 0
      ? Math.round((completedSegments / segments.length) * 100)
      : 0;

  // Calculate status counts only when segments actually change
  useEffect(() => {
    if (segments) {
      const counts = countSegmentStatuses(segments);
      if (JSON.stringify(counts) !== JSON.stringify(statusCounts)) {
        setStatusCounts(counts);
      }
    }
  }, [segments, statusCounts]);

  // Search TM for selected segment
  const searchTM = async (source: string) => {
    try {
      const response = await apiRequest("POST", "/api/search_tm", {
        source,
        sourceLanguage,
        targetLanguage,
        limit: 5,
      });

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
        `/api/glossary?sourceLanguage=${sourceLanguage}&targetLanguage=${targetLanguage}`,
      );

      const allTerms = await response.json();

      // Filter terms that appear in the source text
      const matchingTerms = allTerms.filter((term: Glossary) =>
        source.toLowerCase().includes(term.source.toLowerCase()),
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

    if (!segments) return;

    const segment = segments.find((s) => s.id === id);
    if (segment) {
      // Store the current translation when selecting a segment for history tracking
      if (segment.target) {
        setPreviousVersions((prev) => ({
          ...prev,
          [id]: segment.target || "",
        }));
      }

      // Search TM and glossary in parallel
      await Promise.all([
        searchTM(segment.source),
        searchGlossary(segment.source),
      ]);
    }
  };

  // 이미 React Query를 통해 updateSegment가 사용 가능함
  // updateSegment, debouncedUpdateSegment 자동으로 캐시와 UI 갱신

  const handleSegmentUpdate = async (
    id: number,
    target: string,
    status?: string,
    origin?: string,
  ) => {
    try {
      if (!segments) return;

      const currentSegment = segments.find((s) => s.id === id);
      if (!currentSegment) return;

      const wasModified = currentSegment.target !== target;
      const updatedStatus = status || (wasModified ? "Edited" : currentSegment.status);
      const updatedOrigin = origin || 
        (wasModified && (currentSegment.origin === "MT" || currentSegment.origin === "100%" || currentSegment.origin === "Fuzzy") 
          ? "HT" 
          : currentSegment.origin);

      // React Query mutation 직접 사용
      updateSegmentMutation(
        {
          id,
          target,
          status: updatedStatus,
          origin: updatedOrigin,
          fileId,
        },
        {
          onSuccess: () => {
            // 히스토리 트래킹
            if (selectedSegmentId === id && currentSegment.target && currentSegment.target !== target) {
              if (!previousVersions[id]) {
                setPreviousVersions((prev) => ({
                  ...prev,
                  [id]: currentSegment.target || "",
                }));
              }
            }
          },
          onError: (error) => {
            console.error("Error updating segment:", error);
            toast({
              title: "Error",
              description: "Failed to update segment",
              variant: "destructive",
            });
          },
        }
      );
    } catch (error) {
      console.error("Error updating segment:", error);
      toast({
        title: "Error",
        description: "Failed to update segment",
        variant: "destructive",
      });
    }
  };

  // Handle translation with GPT for a single segment
  const handleTranslateWithGPT = async (id: number) => {
    if (!segments) return;

    const segment = segments.find((s) => s.id === id);
    if (!segment) return;

    try {
      const response = await apiRequest("POST", "/api/translate", {
        source: segment.source,
        sourceLanguage,
        targetLanguage,
      });

      const data = await response.json();

      if (data.target) {
        await handleSegmentUpdate(id, data.target, "MT", "MT");
        toast({
          title: "Translation Complete",
          description: "Segment translated with GPT",
        });
      }
    } catch (error) {
      console.error("Error translating with GPT:", error);
      toast({
        title: "Translation Error",
        description: "Failed to translate segment with GPT",
        variant: "destructive",
      });
    }
  };

  // Handle batch translation with GPT
  const handleBatchTranslation = async () => {
    if (!segments) return;

    // Find segments without translation
    const untranslatedSegments = segments.filter(
      (s) => !s.target || s.target.trim() === "",
    );

    if (untranslatedSegments.length === 0) {
      toast({
        title: "No segments to translate",
        description: "All segments already have translations",
      });
      return;
    }

    setIsTranslatingAll(true);
    setTranslatedCount(0);
    setTotalToTranslate(untranslatedSegments.length);

    // 현재 segments 데이터로 작업합니다
    if (!segments) {
      toast({
        title: "Error",
        description: "No segments available to translate",
        variant: "destructive",
      });
      return;
    }

    const updatedSegments = [...segments];

    // Translate segments sequentially to avoid overloading the API
    for (let i = 0; i < untranslatedSegments.length; i++) {
      const segment = untranslatedSegments[i];
      try {
        const response = await apiRequest("POST", "/api/translate", {
          source: segment.source,
          sourceLanguage,
          targetLanguage,
        });

        const data = await response.json();

        if (data.target) {
          // Update the segment in the database
          await apiRequest("PATCH", `/api/segments/${segment.id}`, {
            target: data.target,
            status: "MT",
            origin: "MT",
          });

          // Update our local copy
          const segmentIndex = updatedSegments.findIndex(
            (s) => s.id === segment.id,
          );
          if (segmentIndex !== -1) {
            updatedSegments[segmentIndex] = {
              ...updatedSegments[segmentIndex],
              target: data.target,
              status: "MT", // Using the new status model
              origin: "MT",
            };
          }

          // Update the counter - UI will be automatically refreshed by React Query
          setTranslatedCount(i + 1);
          // No need to call setLocalSegments as React Query will handle the updates
        }
      } catch (error) {
        console.error(`Error translating segment ${segment.id}:`, error);
        // Continue with next segment even if one fails
      }
    }

    setIsTranslatingAll(false);
    toast({
      title: "Batch Translation Complete",
      description: `Translated ${untranslatedSegments.length} segments with GPT`,
    });
  };

  // Implement save file function with TM update for reviewed segments
  const handleSaveFile = async () => {
    try {
      if (!segments) return;

      // With React Query, all segment changes are already saved to the database
      // immediately through the updateSegment and debouncedUpdateSegment functions

      // Find all reviewed segments to save to TM
      const reviewedSegments = segments.filter(
        (segment) =>
          segment.status === "Reviewed" &&
          segment.target &&
          segment.target.trim() !== "",
      );

      // Save reviewed segments to translation memory
      const tmPromises = reviewedSegments.map((segment) => {
        return saveToTM(
          segment.source,
          segment.target || "",
          segment.status,
          sourceLanguage,
          targetLanguage,
          fileName, // File name as context
        );
      });

      await Promise.all(tmPromises);

      // Call the onSave prop if provided
      if (onSave) {
        onSave();
      }

      // No need to manually recalculate status counts here
      // The useEffect hook will handle it automatically when segments changes

      toast({
        title: "Save Complete",
        description: `Saved ${segments?.length || 0} segments. ${reviewedSegments.length} reviewed segments stored to TM.`,
      });
    } catch (error) {
      console.error("Error saving file:", error);
      toast({
        title: "Save Error",
        description: "Failed to save file. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle checkbox change for a segment
  const handleCheckboxChange = (id: number, checked: boolean) => {
    setCheckedSegments((prev) => ({
      ...prev,
      [id]: checked,
    }));
  };

  // Handle "Select All" for segments
  const handleSelectAll = () => {
    const newCheckedState: Record<number, boolean> = {};
    segments?.forEach((segment: TranslationUnit) => {
      newCheckedState[segment.id] = true;
    });
    setCheckedSegments(newCheckedState);
  };

  // Handle "Unselect All" for segments
  const handleUnselectAll = () => {
    setCheckedSegments({});
  };

  // Handle bulk status update
  const handleBulkStatusUpdate = async (status: string) => {
    // Get all checked segments
    const checkedIds = Object.entries(checkedSegments)
      .filter(([_, isChecked]) => isChecked)
      .map(([id]) => parseInt(id));

    if (checkedIds.length === 0) {
      toast({
        title: "No segments selected",
        description: "Please select segments to update",
      });
      return;
    }

    // Update segments in parallel
    try {
      const promises = checkedIds.map((id) => {
        const segment = segments?.find((s: TranslationUnit) => s.id === id);
        if (!segment) return Promise.resolve();

        // Keep target text, just update status
        return apiRequest("PATCH", `/api/segments/${id}`, {
          target: segment.target || "",
          status,
          // If status is Reviewed and origin isn't already set to HT,
          // and the segment has been modified, set it to HT
          origin:
            status === "Reviewed" && segment.target && segment.origin !== "HT"
              ? "HT"
              : segment.origin,
        });
      });

      await Promise.all(promises);

      // React Query를 사용하면 서버에서 변경된 데이터가 자동으로 업데이트됩니다.
      // 쿼리를 명시적으로 무효화하여 최신 데이터를 가져오도록 합니다.
      queryClient.invalidateQueries({ queryKey: ["segments", fileId] });

      toast({
        title: "Status Update Complete",
        description: `Updated ${checkedIds.length} segments to ${status}`,
      });

      // Clear selection after successful update
      setCheckedSegments({});
    } catch (error) {
      console.error("Error updating segment statuses:", error);
      toast({
        title: "Error",
        description: "Failed to update segment statuses",
        variant: "destructive",
      });
    }
  };

  // Pagination related calculations

  // Calculate pagination
  const totalPages = Math.ceil(filteredSegments.length / segmentsPerPage);
  const startIndex = (currentPage - 1) * segmentsPerPage;
  const endIndex =
    paginationMode === "pagination"
      ? Math.min(startIndex + segmentsPerPage, filteredSegments.length)
      : filteredSegments.length;

  // Get current page segments
  const currentSegments = filteredSegments.slice(
    0,
    paginationMode === "pagination" ? endIndex : undefined,
  );

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Toggle pagination mode
  const togglePaginationMode = () => {
    setPaginationMode((prev) =>
      prev === "pagination" ? "infinite" : "pagination",
    );
    setCurrentPage(1);
  };

  // Count by origin
  const originCounts = segments?.reduce(
    (acc: Record<string, number>, segment: TranslationUnit) => {
      if (segment.origin) {
        acc[segment.origin] = (acc[segment.origin] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  // Helper function to count segment statuses
  const countSegmentStatuses = (segments: TranslationUnit[]): Record<string, number> => {
    const counts: Record<string, number> = {};
    segments.forEach((segment) => {
      const status = segment.status || "MT";
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  };

  // 로딩 상태 및 에러 처리
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-center">
          <div className="h-8 w-40 bg-accent rounded-full mx-auto mb-4"></div>
          <div className="h-4 w-60 bg-accent rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Failed to load segments
          </h3>
          <p className="text-muted-foreground mb-4">
            There was an error loading translation segments.
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col">
      {/* Progress bar with integrated controls - Fixed at the top */}
      <div className="bg-card border-b border-border py-2 px-4 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex-1">
            <div className="h-2.5 rounded-full bg-secondary overflow-hidden flex">
              {/* Reviewed segments (green) */}
              <div
                className="h-full bg-green-300"
                style={{
                  width: `${((statusCounts["Reviewed"] || 0) / (segments?.length || 1)) * 100}%`,
                }}
              />
              {/* 100% segments (blue) */}
              <div
                className="h-full bg-blue-300"
                style={{
                  width: `${((statusCounts["100%"] || 0) / (segments?.length || 1)) * 100}%`,
                }}
              />
              {/* Fuzzy segments (yellow) */}
              <div
                className="h-full bg-yellow-300"
                style={{
                  width: `${((statusCounts["Fuzzy"] || 0) / (segments?.length || 1)) * 100}%`,
                }}
              />
              {/* MT segments (gray) */}
              <div
                className="h-full bg-gray-300"
                style={{
                  width: `${((statusCounts["MT"] || 0) / (segments?.length || 1)) * 100}%`,
                }}
              />
              {/* Edited segments (purple) */}
              <div
                className="h-full bg-purple-300"
                style={{
                  width: `${((statusCounts["Edited"] || 0) / (segments?.length || 1)) * 100}%`,
                }}
              />
              {/* Rejected segments (red) */}
              <div
                className="h-full bg-red-300"
                style={{
                  width: `${((statusCounts["Rejected"] || 0) / (segments?.length || 1)) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            {statusCounts["Reviewed"] || 0}/{segments?.length || 0} Reviewed
          </div>

          <div className="flex items-center gap-4 ml-1">
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-7 w-[90px] text-xs">
                  <SelectValue placeholder="Filter by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Filter by</SelectItem>
                  <SelectItem value="MT">
                    MT ({statusCounts["MT"] || 0})
                  </SelectItem>
                  <SelectItem value="100%">
                    100% Match ({statusCounts["100%"] || 0})
                  </SelectItem>
                  <SelectItem value="Fuzzy">
                    Fuzzy Match ({statusCounts["Fuzzy"] || 0})
                  </SelectItem>
                  <SelectItem value="Edited">
                    Edited ({statusCounts["Edited"] || 0})
                  </SelectItem>
                  <SelectItem value="Reviewed">
                    Reviewed ({statusCounts["Reviewed"] || 0})
                  </SelectItem>
                  <SelectItem value="Rejected">
                    Rejected ({statusCounts["Rejected"] || 0})
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                onValueChange={(value) => {
                  if (value !== "none" && checkedCount > 0) {
                    handleBulkStatusUpdate(value as StatusType);
                  }
                }}
              >
                <SelectTrigger className="h-7 w-[90px] text-xs">
                  <SelectValue placeholder="Set as..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MT">MT</SelectItem>
                  <SelectItem value="100%">100% Match</SelectItem>
                  <SelectItem value="Fuzzy">Fuzzy Match</SelectItem>
                  <SelectItem value="Edited">Edited</SelectItem>
                  <SelectItem value="Reviewed">Reviewed</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Select All Checkbox */}
            <div className="flex items-center space-x-1.5">
              <Checkbox
                id="toggle-select-all"
                checked={
                  Object.keys(checkedSegments).length > 0 &&
                  segments &&
                  Object.keys(checkedSegments).length === segments.length
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleSelectAll();
                  } else {
                    handleUnselectAll();
                  }
                }}
              />
              <div className="flex items-center">
                <label
                  htmlFor="toggle-select-all"
                  className="text-xs font-medium ml-1 cursor-pointer"
                >
                  {checkedCount}/{segments?.length || 0}
                </label>
              </div>
            </div>

            {/* Side panel toggle button - placed at the end */}
            <div className="ml-auto flex items-center">
              <Button
                size="sm"
                variant={showSidePanel ? "default" : "outline"}
                onClick={() => setShowSidePanel(!showSidePanel)}
                className="h-7 w-7 p-0"
                title={showSidePanel ? "Hide side panel" : "Show side panel"}
              >
                {showSidePanel ? (
                  <ChevronRight className="h-3.5 w-3.5" />
                ) : (
                  <ChevronLeft className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4 flex-1">
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search in segments..."
              className="pl-8"
              onChange={(e) => {
                const searchText = e.target.value.toLowerCase();
                if (!searchText || !segments) return;

                for (let i = 0; i < segments.length; i++) {
                  const segment = segments[i];
                  if (
                    segment.source.toLowerCase().includes(searchText) ||
                    (segment.target && segment.target.toLowerCase().includes(searchText))
                  ) {
                    const element = document.getElementById(`segment-${segment.id}`);
                    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    break;
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
      </div>

      {/* Warning for batch translation */}
      {isTranslatingAll && (
        <div className="bg-warning/10 border-y border-warning/20 px-4 py-2 flex items-center">
          <AlertCircle className="h-4 w-4 text-warning mr-2" />
          <span className="text-sm">
            Batch translation in progress. Please wait... ({translatedCount}/
            {totalToTranslate})
          </span>
        </div>
      )}

      {/* No additional bulk selection tools here */}

      {/* Main content area */}
      <div className="flex-1 flex">
        {/* Source and Target panels with single scrollbar */}
        <div className="flex-1 flex relative">
          {/* Container with single scrollbar */}
          <div
            className="flex-1 overflow-auto pt-[18px]"
            id="main-scroll-container"
          >
            <div className="flex w-full items-stretch">
              {/* Source panel - no individual scrollbar */}
              <div className="w-1/2" id="source-panel">
                <div className="px-4 pt-0 pb-3">
                  {currentSegments.map((segment, index) => (
                    <div
                      key={segment.id}
                      className="segment-row"
                      data-segment-id={segment.id}
                    >
                      <EditableSegment
                        segment={segment}
                        index={index + 1}
                        isSource={true}
                        onSelect={() => handleSegmentSelect(segment.id)}
                        isSelected={selectedSegmentId === segment.id}
                        segmentId={`segment-${segment.id}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-l border-border sticky top-0 h-full cursor-col-resize"></div>

              {/* Target panel - no individual scrollbar */}
              <div className="w-1/2" id="target-panel">
                <div className="px-4 pt-0 pb-3">
                  {currentSegments.map((segment, index) => (
                    <div
                      key={segment.id}
                      className="segment-row"
                      data-segment-id={segment.id}
                    >
                      <EditableSegment
                        segment={segment}
                        index={index + 1}
                        isSource={false}
                        isSelected={selectedSegmentId === segment.id}
                        fileId={fileId}
                        onSelect={() => handleSegmentSelect(segment.id)}
                        onUpdate={(target, status, origin) => {
                          try {
                            if (segment && segment.id) {
                              handleSegmentUpdate(
                                segment.id,
                                target || "",
                                status,
                                origin
                              );
                            }
                          } catch (err) {
                            console.error("Error in onUpdate callback:", err);
                          }
                        }}
                        onTranslateWithGPT={() => handleTranslateWithGPT(segment.id)}
                        isChecked={!!checkedSegments[segment.id]}
                        onCheckChange={(checked) => handleCheckboxChange(segment.id, checked)}
                        segmentId={`segment-${segment.id}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pagination controls or infinite scroll toggle */}
            <div className="flex items-center justify-center py-4 border-t border-border">
              {paginationMode === "pagination" &&
              filteredSegments.length > 0 ? (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <ChevronLeft className="h-4 w-4 -ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <span className="text-sm px-2">
                    Page {currentPage} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                    <ChevronRight className="h-4 w-4 -ml-2" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-4 text-xs h-8"
                    onClick={() => {
                      setPaginationMode("infinite");
                      // Infinite 모드로 변경 시, 현재 페이지를 1로 초기화
                      setCurrentPage(1);
                      setSegmentsPerPage(10);
                    }}
                  >
                    <ArrowDown className="h-3.5 w-3.5 mr-1" />
                    Switch to Infinite Scroll
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => {
                    setPaginationMode("pagination");
                    setSegmentsPerPage(10);
                  }}
                >
                  <ListFilter className="h-3.5 w-3.5 mr-1" />
                  Switch to Pagination (10 per page)
                </Button>
              )}
            </div>

            {/* Filtered segments count */}
            {statusFilter !== "all" && (
              <div className="px-4 py-2 text-sm text-muted-foreground text-center border-t border-border bg-muted/20">
                Showing {filteredSegments.length} of {segments?.length || 0}{" "}
                segments with status "{statusFilter}"
              </div>
            )}
          </div>
        </div>

        {/* Side panel - Only shown when enabled */}
        {showSidePanel && (
          <div className="flex flex-col h-full sticky top-[56px] h-fit">
            <SidePanel
            tmMatches={tmMatches}
            glossaryTerms={glossaryTerms}
            selectedSegment={selectedSegment}
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
            previousVersions={previousVersions}
            onUseTranslation={(translation: string) => {
              if (selectedSegmentId) {
                handleSegmentUpdate(selectedSegmentId, translation, "MT", "MT");
              }
            }}
            onSegmentUpdated={(id: number, newTarget: string) => {
              // This callback is triggered when a segment is updated
              // We're using a different approach with previousVersions state instead
              console.log("Segment updated with new target", id, newTarget);
            }}
          />
          </div>
        )}
      </div>
    </main>
  );
}