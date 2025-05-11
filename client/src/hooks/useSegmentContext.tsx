import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { TranslationUnit } from '../types';
import { apiRequest } from '@/lib/queryClient';

// 컨텍스트 타입 정의
type SegmentContextType = {
  segments: TranslationUnit[];
  setSegments: (segments: TranslationUnit[]) => void;
  updateSegment: (segmentId: number, newData: Partial<TranslationUnit>) => Promise<TranslationUnit>;
  loading: boolean;
  error: Error | null;
};

// 컨텍스트 생성
const SegmentContext = createContext<SegmentContextType | undefined>(undefined);

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

      setLoading(false);
      return serverData;
    } catch (error) {
      console.error('Error updating segment:', error);
      setError(error instanceof Error ? error : new Error(String(error)));
      setLoading(false);
      
      // 에러 발생 시, 원래 상태로 롤백
      setSegments(prevSegments => [...prevSegments]);
      
      throw error;
    }
  }, [segments]);

  // 컨텍스트 값 정의
  const contextValue: SegmentContextType = {
    segments,
    setSegments,
    updateSegment,
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