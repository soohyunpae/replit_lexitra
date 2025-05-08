import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Save, Download, Languages, AlertCircle, Check, X, FileCheck, 
  Filter, ChevronLeft, ChevronRight, ArrowDown, ListFilter
} from "lucide-react";
import { EditableSegment } from "./editable-segment";
import { Progress } from "@/components/ui/progress";
import { SidePanel } from "./side-panel";
import { apiRequest } from "@/lib/queryClient";
import { saveToTM } from "@/lib/api";
import { type TranslationUnit, type TranslationMemory, type Glossary, type StatusType } from "@/types";
import { useToast } from "@/hooks/use-toast";
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
  const [filteredSegments, setFilteredSegments] = useState<TranslationUnit[]>(segments);
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null);
  const [tmMatches, setTmMatches] = useState<TranslationMemory[]>([]);
  const [glossaryTerms, setGlossaryTerms] = useState<Glossary[]>([]);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [translatedCount, setTranslatedCount] = useState(0);
  const [totalToTranslate, setTotalToTranslate] = useState(0);
  const [checkedSegments, setCheckedSegments] = useState<Record<number, boolean>>({});
  
  // Get count of checked segments for bulk actions
  const checkedCount = Object.values(checkedSegments).filter(Boolean).length;
  
  // State to track previous versions of segments for history
  const [previousVersions, setPreviousVersions] = useState<Record<number, string>>({});
  
  // Filter and pagination states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<string>("all");
  
  // Track status counts for progress bar
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [segmentsPerPage, setSegmentsPerPage] = useState<number>(20);
  const [paginationMode, setPaginationMode] = useState<"pagination" | "infinite">("infinite");
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);
  
  // Update local segments when props change
  useEffect(() => {
    setLocalSegments(segments);
  }, [segments]);
  
  // Apply filters and update filtered segments
  useEffect(() => {
    let filtered = [...localSegments];
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(segment => segment.status === statusFilter);
    }
    
    // Apply origin filter
    if (originFilter !== "all") {
      filtered = filtered.filter(segment => segment.origin === originFilter);
    }
    
    setFilteredSegments(filtered);
    
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [localSegments, statusFilter, originFilter]);
  
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
  
  // Calculate status counts
  useEffect(() => {
    const counts: Record<string, number> = {};
    localSegments.forEach(segment => {
      const status = segment.status || "Draft";
      counts[status] = (counts[status] || 0) + 1;
    });
    setStatusCounts(counts);
  }, [localSegments]);
  
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
      // Store the current translation when selecting a segment for history tracking
      if (segment.target) {
        setPreviousVersions(prev => ({
          ...prev,
          [id]: segment.target || ""
        }));
      }
      
      // Search TM and glossary in parallel
      await Promise.all([
        searchTM(segment.source),
        searchGlossary(segment.source)
      ]);
    }
  };
  
  // Handle segment update
  const handleSegmentUpdate = async (id: number, target: string, status = "MT", origin?: string) => {
    // Update segment in database
    try {
      // Find current segment to check if it was modified
      const currentSegment = localSegments.find(s => s.id === id);
      const wasModified = currentSegment && currentSegment.target !== target;
      
      // Set origin to HT if this is a human edit and it's marked as Reviewed
      // Only update origin if explicitly provided or if it's a human edit
      let updatedOrigin = origin;
      if (!updatedOrigin && wasModified) {
        // If segment was manually edited, set origin to HT
        updatedOrigin = (status === "Reviewed" || (currentSegment?.status === "Reviewed" && status === undefined)) 
          ? "HT" 
          : currentSegment?.origin;
      }
      
      const payload: any = { target, status };
      if (updatedOrigin) {
        payload.origin = updatedOrigin;
      }
      
      const response = await apiRequest(
        "PATCH", 
        `/api/segments/${id}`, 
        payload
      );
      
      const updatedSegment = await response.json();
      
      // Update local state
      setLocalSegments(prev => 
        prev.map(segment => 
          segment.id === id ? { 
            ...segment, 
            target, 
            status,
            origin: updatedOrigin || segment.origin,
            modified: true // Mark as modified
          } : segment
        )
      );
      
      // If this is the currently selected segment being updated,
      // update history tracking if the translation changed
      const oldTarget = currentSegment?.target;
      if (selectedSegmentId === id && oldTarget && oldTarget !== target) {
        console.log("Recording segment history for:", id, target);
        
        // Only store the previous version if it doesn't already exist
        // This ensures we keep the original version, not intermediate ones
        if (!previousVersions[id]) {
          setPreviousVersions(prev => ({
            ...prev,
            [id]: oldTarget
          }));
        }
      }
      
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
        await handleSegmentUpdate(id, data.target, "MT", "MT");
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
            { target: data.target, status: "MT", origin: "MT" }
          );
          
          // Update our local copy
          const segmentIndex = updatedSegments.findIndex(s => s.id === segment.id);
          if (segmentIndex !== -1) {
            updatedSegments[segmentIndex] = {
              ...updatedSegments[segmentIndex],
              target: data.target,
              status: "MT",
              origin: "MT"
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
  
  // Implement save file function with TM update for reviewed segments
  const handleSaveFile = async () => {
    try {
      // Save all segments to database first
      const savePromises = localSegments.map(segment => {
        return apiRequest(
          "PATCH", 
          `/api/segments/${segment.id}`, 
          { 
            target: segment.target || "",
            status: segment.status,
            origin: segment.origin || "MT" 
          }
        );
      });
      
      await Promise.all(savePromises);
      
      // Find all reviewed segments to save to TM
      const reviewedSegments = localSegments.filter(
        segment => segment.status === "Reviewed" && segment.target && segment.target.trim() !== ""
      );
      
      // Save reviewed segments to translation memory
      const tmPromises = reviewedSegments.map(segment => {
        return saveToTM(
          segment.source,
          segment.target || "",
          segment.status,
          sourceLanguage,
          targetLanguage,
          fileName // File name as context
        );
      });
      
      await Promise.all(tmPromises);
      
      // Call the onSave prop if provided
      if (onSave) {
        onSave();
      }
      
      // Recalculate status counts after save
      const newStatusCounts: Record<string, number> = {};
      localSegments.forEach(segment => {
        const status = segment.status || "Draft";
        newStatusCounts[status] = (newStatusCounts[status] || 0) + 1;
      });
      setStatusCounts(newStatusCounts);
      
      toast({
        title: "Save Complete",
        description: `Saved ${localSegments.length} segments. ${reviewedSegments.length} reviewed segments stored to TM.`,
      });
      
    } catch (error) {
      console.error("Error saving file:", error);
      toast({
        title: "Save Error",
        description: "Failed to save file. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle checkbox change for a segment
  const handleCheckboxChange = (id: number, checked: boolean) => {
    setCheckedSegments(prev => ({
      ...prev,
      [id]: checked
    }));
  };
  
  // Handle "Select All" for segments
  const handleSelectAll = () => {
    const newCheckedState: Record<number, boolean> = {};
    localSegments.forEach(segment => {
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
        description: "Please select segments to update"
      });
      return;
    }
    
    // Update segments in parallel
    try {
      const promises = checkedIds.map(id => {
        const segment = localSegments.find(s => s.id === id);
        if (!segment) return Promise.resolve();
        
        // Keep target text, just update status
        return apiRequest(
          "PATCH", 
          `/api/segments/${id}`, 
          { 
            target: segment.target || "", 
            status,
            // If status is Reviewed and origin isn't already set to HT, 
            // and the segment has been modified, set it to HT
            origin: (status === "Reviewed" && segment.target && segment.origin !== "HT") 
              ? "HT" 
              : segment.origin
          }
        );
      });
      
      await Promise.all(promises);
      
      // Update local state
      const updatedSegments = [...localSegments];
      checkedIds.forEach(id => {
        const index = updatedSegments.findIndex(s => s.id === id);
        if (index !== -1) {
          const origin = (status === "Reviewed" && updatedSegments[index].target && updatedSegments[index].origin !== "HT") 
            ? "HT" 
            : updatedSegments[index].origin;
            
          updatedSegments[index] = {
            ...updatedSegments[index],
            status,
            origin
          };
        }
      });
      
      setLocalSegments(updatedSegments);
      
      // Recalculate status counts after bulk update
      const newStatusCounts: Record<string, number> = { ...statusCounts };
      checkedIds.forEach(id => {
        const segment = updatedSegments.find(s => s.id === id);
        if (segment) {
          // Decrement the old status count
          const oldStatus = localSegments.find(s => s.id === id)?.status || "Draft";
          newStatusCounts[oldStatus] = (newStatusCounts[oldStatus] || 0) - 1;
          
          // Increment the new status count
          newStatusCounts[status] = (newStatusCounts[status] || 0) + 1;
        }
      });
      setStatusCounts(newStatusCounts);
      
      toast({
        title: "Status Update Complete",
        description: `Updated ${checkedIds.length} segments to ${status}`
      });
      
      // Clear selection after successful update
      setCheckedSegments({});
    } catch (error) {
      console.error("Error updating segment statuses:", error);
      toast({
        title: "Error",
        description: "Failed to update segment statuses",
        variant: "destructive"
      });
    }
  };
  
  // Pagination related calculations
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredSegments.length / segmentsPerPage);
  const startIndex = (currentPage - 1) * segmentsPerPage;
  const endIndex = paginationMode === "pagination" 
    ? Math.min(startIndex + segmentsPerPage, filteredSegments.length) 
    : filteredSegments.length;
  
  // Get current page segments
  const currentSegments = filteredSegments.slice(
    0, 
    paginationMode === "pagination" ? endIndex : undefined
  );
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // Toggle pagination mode
  const togglePaginationMode = () => {
    setPaginationMode(prev => prev === "pagination" ? "infinite" : "pagination");
    setCurrentPage(1);
  };
  
  // Count by origin
  const originCounts = localSegments.reduce((acc, segment) => {
    if (segment.origin) {
      acc[segment.origin] = (acc[segment.origin] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  return (
    <main className="flex-1 overflow-hidden flex flex-col">
      {/* Breadcrumb Navigation */}
      <div className="bg-card border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <a href="/projects" className="text-sm hover:text-primary transition-colors">
            Projects
          </a>
          <span className="text-muted-foreground">/</span>
          <a href="/project" className="text-sm hover:text-primary transition-colors">
            Project: {fileName.split('_')[0]} - {sourceLanguage} to {targetLanguage}
          </a>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium">{fileName}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="default" 
            size="sm" 
            className="flex items-center"
            onClick={handleSaveFile}
          >
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      </div>
      
      {/* Progress bar with integrated controls */}
      <div className="bg-card border-b border-border py-2 px-4">
        <div className="flex justify-between items-center gap-4">
          <div className="flex flex-col space-y-1 w-full">
            <div className="flex justify-between text-xs mb-1">
              <span>Segment Status</span>
              <span className="font-medium">
                {statusCounts["Reviewed"] || 0} Reviewed • {statusCounts["Draft"] || 0} Draft • {statusCounts["Rejected"] || 0} Rejected
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden flex">
              {/* Reviewed segments (green) */}
              <div 
                className="h-full bg-green-500" 
                style={{ 
                  width: `${((statusCounts["Reviewed"] || 0) / localSegments.length) * 100}%` 
                }}
              />
              {/* Draft segments (blue) */}
              <div 
                className="h-full bg-blue-500" 
                style={{ 
                  width: `${((statusCounts["Draft"] || 0) / localSegments.length) * 100}%` 
                }}
              />
              {/* Rejected segments (red) */}
              <div 
                className="h-full bg-red-500" 
                style={{ 
                  width: `${((statusCounts["Rejected"] || 0) / localSegments.length) * 100}%` 
                }}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Draft">Draft ({statusCounts["Draft"] || 0})</SelectItem>
                <SelectItem value="Reviewed">Reviewed ({statusCounts["Reviewed"] || 0})</SelectItem>
                <SelectItem value="Rejected">Rejected ({statusCounts["Rejected"] || 0})</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              onValueChange={(value) => {
                if (value !== "none" && checkedCount > 0) {
                  handleBulkStatusUpdate(value as StatusType);
                }
              }}
            >
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue placeholder="Bulk Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select Action</SelectItem>
                <SelectItem value="Draft">Set as Draft</SelectItem>
                <SelectItem value="Reviewed">Set as Reviewed</SelectItem>
                <SelectItem value="Rejected">Set as Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Warning for batch translation */}
      {isTranslatingAll && (
        <div className="bg-warning/10 border-y border-warning/20 px-4 py-2 flex items-center">
          <AlertCircle className="h-4 w-4 text-warning mr-2" />
          <span className="text-sm">
            Batch translation in progress. Please wait... ({translatedCount}/{totalToTranslate})
          </span>
        </div>
      )}
      
      {/* Bulk selection tools */}
      <div className="bg-primary/5 border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center">
          <FileCheck className="h-4 w-4 text-primary mr-2" />
          <span className="text-sm">
            {checkedCount} segments selected
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSelectAll}
            className="h-8 text-xs"
          >
            Select All
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleUnselectAll}
            className="h-8 text-xs"
          >
            Deselect All
          </Button>
        </div>
      </div>
      
{/* Removed Bulk mode toggle */}
      
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
                  {currentSegments.map((segment, index) => (
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
                  {currentSegments.map((segment, index) => (
                    <div key={segment.id} className="segment-row" data-segment-id={segment.id}>
                      <EditableSegment
                        segment={segment}
                        index={index + 1}
                        isSource={false}
                        onSelect={() => handleSegmentSelect(segment.id)}
                        onUpdate={(target, status, origin) => handleSegmentUpdate(segment.id, target, status, origin)}
                        onTranslateWithGPT={() => handleTranslateWithGPT(segment.id)}
                        isSelected={selectedSegmentId === segment.id}
                        isChecked={!!checkedSegments[segment.id]}
                        onCheckChange={(checked) => handleCheckboxChange(segment.id, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Pagination controls or infinite scroll toggle */}
            <div className="flex items-center justify-center py-4 border-t border-border">
              {paginationMode === "pagination" && filteredSegments.length > 0 ? (
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
                      setSegmentsPerPage(20);
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
                    setSegmentsPerPage(20);
                  }}
                >
                  <ListFilter className="h-3.5 w-3.5 mr-1" />
                  Switch to Pagination (20 per page)
                </Button>
              )}
            </div>
            
            {/* Filtered segments count */}
            {(statusFilter !== "all") && (
              <div className="px-4 py-2 text-sm text-muted-foreground text-center border-t border-border bg-muted/20">
                Showing {filteredSegments.length} of {localSegments.length} segments with status "{statusFilter}"
              </div>
            )}
          </div>
        </div>
        
        {/* Side panel */}
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
            console.log(`Segment ${id} updated with new target: ${newTarget}`);
          }}
        />
      </div>
    </main>
  );
}