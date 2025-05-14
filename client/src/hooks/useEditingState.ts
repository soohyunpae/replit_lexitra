import { useState, useCallback } from 'react';
import { TranslationUnit } from '@/types';
import { useSegmentMutation } from './mutations/useSegmentMutation';

export function useEditingState(
  segments: TranslationUnit[],
  fileId: number = 0,
  onSegmentUpdate?: (updatedSegment: TranslationUnit) => void
) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedValue, setEditedValue] = useState<string>('');

  const { mutate: updateSegmentMutation } = useSegmentMutation();

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

    updateSegmentMutation(
      { 
        id: segmentId, 
        target: currentTarget, 
        status: newStatus,
        fileId,
      },
      {
        onSuccess: (updatedSegment) => {
          if (onSegmentUpdate) {
            onSegmentUpdate(updatedSegment);
          }
          if (newStatus === "Reviewed") {
            setEditingId(null);
          }
        }
      }
    );
  }, [segments, fileId, onSegmentUpdate, updateSegmentMutation]);

  const updateSegment = useCallback(async (segmentId: number, newValue: string) => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return;

    const isValueChanged = newValue !== segment.target;
    if (!isValueChanged) {
      setEditingId(null);
      return;
    }

    const needsOriginChange = segment.origin === "MT" || segment.origin === "100%" || segment.origin === "Fuzzy";
    const newOrigin = isValueChanged && needsOriginChange ? "HT" : segment.origin;
    const newStatus = (isValueChanged && segment.status === "Reviewed") ? "Edited" : segment.status;

    updateSegmentMutation(
      {
        id: segmentId,
        target: newValue,
        status: newStatus,
        fileId,
      },
      {
        onSuccess: (updatedSegment) => {
          if (onSegmentUpdate) {
            onSegmentUpdate(updatedSegment);
          }
          setEditingId(null);
        }
      }
    );
  }, [segments, fileId, onSegmentUpdate, updateSegmentMutation]);

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