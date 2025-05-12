import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { TranslationUnit } from "@/types";
import { useCallback } from "react";
import { useDebouncedCallback } from "./useDebounce";

// 디바운스 지연 시간 (ms) - 키 입력에 더 빠르게 반응하도록 값 조정
const DEBOUNCE_DELAY = 300;

/**
 * React Query 기반 세그먼트 데이터 관리 훅
 * useSegmentContext를 대체하여 일관된 데이터 흐름과 자동 동기화를 제공함
 */
export function useSegments(fileId: number) {
  // 세그먼트 데이터 가져오기
  const { 
    data: segments = [], 
    isLoading, 
    isError, 
    error,
    refetch
  } = useQuery<TranslationUnit[]>({
    queryKey: ["segments", fileId], 
    queryFn: () => apiRequest("GET", `/api/segments/${fileId}`)
      .then(res => res.json()),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  // 세그먼트 업데이트 뮤테이션
  const updateSegmentMutation = useMutation({
    mutationFn: (updated: Partial<TranslationUnit> & { id: number }) => 
      apiRequest("PATCH", `/api/segments/${updated.id}`, updated)
        .then(res => res.json()),
    onSuccess: () => {
      // 업데이트 성공 시 세그먼트 쿼리 무효화하여 최신 데이터 가져오기
      queryClient.invalidateQueries({ queryKey: ["segments", fileId] });
    }
  });

  // 디바운스 없이 즉시 업데이트하는 함수
  const updateSegment = async (segmentId: number, newData: Partial<TranslationUnit>) => {
    return updateSegmentMutation.mutateAsync({ id: segmentId, ...newData });
  };

  // 디바운스된 API 업데이트 함수
  const debouncedUpdateSegmentFn = useDebouncedCallback(
    async (segmentId: number, newData: Partial<TranslationUnit>) => {
      try {
        console.log(`Sending debounced update for segment ${segmentId}:`, newData);
        await updateSegmentMutation.mutateAsync({ id: segmentId, ...newData });
      } catch (error) {
        console.error(`Debounced update for segment ${segmentId} failed:`, error);
      }
    },
    DEBOUNCE_DELAY
  );
  
  // 낙관적 UI 업데이트를 포함한 디바운스 함수
  const debouncedUpdateSegment = useCallback((
    segmentId: number, 
    newData: Partial<TranslationUnit>
  ): void => {
    // 낙관적 UI 업데이트를 위해 현재 캐시된 데이터 수동 업데이트
    // React Query의 setQueryData를 사용하여 캐시 업데이트
    queryClient.setQueryData(
      ["segments", fileId], 
      (oldData: TranslationUnit[] | undefined): TranslationUnit[] => {
        if (!oldData) return [];
        
        return oldData.map(segment => 
          segment.id === segmentId 
            ? { ...segment, ...newData } 
            : segment
        );
      }
    );
    
    // 디바운스된 API 호출
    debouncedUpdateSegmentFn(segmentId, newData);
  }, [fileId, debouncedUpdateSegmentFn]);

  return {
    segments,
    isLoading,
    isError,
    error,
    updateSegment,
    debouncedUpdateSegment,
    refetch,
    // isMutating은 현재 업데이트 중인지 확인하는 데 사용
    isMutating: updateSegmentMutation.isPending,
  };
}