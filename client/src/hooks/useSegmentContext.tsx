import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useMemo } from 'react';
import { TranslationUnit } from '../types';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useDebouncedCallback } from './useDebounce';

// 컨텍스트 타입 정의
type SegmentContextType = {
  segments: TranslationUnit[];
  setSegments: (segments: TranslationUnit[]) => void;
  updateSegment: (segmentId: number, newData: Partial<TranslationUnit>) => Promise<TranslationUnit>;
  debouncedUpdateSegment: (segmentId: number, newData: Partial<TranslationUnit>) => void;
  loading: boolean;
  error: Error | null;
};

// 컨텍스트 생성
const SegmentContext = createContext<SegmentContextType | undefined>(undefined);

// 디바운스 지연 시간 (ms) - 키 입력에 더 빠르게 반응하도록 값 줄임
const DEBOUNCE_DELAY = 300;

// 컨텍스트 프로바이더 컴포넌트
export function SegmentProvider({ 
  children, 
  initialSegments = []
}: { 
  children: ReactNode;
  initialSegments?: TranslationUnit[]; 
}) {
  const [segments, setSegments] = useState<TranslationUnit[]>(initialSegments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Record<number, boolean>>({});

  // 초기 세그먼트 설정
  useEffect(() => {
    setSegments(initialSegments);
  }, [initialSegments]);

  // 세그먼트 업데이트 함수 (낙관적 UI 적용)
  const updateSegment = useCallback(async (
    segmentId: number, 
    newData: Partial<TranslationUnit>
  ): Promise<TranslationUnit> => {
    try {
      // 현재 세그먼트 찾기
      const currentSegment = segments.find(s => s.id === segmentId);
      if (!currentSegment) {
        throw new Error(`Segment with ID ${segmentId} not found`);
      }

      // 서버 요청을 보내기 전에 낙관적으로 UI 업데이트
      const updatedSegment = { ...currentSegment, ...newData };
      
      // 로컬 상태 즉시 업데이트 (낙관적 UI)
      setSegments(prevSegments => 
        prevSegments.map(segment => 
          segment.id === segmentId ? updatedSegment : segment
        )
      );

      // API 호출
      setLoading(true);
      setPendingUpdates(prev => ({ ...prev, [segmentId]: true }));
      
      const response = await apiRequest(
        'PATCH',
        `/api/segments/${segmentId}`,
        newData
      );

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      // 서버에서 반환된 최신 데이터로 다시 업데이트
      const serverData = await response.json();
      console.log('Updated segment from server:', serverData);
      
      // 서버 응답으로 상태 업데이트 (UI 조정)
      setSegments(prevSegments => 
        prevSegments.map(segment => 
          segment.id === segmentId ? serverData : segment
        )
      );
      
      // React Query 캐시 무효화
      if (serverData.fileId) {
        queryClient.invalidateQueries({
          queryKey: ['segments', serverData.fileId]
        });
        queryClient.invalidateQueries({
          queryKey: [`/api/files/${serverData.fileId}/segments`]
        });
      }

      setLoading(false);
      setPendingUpdates(prev => {
        const updated = { ...prev };
        delete updated[segmentId];
        return updated;
      });
      
      return serverData;
    } catch (error) {
      console.error('Error updating segment:', error);
      setError(error instanceof Error ? error : new Error(String(error)));
      setLoading(false);
      setPendingUpdates(prev => {
        const updated = { ...prev };
        delete updated[segmentId];
        return updated;
      });
      
      // 에러 발생 시, 원래 상태로 롤백
      setSegments(prevSegments => [...prevSegments]);
      
      throw error;
    }
  }, [segments]);

  // 디바운스된 API 업데이트 함수 - 커스텀 훅 사용
  const debouncedUpdateSegmentImpl = useDebouncedCallback(
    async (segmentId: number, newData: Partial<TranslationUnit>) => {
      try {
        console.log(`Sending debounced update for segment ${segmentId}:`, newData);
        const updatedSegment = await updateSegment(segmentId, newData);
        
        // React Query 캐시 무효화 (이중으로 보장)
        if (updatedSegment.fileId) {
          queryClient.invalidateQueries({
            queryKey: ['segments', updatedSegment.fileId]
          });
          queryClient.invalidateQueries({
            queryKey: [`/api/files/${updatedSegment.fileId}/segments`]
          });
        }
      } catch (error) {
        console.error(`Debounced update for segment ${segmentId} failed:`, error);
      }
    }, 
    DEBOUNCE_DELAY,
    [updateSegment]
  );
  
  // 타입스크립트에 맞게 정의 (void 반환하는 래퍼 함수)
  const debouncedUpdateSegment = useCallback((
    segmentId: number, 
    newData: Partial<TranslationUnit>
  ): void => {
    // 현재 세그먼트 찾기
    const currentSegment = segments.find(s => s.id === segmentId);
    if (!currentSegment) {
      console.error(`Segment with ID ${segmentId} not found`);
      return;
    }

    // 낙관적 UI 업데이트 (즉시 반영) - 낙관적 UI 업데이트 로직 최적화
    const updatedSegment = { ...currentSegment, ...newData };
    
    // 이전 상태를 덮어쓰지 않도록 함수형 업데이트 패턴 사용
    setSegments(prevSegments => 
      prevSegments.map(segment => 
        segment.id === segmentId ? updatedSegment : segment
      )
    );
    
    // 디바운스된 API 호출
    debouncedUpdateSegmentImpl(segmentId, newData);
  }, [segments, debouncedUpdateSegmentImpl]);

  // 컨텍스트 값 정의
  const contextValue: SegmentContextType = {
    segments,
    setSegments,
    updateSegment,
    debouncedUpdateSegment,
    loading,
    error
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