import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle, Play } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TranslationProgressProps {
  projectId: number;
  fileId: number;
  fileName: string;
  onTranslationStart?: () => void;
  onTranslationComplete?: () => void;
}

export function TranslationProgress({ 
  projectId, 
  fileId, 
  fileName,
  onTranslationStart,
  onTranslationComplete 
}: TranslationProgressProps) {
  const { data: progress, isLoading } = useQuery({
    queryKey: ["translation-progress", projectId, fileId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/projects/${projectId}/files/${fileId}/progress`);
      return response.json();
    },
    refetchInterval: (data) => {
      // Stop refetching if completed or error
      if (data?.processingStatus === 'ready' || data?.processingStatus === 'error') {
        return false;
      }
      // Refetch every 2 seconds while processing
      return data?.processingStatus === 'translating' ? 2000 : 5000;
    },
    enabled: true
  });

  const handleStartTranslation = async () => {
    try {
      await apiRequest("POST", `/api/projects/${projectId}/translate`, {
        fileId
      });
      onTranslationStart?.();
    } catch (error) {
      console.error("Failed to start translation:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 p-4 border rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading progress...</span>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="flex items-center space-x-2 p-4 border rounded-lg">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <span className="text-sm text-destructive">Failed to load progress</span>
      </div>
    );
  }

  const renderStatusContent = () => {
    switch (progress.processingStatus) {
      case 'uploaded':
      case 'parsing':
        return (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm">파싱 중...</span>
          </div>
        );

      case 'parsed':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">
                  원문 {progress.totalSegments || 0}개 세그먼트 준비됨
                </span>
              </div>
              <Button 
                onClick={handleStartTranslation}
                size="sm"
                className="flex items-center space-x-1"
              >
                <Play className="h-3 w-3" />
                <span>번역 시작</span>
              </Button>
            </div>
          </div>
        );

      case 'translating':
        const percentage = progress.percentage || 0;
        const completed = progress.completedSegments || 0;
        const total = progress.totalSegments || 0;
        
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm font-medium">번역 진행 중</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {completed} / {total} 완료
              </span>
            </div>
            <div className="space-y-1">
              <Progress value={percentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{percentage}% 완료</span>
                <span>예상 시간: {Math.ceil((total - completed) / 10)} 분</span>
              </div>
            </div>
          </div>
        );

      case 'ready':
        return (
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-700">번역 완료</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = `/translation/${fileId}`}
            >
              편집하기
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">번역 오류</span>
            </div>
            {progress.errorMessage && (
              <p className="text-xs text-muted-foreground">
                {progress.errorMessage}
              </p>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleStartTranslation}
            >
              다시 시도
            </Button>
          </div>
        );

      default:
        return (
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 rounded-full bg-gray-300" />
            <span className="text-sm text-muted-foreground">대기 중</span>
          </div>
        );
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium truncate" title={fileName}>
          {fileName}
        </h4>
        <span className="text-xs text-muted-foreground">
          {progress.processingStatus}
        </span>
      </div>
      {renderStatusContent()}
    </div>
  );
}