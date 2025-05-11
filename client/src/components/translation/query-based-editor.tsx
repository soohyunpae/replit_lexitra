import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { TranslationUnit, StatusType, OriginType } from '@/types';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { DocSegment } from './doc-segment-authenticated';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Check, X, MessageCircle, FileEdit, Save, Download,
  Languages, Eye, EyeOff, Smartphone, Monitor, FileText,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  RotateCw
} from 'lucide-react';

interface QueryBasedEditorProps {
  fileId: number;
  fileName?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
}

/**
 * React Query 기반의 번역 에디터 컴포넌트
 * - useQuery를 사용하여 세그먼트 데이터를 가져옴
 * - useMutation을 사용하여 세그먼트 업데이트
 * - 캐시 무효화를 통한 UI 자동 업데이트
 */
export function QueryBasedEditor({
  fileId,
  fileName = '',
  sourceLanguage = '',
  targetLanguage = ''
}: QueryBasedEditorProps) {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedValue, setEditedValue] = useState<string>('');
  const [showSource, setShowSource] = useState(true);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  // React Query를 사용하여 세그먼트 데이터 가져오기
  const {
    data: segments = [],
    isLoading,
    isError,
    error
  } = useQuery<TranslationUnit[]>({
    queryKey: ['segments', fileId],
    queryFn: async () => {
      const response = await apiRequest(
        'GET',
        `/api/files/${fileId}/segments`
      );
      return response.json();
    },
    // 데이터 유지 설정 (필요에 따라 조정)
    staleTime: 1000 * 60, // 1분
    refetchOnWindowFocus: false
  });

  // 세그먼트 업데이트를 위한 Mutation (낙관적 업데이트 적용)
  const updateSegmentMutation = useMutation({
    mutationFn: async ({
      segmentId,
      newData
    }: {
      segmentId: number;
      newData: Partial<TranslationUnit>;
    }) => {
      const response = await apiRequest(
        'PATCH',
        `/api/segments/${segmentId}`,
        newData
      );
      return response.json();
    },
    // 낙관적 업데이트 - 서버 응답 전에 UI 먼저 업데이트
    onMutate: async ({ segmentId, newData }) => {
      // 진행 중인 요청 취소
      await queryClient.cancelQueries({ queryKey: ['segments', fileId] });
      
      // 이전 세그먼트 데이터 백업
      const previousSegments = queryClient.getQueryData<TranslationUnit[]>(['segments', fileId]);
      
      // 낙관적으로 캐시 업데이트
      if (previousSegments) {
        queryClient.setQueryData<TranslationUnit[]>(['segments', fileId], (old = []) => {
          return old.map(segment => {
            if (segment.id === segmentId) {
              return { 
                ...segment, 
                ...newData,
                updatedAt: new Date().toISOString() // 현재 시간으로 업데이트 시간 변경
              };
            }
            return segment;
          });
        });
      }
      
      // 편집 모드 즉시 종료 (UI 응답성 향상)
      setEditingId(null);
      
      // 상태 카운트 즉시 업데이트 (낙관적)
      if (newData.status) {
        setStatusCounts(prev => {
          const updatedCounts = { ...prev };
          // 이전 세그먼트 찾기
          const segment = previousSegments?.find(s => s.id === segmentId);
          if (segment && segment.status && updatedCounts[segment.status] > 0) {
            updatedCounts[segment.status]--;
          }
          // 새 상태 카운트 증가
          if (newData.status) {
            updatedCounts[newData.status] = (updatedCounts[newData.status] || 0) + 1;
          }
          return updatedCounts;
        });
      }
      
      // 이전 상태 반환 (롤백용)
      return { previousSegments };
    },
    
    // 서버 응답 후 캐시 업데이트
    onSuccess: (data) => {
      // 세그먼트 쿼리 캐시 업데이트 (invalidate 대신 캐시 직접 업데이트)
      queryClient.setQueryData<TranslationUnit[]>(['segments', fileId], (old = []) => {
        return old.map(segment => {
          if (segment.id === data.id) {
            return data;
          }
          return segment;
        });
      });
      
      // 파일 쿼리 무효화 (상태 카운트 등 업데이트를 위해)
      queryClient.invalidateQueries({
        queryKey: [`/api/files/${fileId}`]
      });
      
      // 성공 알림 (간결하게)
      toast({
        title: '저장 완료',
        description: '세그먼트가 업데이트되었습니다.',
        variant: 'default',
      });
    },
    
    // 오류 발생 시 롤백
    onError: (error, variables, context) => {
      console.error('세그먼트 업데이트 오류:', error);
      
      // 이전 상태로 캐시 복원
      if (context?.previousSegments) {
        queryClient.setQueryData(['segments', fileId], context.previousSegments);
      }
      
      // 오류 알림
      toast({
        title: '업데이트 실패',
        description: '세그먼트 업데이트 중 오류가 발생했습니다. 다시 시도하세요.',
        variant: 'destructive',
      });
    }
  });

  // 상태 토글 Mutation (낙관적 업데이트 적용)
  const toggleStatusMutation = useMutation({
    mutationFn: async ({
      segmentId,
      currentTarget,
      currentStatus,
      currentOrigin
    }: {
      segmentId: number;
      currentTarget: string;
      currentStatus: string;
      currentOrigin?: string;
    }) => {
      // 상태 토글 로직
      const newStatus = currentStatus === 'Reviewed' ? 'Edited' : 'Reviewed';
      
      // MT/100%/Fuzzy에서 Reviewed로 변경할 때 origin을 HT로 변경
      const needsOriginChange = 
        (currentOrigin === 'MT' || 
         currentOrigin === '100%' || 
         currentOrigin === 'Fuzzy');
         
      const newOrigin = (newStatus === 'Reviewed' && needsOriginChange) 
        ? 'HT' 
        : currentOrigin;
      
      const response = await apiRequest(
        'PATCH',
        `/api/segments/${segmentId}`,
        {
          target: currentTarget,
          status: newStatus,
          origin: newOrigin
        }
      );
      
      return response.json();
    },
    
    // 낙관적 업데이트 - 서버 응답 전에 UI 먼저 업데이트
    onMutate: async ({ segmentId, currentTarget, currentStatus, currentOrigin }) => {
      // 진행 중인 요청 취소
      await queryClient.cancelQueries({ queryKey: ['segments', fileId] });
      
      // 이전 세그먼트 데이터 백업
      const previousSegments = queryClient.getQueryData<TranslationUnit[]>(['segments', fileId]);
      
      // 새 상태 계산
      const newStatus = currentStatus === 'Reviewed' ? 'Edited' : 'Reviewed';
      
      // 원본 변경 필요 여부 확인
      const needsOriginChange = 
        (currentOrigin === 'MT' || 
         currentOrigin === '100%' || 
         currentOrigin === 'Fuzzy');
         
      const newOrigin = (newStatus === 'Reviewed' && needsOriginChange) 
        ? 'HT' 
        : currentOrigin;
      
      // 낙관적으로 캐시 업데이트
      if (previousSegments) {
        queryClient.setQueryData<TranslationUnit[]>(['segments', fileId], (old = []) => {
          return old.map(segment => {
            if (segment.id === segmentId) {
              return { 
                ...segment, 
                status: newStatus,
                origin: newOrigin,
                updatedAt: new Date().toISOString()
              };
            }
            return segment;
          });
        });
      }
      
      // 상태가 'Reviewed'로 변경되면 즉시 편집 모드 종료
      if (newStatus === 'Reviewed' && editingId === segmentId) {
        setEditingId(null);
      }
      
      // 상태 카운트 즉시 업데이트 (낙관적)
      setStatusCounts(prev => {
        const updatedCounts = { ...prev };
        // 이전 상태 카운트 감소
        if (currentStatus && updatedCounts[currentStatus] > 0) {
          updatedCounts[currentStatus]--;
        }
        // 새 상태 카운트 증가
        updatedCounts[newStatus] = (updatedCounts[newStatus] || 0) + 1;
        return updatedCounts;
      });
      
      // 성공 토스트 즉시 표시 (낙관적)
      toast({
        title: '상태 변경',
        description: `상태가 '${newStatus}'로 변경되었습니다.`,
        variant: 'default',
      });
      
      // 이전 상태 반환 (롤백용)
      return { previousSegments };
    },
    
    // 서버 응답 후 캐시 정확히 업데이트
    onSuccess: (data, variables) => {
      // 세그먼트 쿼리 캐시 업데이트 (invalidate 대신 캐시 직접 업데이트)
      queryClient.setQueryData<TranslationUnit[]>(['segments', fileId], (old = []) => {
        return old.map(segment => {
          if (segment.id === data.id) {
            return data;
          }
          return segment;
        });
      });
      
      // 파일 쿼리 무효화 (상태 카운트 등 업데이트를 위해)
      queryClient.invalidateQueries({
        queryKey: [`/api/files/${fileId}`]
      });
    },
    
    // 오류 발생 시 롤백
    onError: (error, variables, context) => {
      console.error('상태 토글 오류:', error);
      
      // 이전 상태로 캐시 복원
      if (context?.previousSegments) {
        queryClient.setQueryData(['segments', fileId], context.previousSegments);
      }
      
      // 오류 알림
      toast({
        title: '상태 변경 실패',
        description: '상태 변경 중 오류가 발생했습니다. 다시 시도하세요.',
        variant: 'destructive',
      });
    }
  });

  // 세그먼트 선택 처리
  const handleSelectForEditing = (segment: TranslationUnit) => {
    setEditingId(segment.id);
    setEditedValue(segment.target || '');
  };

  // 세그먼트 저장 처리
  const handleSave = (segmentId: number) => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return;
    
    // 값이 변경되었는지 확인
    const isValueChanged = editedValue !== segment.target;
    
    // 값이 변경되었고 상태가 필요한 경우 업데이트
    if (isValueChanged) {
      const needsOriginChange = 
        segment.origin === 'MT' || 
        segment.origin === '100%' || 
        segment.origin === 'Fuzzy';
        
      const newOrigin = needsOriginChange ? 'HT' : segment.origin;
      const newStatus = segment.status === 'Reviewed' ? 'Edited' : segment.status;
      
      updateSegmentMutation.mutate({
        segmentId,
        newData: {
          target: editedValue,
          status: newStatus,
          origin: newOrigin
        }
      });
    } else {
      // 값이 변경되지 않았으면 편집 모드만 종료
      setEditingId(null);
    }
  };

  // 토글 상태 처리
  const handleToggleStatus = (segment: TranslationUnit) => {
    toggleStatusMutation.mutate({
      segmentId: segment.id,
      currentTarget: String(segment.target || ''),
      currentStatus: segment.status,
      currentOrigin: segment.origin
    });
  };

  // 편집 취소 처리
  const handleCancel = () => {
    setEditingId(null);
  };

  // 세그먼트 타겟 업데이트 처리
  const handleUpdateSegment = (segmentId: number, target: string, status?: string, origin?: string) => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return;
    
    // 기존 값을 기본값으로 사용
    updateSegmentMutation.mutate({
      segmentId,
      newData: {
        target,
        status: status || segment.status,
        origin: origin || segment.origin
      }
    });
  };

  // 로딩 상태 처리
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <RotateCw className="w-8 h-8 animate-spin text-primary" />
        <p>세그먼트 로딩 중...</p>
      </div>
    );
  }

  // 오류 상태 처리
  if (isError) {
    return (
      <div className="p-8 bg-destructive/10 rounded-md">
        <h3 className="text-lg font-semibold text-destructive">데이터 로드 오류</h3>
        <p className="mt-2">{error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}</p>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['segments', fileId] })}
          variant="outline"
          className="mt-4"
        >
          <RotateCw className="w-4 h-4 mr-2" />
          다시 시도
        </Button>
      </div>
    );
  }

  // 상태별 개수 계산 - 최초 1회만 실행하고 캐싱
  const calculateStatusCounts = React.useCallback(() => {
    const counts: Record<string, number> = {
      'MT': 0,
      '100%': 0,
      'Fuzzy': 0,
      'Edited': 0,
      'Reviewed': 0,
      'Rejected': 0
    };
    
    segments.forEach(segment => {
      if (segment.status in counts) {
        counts[segment.status]++;
      }
    });
    
    // 상태 카운트 저장
    setStatusCounts(counts);
    
    return counts;
  }, [segments]);

  // 초기 카운트 계산 - segments가 로드된 후 한 번만 실행
  React.useEffect(() => {
    if (segments.length > 0 && Object.keys(statusCounts).length === 0) {
      calculateStatusCounts();
    }
  }, [segments, statusCounts, calculateStatusCounts]);

  // 진행률 계산 - statusCounts를 사용하여 계산 (캐시 활용)
  const progress = React.useMemo(() => {
    const total = segments.length;
    const completed = statusCounts['Reviewed'] || 0;
    return total > 0 ? (completed / total) * 100 : 0;
  }, [segments.length, statusCounts]);

  return (
    <div className="bg-card rounded-md overflow-hidden border">
      {/* 헤더 영역 */}
      <div className="p-4 bg-card border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">{fileName || `File ID: ${fileId}`}</h2>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="ghost" onClick={() => setShowSource(!showSource)}>
              {showSource ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
              {showSource ? '원본 숨기기' : '원본 보기'}
            </Button>
          </div>
        </div>
        
        {/* 진행률 표시 - 최적화된 메모이제이션 값 사용 */}
        <div className="mb-2">
          <div className="flex justify-between text-sm mb-1">
            <span>진행률: {Math.round(progress)}%</span>
            <span>
              {statusCounts['Reviewed'] || 0}/{segments.length} 세그먼트
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        {/* 상태 필터 뱃지 - 캐시된 상태 카운트 사용 */}
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <Badge key={status} variant="outline" className={cn(
              "py-1",
              status === 'Reviewed' && 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400',
              status === 'Edited' && 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400',
              status === 'Rejected' && 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400',
              status === 'MT' && 'bg-purple-100 text-purple-800 dark:bg-purple-800/20 dark:text-purple-400',
              status === '100%' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400',
              status === 'Fuzzy' && 'bg-orange-100 text-orange-800 dark:bg-orange-800/20 dark:text-orange-400',
            )}>
              {status}: {count}
            </Badge>
          ))}
        </div>
      </div>
      
      {/* 세그먼트 목록 */}
      <div className="p-4 divide-y divide-border">
        {segments.map((segment, index) => (
          <div key={segment.id} className="py-3">
            <DocSegment
              segment={segment}
              isSource={false}
              isEditing={editingId === segment.id}
              editedValue={editingId === segment.id ? editedValue : undefined}
              onEditValueChange={setEditedValue}
              onSelectForEditing={() => handleSelectForEditing(segment)}
              onSave={() => handleSave(segment.id)}
              onCancel={handleCancel}
              onUpdate={(target, status, origin) => handleUpdateSegment(segment.id, target, status, origin)}
              onToggleStatus={() => handleToggleStatus(segment)}
              className="mb-2"
              isDocumentMode={false}
              showStatusInEditor={true}
            />
            
            {showSource && (
              <DocSegment
                segment={segment}
                isSource={true}
                isEditing={false}
                className="mt-1 opacity-80"
                isDocumentMode={false}
              />
            )}
          </div>
        ))}
        
        {segments.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            세그먼트가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}