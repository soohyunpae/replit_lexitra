import React, { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Clock, FileText, RefreshCw } from 'lucide-react';
import useWebSocket from '@/hooks/useWebSocket';
import { Badge } from '@/components/ui/badge';

interface FileProgressIndicatorProps {
  projectId?: number;
}

export function FileProgressIndicator({ projectId }: FileProgressIndicatorProps) {
  // WebSocket 연결 및 파일 진행 상황 확인
  const { isReady, fileProgress } = useWebSocket({
    reconnectOnClose: true,
    reconnectInterval: 2000,
  });

  // 파일 진행 상황을 배열로 변환
  const progressItems = useMemo(() => {
    return Object.values(fileProgress).filter(item => {
      // 특정 프로젝트 ID가 제공된 경우 해당 프로젝트의 파일만 필터링
      if (projectId !== undefined) {
        return item.projectId === projectId;
      }
      return true;
    });
  }, [fileProgress, projectId]);

  // 진행 중인 파일이 없는 경우
  if (progressItems.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          파일 처리 진행 상황
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {progressItems.map((item, index) => (
          <div key={`${item.filename}-${index}`} className="space-y-2">
            <div className="flex justify-between">
              <div className="font-medium text-sm flex items-center gap-2">
                {item.status === 'processing' && (
                  <RefreshCw className="h-4 w-4 animate-spin text-yellow-500" />
                )}
                {item.status === 'completed' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {item.status === 'error' && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                {item.filename}
              </div>
              <Badge 
                variant={
                  item.status === 'completed' 
                    ? 'outline' // 완료된 항목에는 outline 사용
                    : item.status === 'error' 
                      ? 'destructive' // 오류 항목에는 destructive 사용
                      : 'secondary' // 처리 중인 항목에는 secondary 사용
                }
                className={
                  item.status === 'completed'
                    ? 'bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900'
                    : ''
                }
              >
                {item.status === 'processing'
                  ? '처리 중'
                  : item.status === 'completed'
                  ? '완료됨'
                  : '오류'}
              </Badge>
            </div>

            {item.message && (
              <p className="text-xs text-muted-foreground">{item.message}</p>
            )}

            {item.status === 'processing' && (
              <Progress value={item.progress} 
                className={
                  item.progress > 0 ? 'animate-pulse' : ''
                }
              />
            )}

            {item.status === 'completed' && (
              <Progress value={100} className="bg-green-100" />
            )}

            {item.status === 'error' && (
              <Progress value={100} className="bg-red-100" />
            )}
          </div>
        ))}

        {!isReady && (
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
            <Clock className="h-3 w-3" />
            서버와 연결 중...
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FileProgressIndicator;