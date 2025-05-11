
import { useState, useCallback } from 'react';
import { TranslationUnit } from '@/types';
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export function useEditingState(
  segments: TranslationUnit[],
  fileId: number = 0,
  onSegmentUpdate?: (updatedSegment: TranslationUnit) => void
) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedValue, setEditedValue] = useState<string>('');
  const [localSegments, setLocalSegments] = useState<TranslationUnit[]>(segments);
  
  // Optimistic update helper
  const updateLocalSegment = (segmentId: number, updates: Partial<TranslationUnit>) => {
    setLocalSegments(prev => 
      prev.map(seg => 
        seg.id === segmentId ? { ...seg, ...updates } : seg
      )
    );
  };

  const selectSegmentForEditing = useCallback((segment: TranslationUnit) => {
    setEditingId(segment.id);
    setEditedValue(segment.target || '');
    
    const sourceElement = document.getElementById(`source-${segment.id}`);
    if (sourceElement) {
      sourceElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  const toggleStatus = useCallback(async (segmentId: number, currentTarget: string) => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return;

    const newStatus = segment.status === "Reviewed" ? "Edited" : "Reviewed";
    const needsOriginChange = (segment.origin === "MT" || segment.origin === "100%" || segment.origin === "Fuzzy");
    const newOrigin = (newStatus === "Reviewed" && needsOriginChange) ? "HT" : segment.origin;

    // Batch updates together
    const updates = { status: newStatus, origin: newOrigin, target: currentTarget };
    updateLocalSegment(segmentId, updates);
    
    // Pre-warm cache
    queryClient.setQueryData([`/api/segments/${segmentId}`], {
      ...segment,
      ...updates
    });

    try {
      const response = await apiRequest(
        "PATCH", 
        `/api/segments/${segmentId}`, 
        { 
          target: currentTarget, 
          status: newStatus, 
          origin: newOrigin 
        }
      );
      
      const updatedSegment = await response.json();
      
      // Only invalidate the specific segment's query
      queryClient.setQueryData(
        [`/api/segments/${segmentId}`],
        updatedSegment
      );

      if (onSegmentUpdate) {
        onSegmentUpdate(updatedSegment);
      }
      
      return updatedSegment;
    } catch (error) {
      // Rollback on error
      updateLocalSegment(segmentId, { status: segment.status, origin: segment.origin });
      console.error('Error toggling segment status:', error);
      return null;
    }
  }, [segments, fileId, onSegmentUpdate]);

  const debouncedUpdate = useCallback(
  debounce(async (segmentId: number, newValue: string, segment: TranslationUnit) => {
    try {
      const response = await apiRequest(
        "PATCH", 
        `/api/segments/${segmentId}`, 
        { 
          target: newValue,
          status: segment.status,
          origin: segment.origin
        }
      );
      
      const updatedSegment = await response.json();
      queryClient.setQueryData([`/api/segments/${segmentId}`], updatedSegment);
      
      if (onSegmentUpdate) {
        onSegmentUpdate(updatedSegment);
      }
    } catch (error) {
      console.error('Error updating segment:', error);
    }
  }, 500),
  [onSegmentUpdate]
);

const updateSegment = useCallback(async (segmentId: number, newValue: string) => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return;

    const isValueChanged = newValue !== segment.target;
    if (!isValueChanged) {
      setEditingId(null);
      return;
    }
    
    // Immediate local update
    updateLocalSegment(segmentId, { target: newValue });
    
    // Debounced API call
    debouncedUpdate(segmentId, newValue, segment);

    const needsOriginChange = segment.origin === "MT" || segment.origin === "100%" || segment.origin === "Fuzzy";
    const newOrigin = isValueChanged && needsOriginChange ? "HT" : segment.origin;
    const newStatus = (isValueChanged && segment.status === "Reviewed") ? "Edited" : segment.status;

    // Optimistic update
    updateLocalSegment(segmentId, { 
      target: newValue, 
      status: newStatus, 
      origin: newOrigin 
    });

    try {
      const response = await apiRequest(
        "PATCH", 
        `/api/segments/${segmentId}`, 
        { 
          target: newValue, 
          status: newStatus, 
          origin: newOrigin 
        }
      );
      
      const updatedSegment = await response.json();
      
      // Only invalidate specific segment
      queryClient.setQueryData(
        [`/api/segments/${segmentId}`],
        updatedSegment
      );

      if (onSegmentUpdate) {
        onSegmentUpdate(updatedSegment);
      }

      setEditingId(null);
    } catch (error) {
      // Rollback on error
      updateLocalSegment(segmentId, segment);
      console.error('Error updating segment:', error);
    }
  }, [segments, fileId, onSegmentUpdate]);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
  }, []);

  return {
    editingId,
    editedValue,
    setEditedValue,
    selectSegmentForEditing,
    updateSegment,
    cancelEditing,
    toggleStatus,
    localSegments
  };
}
