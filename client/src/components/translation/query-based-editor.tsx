import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { TranslationUnit, StatusType, OriginType } from '@/types';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { DocSegment } from './doc-segment-authenticated';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Check, X, MessageCircle, FileEdit, Save, Download,
  Languages, Eye, EyeOff, Smartphone, Monitor, FileText,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  RotateCw, Users, UserPlus, Activity, MessageSquare,
  Wifi, WifiOff
} from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  
  // Real-time collaboration state
  const [activeUsers, setActiveUsers] = useState<number>(1); // Default to 1 (current user)
  const [recentUpdates, setRecentUpdates] = useState<Array<{id: number, timestamp: number}>>([]);
  const [showCollaborationInfo, setShowCollaborationInfo] = useState<boolean>(false);
  
  // WebSocket connection for real-time updates
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  const {
    status: wsStatus,
    sendMessage,
    lastMessage,
    connect: wsConnect,
    disconnect: wsDisconnect
  } = useWebSocket(wsUrl, {
    onOpen: () => {
      console.log('WebSocket connected');
      sendMessage({
        type: 'subscribe',
        fileId
      });
      
      toast({
        title: '실시간 연결됨',
        description: '다른 편집자의 변경사항이 자동으로 표시됩니다.',
        variant: 'default',
      });
    },
    onMessage: (data) => {
      if (data.type === 'segmentUpdate' && data.segment && data.segment.fileId === fileId) {
        // 다른 사용자의 세그먼트 업데이트를 받았을 때 처리
        console.log('Received segment update via WebSocket:', data.segment);
        
        // 업데이트된 세그먼트가 지금 편집 중인 세그먼트가 아닌 경우에만 적용
        // (편집 중인 세그먼트는 로컬 상태가 우선)
        if (data.segment.id !== editingId) {
          // React Query의 쿼리 캐시 업데이트
          queryClient.setQueryData(['segments', fileId], (oldData: TranslationUnit[] | undefined) => {
            if (!oldData) return oldData;
            
            return oldData.map(segment => 
              segment.id === data.segment.id ? data.segment : segment
            );
          });
          
          // 실시간 업데이트 알림 관리 - 최근 업데이트 추가 및 최대 5개 유지
          setRecentUpdates(prev => {
            const newUpdates = [
              { id: data.segment.id, timestamp: Date.now() },
              ...prev.filter(update => update.id !== data.segment.id)
            ].slice(0, 5);
            return newUpdates;
          });
          
          // 상태 카운트 업데이트 표시
          toast({
            title: '실시간 업데이트',
            description: `세그먼트 #${data.segment.id}가 다른 사용자에 의해 업데이트되었습니다.`,
            variant: 'default',
          });
        }
      } else if (data.type === 'userCount' && typeof data.count === 'number') {
        // 현재 활성 사용자 수 업데이트
        setActiveUsers(data.count);
      } else if (data.type === 'info') {
        // 서버 정보 메시지 표시
        console.log('WebSocket info message:', data.message);
      }
    },
    onClose: () => {
      console.log('WebSocket disconnected');
      toast({
        title: '실시간 연결 종료됨',
        description: '다른 편집자의 변경사항이 더 이상 자동으로 표시되지 않습니다.',
        variant: 'destructive',
      });
    },
    reconnectAttempts: 5
  });

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

  // 세그먼트 업데이트를 위한 Mutation
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
    // 성공 시 캐시 무효화로 UI 업데이트
    onSuccess: (data) => {
      // 세그먼트 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: ['segments', fileId]
      });
      
      // 파일 쿼리 무효화 (상태 카운트 등 업데이트를 위해)
      queryClient.invalidateQueries({
        queryKey: [`/api/files/${fileId}`]
      });
      
      // WebSocket을 통해 다른 사용자에게 업데이트 알림
      if (wsStatus === 'open') {
        sendMessage({
          type: 'segmentUpdate',
          fileId,
          segment: data,
        });
      }
      
      // 상태 업데이트 후 편집 모드 종료
      setEditingId(null);
      
      // 성공 알림
      toast({
        title: '업데이트 완료',
        description: '세그먼트가 성공적으로 업데이트되었습니다.',
        variant: 'default',
      });
    },
    // 실패 시 오류 처리
    onError: (error) => {
      console.error('세그먼트 업데이트 오류:', error);
      toast({
        title: '업데이트 실패',
        description: '세그먼트 업데이트 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  });

  // 상태 토글 Mutation
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
    // 성공 시 캐시 무효화 및 UI 업데이트
    onSuccess: (data) => {
      // 세그먼트 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: ['segments', fileId]
      });
      
      // 파일 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: [`/api/files/${fileId}`]
      });
      
      // 상태가 'Reviewed'로 변경되면 편집 모드 종료
      if (data.status === 'Reviewed') {
        setEditingId(null);
      }
      
      // 성공 알림
      toast({
        title: '상태 변경 완료',
        description: `상태가 '${data.status}'로 변경되었습니다.`,
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('상태 토글 오류:', error);
      toast({
        title: '상태 변경 실패',
        description: '상태 변경 중 오류가 발생했습니다.',
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

  // 상태별 개수 계산
  const calculateStatusCounts = () => {
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
    
    return counts;
  };

  // 진행률 계산
  const calculateProgress = () => {
    const counts = calculateStatusCounts();
    const total = segments.length;
    const completed = counts['Reviewed'] || 0;
    return total > 0 ? (completed / total) * 100 : 0;
  };

  return (
    <div className="bg-card rounded-md overflow-hidden border">
      {/* 헤더 영역 */}
      <div className="p-4 bg-card border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">{fileName || `File ID: ${fileId}`}</h2>
          <div className="flex items-center space-x-2">
            {/* WebSocket 연결 상태 표시 */}
            {wsStatus === 'open' ? (
              <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1 px-2 py-1">
                <Wifi className="h-3 w-3" /> 실시간 연결됨
              </Badge>
            ) : wsStatus === 'connecting' ? (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 flex items-center gap-1 px-2 py-1">
                <RotateCw className="h-3 w-3 animate-spin" /> 연결 중...
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 flex items-center gap-1 px-2 py-1 cursor-pointer" onClick={wsConnect}>
                <WifiOff className="h-3 w-3" /> 오프라인 (클릭하여 재연결)
              </Badge>
            )}
            
            {/* 협업 정보 표시 버튼 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex items-center gap-1"
                    onClick={() => setShowCollaborationInfo(!showCollaborationInfo)}
                  >
                    <Users className="h-4 w-4" />
                    <span className="font-medium">{activeUsers}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {activeUsers > 1 
                    ? `현재 ${activeUsers}명의 사용자가 이 파일을 편집 중입니다.` 
                    : '현재 다른 사용자가 연결되어 있지 않습니다.'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Button size="sm" variant="ghost" onClick={() => setShowSource(!showSource)}>
              {showSource ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
              {showSource ? '원본 숨기기' : '원본 보기'}
            </Button>
          </div>
        </div>
        
        {/* 진행률 표시 */}
        <div className="mb-2">
          <div className="flex justify-between text-sm mb-1">
            <span>진행률: {Math.round(calculateProgress())}%</span>
            <span>
              {calculateStatusCounts()['Reviewed'] || 0}/{segments.length} 세그먼트
            </span>
          </div>
          <Progress value={calculateProgress()} className="h-2" />
        </div>
        
        {/* 협업 활동 표시 */}
        {showCollaborationInfo && (
          <div className="mb-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold flex items-center gap-1">
                <Activity className="h-3.5 w-3.5" /> 실시간 협업 활동
              </h3>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowCollaborationInfo(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            {recentUpdates.length > 0 ? (
              <div className="space-y-1 text-xs">
                {recentUpdates.map((update, index) => (
                  <div key={index} className="flex items-center gap-1 text-muted-foreground">
                    <MessageSquare className="h-3 w-3" />
                    <span>세그먼트 #{update.id}가 업데이트됨</span>
                    <span className="text-xs ml-auto">
                      {new Date(update.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">아직 다른 사용자의 변경사항이 없습니다.</p>
            )}
          </div>
        )}
        
        {/* 상태 필터 뱃지 */}
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(calculateStatusCounts()).map(([status, count]) => (
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