import { useState, useCallback } from 'react';
import { TranslationUnit } from '@/types';
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

/**
 * Custom hook to manage editing state in Doc Review Editor
 */
export function useEditingState(
  segments: TranslationUnit[],
  fileId: number = 0,
  onSegmentUpdate?: (updatedSegment: TranslationUnit) => void
) {
  // Currently editing segment ID
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Currently editing value
  const [editedValue, setEditedValue] = useState<string>('');
  
  // Handle segment selection for editing
  const selectSegmentForEditing = useCallback((segment: TranslationUnit) => {
    setEditingId(segment.id);
    setEditedValue(segment.target || '');
    
    // Scroll to source segment when target is selected
    const sourceElement = document.getElementById(`source-${segment.id}`);
    if (sourceElement) {
      // We use scrollIntoView with options to ensure it doesn't jump too abruptly
      sourceElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);
  
  // 상태 변경을 처리하는 새로운 함수 추가
  const toggleStatus = useCallback(async (segmentId: number, currentTarget: string) => {
    // Find segment in local data
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return;
    
    // 상태 토글 규칙
    // - MT, 100%, Fuzzy, Edited 상태에서 체크 버튼을 누르면 Reviewed로 변경
    // - Reviewed 상태에서 체크 버튼을 누르면 Edited로 변경 
    const newStatus = segment.status === "Reviewed" ? "Edited" : "Reviewed";
    
    // MT, 100%, Fuzzy 상태의 세그먼트가 Reviewed로 변경될 때는 origin을 HT로 변경
    const needsOriginChange = (segment.origin === "MT" || segment.origin === "100%" || segment.origin === "Fuzzy");
    const newOrigin = (newStatus === "Reviewed" && needsOriginChange) ? "HT" : segment.origin;
    
    try {
      // Update the segment via API
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
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: [`/api/files/${fileId}`],
      });
      
      // Notify parent component if callback provided
      if (onSegmentUpdate) {
        onSegmentUpdate(updatedSegment);
      }
      
      // 상태가 Reviewed로 변경되면 편집 창을 닫음
      console.log(`Status toggled to ${newStatus}`, updatedSegment);
      
      // Reviewed 상태로 변경되면 편집 창 닫기
      if (newStatus === "Reviewed") {
        setEditingId(null);
      }
      
      return updatedSegment;
    } catch (error) {
      console.error('Error toggling segment status:', error);
      return null;
    }
  }, [segments, fileId, onSegmentUpdate]);
  
  // Handle segment update
  const updateSegment = useCallback(async (segmentId: number, newValue: string) => {
    // Find segment in local data
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return;
    
    // Determine if value changed
    const isValueChanged = newValue !== segment.target;
    if (!isValueChanged) {
      setEditingId(null);
      return;
    }
    
    // Determine new origin and status
    const needsOriginChange = segment.origin === "MT" || segment.origin === "100%" || segment.origin === "Fuzzy";
    const newOrigin = isValueChanged && needsOriginChange ? "HT" : segment.origin;
    
    // Change to Edited if it was Reviewed and content changed
    const newStatus = (isValueChanged && segment.status === "Reviewed") ? "Edited" : segment.status;
    
    try {
      // Update the segment via API
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
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: [`/api/files/${fileId}`],
      });
      
      // Notify parent component if callback provided
      if (onSegmentUpdate) {
        onSegmentUpdate(updatedSegment);
      }
      
      // Reset editing state
      setEditingId(null);
    } catch (error) {
      console.error('Error updating segment:', error);
    }
  }, [segments, fileId, onSegmentUpdate]);
  
  // Cancel editing
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
    toggleStatus
  };
}