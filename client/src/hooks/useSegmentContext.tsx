import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { TranslationUnit } from '../types';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useDebouncedCallback } from './useDebounce';
import { useMutation, useQuery, UseQueryResult } from '@tanstack/react-query';

// 컨텍스트 타입 정의 - React Query 기반으로 변경
type SegmentContextType = {
  segmentsQuery: UseQueryResult<TranslationUnit[], Error>;
  updateSegmentMutation: ReturnType<typeof useSegmentUpdateMutation>;
  debouncedUpdateSegment: (segmentId: number, newData: Partial<TranslationUnit>) => void;
  recordSegmentHistory: (segmentId: number, currentTarget: string) => void;
  fileId: number | null;
};

// 컨텍스트 생성
const SegmentContext = createContext<SegmentContextType | undefined>(undefined);

// 디바운스 지연 시간 (ms)
const DEBOUNCE_DELAY = 300;

// 세그먼트 업데이트 mutation 훅
function useSegmentUpdateMutation(fileId: number | null) {
  return useMutation({
    mutationFn: async ({
      segmentId,
      data
    }: {
      segmentId: number;
      data: Partial<TranslationUnit>;
    }) => {
      const response = await apiRequest(
        'PATCH',
        `/api/segments/${segmentId}`,
        data
      );

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      return response.json();
    },
    // 낙관적 업데이트 - 서버 응답 전에 UI 먼저 업데이트
    onMutate: async ({ segmentId, data }) => {
      // 진행 중인 요청 취소
      await queryClient.cancelQueries({ queryKey: ['segments', fileId] });
      
      // 이전 데이터 백업
      const previousSegments = queryClient.getQueryData<TranslationUnit[]>(['segments', fileId]);
      
      // 세그먼트가 존재하는지 확인
      if (previousSegments) {
        const currentSegment = previousSegments.find(s => s.id === segmentId);
        if (!currentSegment) {
          console.error(`Segment with ID ${segmentId} not found`);
          return { previousSegments };
        }
        
        // 낙관적으로 캐시 업데이트
        queryClient.setQueryData<TranslationUnit[]>(['segments', fileId], (old = []) => {
          return old.map(segment => {
            if (segment.id === segmentId) {
              return { 
                ...segment, 
                ...data,
                updatedAt: new Date().toISOString()
              };
            }
            return segment;
          });
        });
      }
      
      // 이전 데이터 반환 (롤백용)
      return { previousSegments };
    },
    // 성공 시 캐시 정확히 업데이트
    onSuccess: (updatedSegment) => {
      console.log('Updated segment from server:', updatedSegment);
      
      // 세그먼트 데이터로 캐시 직접 업데이트 (invalidate 대신)
      queryClient.setQueryData<TranslationUnit[]>(['segments', fileId], (old = []) => {
        return old.map(segment => {
          if (segment.id === updatedSegment.id) {
            return updatedSegment;
          }
          return segment;
        });
      });
      
      // 파일 데이터 무효화 (상태 카운트 등 업데이트를 위해)
      if (fileId) {
        queryClient.invalidateQueries({
          queryKey: [`/api/files/${fileId}`]
        });
      }
    },
    // 에러 발생 시 롤백
    onError: (error, variables, context) => {
      console.error('Error updating segment:', error);
      
      // 이전 상태로 롤백
      if (context?.previousSegments) {
        queryClient.setQueryData(['segments', fileId], context.previousSegments);
      }
    }
  });
}

// 컨텍스트 프로바이더 컴포넌트 - React Query 기반으로 변경
export function SegmentProvider({ 
  children, 
  fileId
}: { 
  children: ReactNode;
  fileId: number | null; 
}) {
  // 세그먼트 데이터를 위한 React Query
  const segmentsQuery = useQuery<TranslationUnit[]>({
    queryKey: ['segments', fileId],
    queryFn: async () => {
      if (!fileId) return [];
      
      const response = await apiRequest('GET', `/api/files/${fileId}/segments`);
      if (!response.ok) {
        throw new Error(`Failed to fetch segments: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: !!fileId, // fileId가 있을 때만 쿼리 활성화
    staleTime: 5 * 60 * 1000, // 5분 동안 캐시 유지
  });

  // 세그먼트 업데이트 mutation
  const updateSegmentMutation = useSegmentUpdateMutation(fileId);

  // 세그먼트 히스토리 기록 함수
  const recordSegmentHistory = useCallback((segmentId: number, currentTarget: string) => {
    console.log('Recording segment history for:', segmentId, currentTarget);
    // 실제 히스토리 기록은 필요할 때 구현
  }, []);

  // 디바운스된 세그먼트 업데이트 함수
  const debouncedUpdateSegmentImpl = useDebouncedCallback(
    (segmentId: number, newData: Partial<TranslationUnit>) => {
      try {
        console.log(`Sending debounced update for segment ${segmentId}:`, newData);
        
        // mutation 호출
        updateSegmentMutation.mutate({ 
          segmentId, 
          data: newData 
        });
      } catch (error) {
        console.error(`Debounced update for segment ${segmentId} failed:`, error);
      }
    },
    DEBOUNCE_DELAY,
    [updateSegmentMutation]
  );

  // 타입스크립트에 맞게 정의 (void 반환하는 래퍼 함수)
  const debouncedUpdateSegment = useCallback((
    segmentId: number, 
    newData: Partial<TranslationUnit>
  ): void => {
    // 이미 캐시에 있는 세그먼트 조회
    const segments = segmentsQuery.data || [];
    const currentSegment = segments.find((s: TranslationUnit) => s.id === segmentId);
    
    if (!currentSegment) {
      console.error(`Segment with ID ${segmentId} not found`);
      return;
    }
    
    // 낙관적 UI 업데이트는 onMutate에서 처리
    // 여기서는 디바운스된 API 호출만 수행
    debouncedUpdateSegmentImpl(segmentId, newData);
    
    // 히스토리 기록 (필요시)
    if (newData.target) {
      recordSegmentHistory(segmentId, newData.target);
    }
  }, [segmentsQuery.data, debouncedUpdateSegmentImpl, recordSegmentHistory]);

  // 컨텍스트 값 정의
  const contextValue: SegmentContextType = {
    segmentsQuery,
    updateSegmentMutation,
    debouncedUpdateSegment,
    recordSegmentHistory,
    fileId
  };

  return (
    <SegmentContext.Provider value={contextValue}>
      {children}
    </SegmentContext.Provider>
  );
}

// 커스텀 훅으로 컨텍스트 사용
export function useSegmentContext() {
  const context = useContext(SegmentContext);
  if (context === undefined) {
    throw new Error('useSegmentContext must be used within a SegmentProvider');
  }
  return context;
}