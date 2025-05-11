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
// 컴포넌트가 아닌 함수에 대해서는 이름을 변경하지 않도록 하여 Hot Reload 문제 해결
const useSegmentUpdateMutation = (fileId: number | null) => {
  return useMutation({
    mutationFn: async ({
      segmentId,
      data
    }: {
      segmentId: number;
      data: Partial<TranslationUnit>;
    }) => {
      // 1. 세그먼트가 존재하는지 먼저 확인 (404 방지)
      const validateResponse = await apiRequest(
        'GET',
        `/api/segments/${segmentId}`
      );
      
      // 세그먼트가 존재하지 않으면 일찍 에러 발생
      if (!validateResponse.ok) {
        if (validateResponse.status === 404) {
          throw new Error(`Segment with ID ${segmentId} does not exist`);
        } else {
          throw new Error(`Failed to validate segment: ${validateResponse.status}`);
        }
      }
      
      // 2. 존재하면 업데이트 진행
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
      
      // 세그먼트 존재 여부와 상관없이 무조건 낙관적 업데이트 시도
      queryClient.setQueryData<TranslationUnit[]>(['segments', fileId], (old = []) => {
        // 세그먼트가 없을 경우 그대로 반환
        if (!old || old.length === 0) {
          console.warn(`No segments found in cache for fileId ${fileId}`);
          return old;
        }
          
        // 세그먼트가 있으면 해당 세그먼트 업데이트
        const segmentExists = old.some(s => s.id === segmentId);
        if (!segmentExists) {
          console.warn(`Segment with ID ${segmentId} not found in cache, but continuing with update`);
        }
          
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
    // 에러 발생 시 롤백 및 상세 에러 처리
    onError: (error, variables, context) => {
      console.error('Error updating segment:', error);
      
      // 사용자 친화적 에러 메시지 표시
      let errorMessage = 'Failed to update segment';
      if (error instanceof Error) {
        if (error.message.includes('404') || error.message.includes('not found')) {
          errorMessage = `Segment ID ${variables.segmentId} not found. Please refresh the page.`;
          console.warn('Segment not found error - this might happen if the segment was deleted or the ID is incorrect');
        }
      }
      
      // Toast 메시지 표시 (전역 함수 직접 호출 대신 컴포넌트에서 처리할 수 있게 이벤트 발생)
      const errorEvent = new CustomEvent('segmentUpdateError', { 
        detail: { message: errorMessage, segmentId: variables.segmentId }
      });
      window.dispatchEvent(errorEvent);
      
      // 이전 상태로 롤백
      if (context?.previousSegments) {
        queryClient.setQueryData(['segments', fileId], context.previousSegments);
      }
    }
  });
}

// 컨텍스트 프로바이더 컴포넌트 - React Query 기반으로 변경
// 컨텍스트 프로바이더 컴포넌트 정의 - Hot Reload 호환성을 위해 명명된 함수 표현식 사용
const SegmentProvider = ({ 
  children, 
  fileId
}: { 
  children: ReactNode;
  fileId: number | null; 
}) => {
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
    // 낙관적 UI 업데이트는 onMutate에서 처리하므로
    // 캐시에 세그먼트가 없는 경우도 허용해 처리 진행
    // 여기서는 디바운스된 API 호출만 수행
    debouncedUpdateSegmentImpl(segmentId, newData);
    
    // 히스토리 기록 (필요시)
    if (newData.target) {
      recordSegmentHistory(segmentId, newData.target);
    }
  }, [debouncedUpdateSegmentImpl, recordSegmentHistory]);

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

// 명시적으로 컨텍스트와 프로바이더 내보내기
export { SegmentContext, SegmentProvider };