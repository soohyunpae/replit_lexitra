import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Job {
  id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  type: 'template_matching' | 'template_application' | 'gpt_translation';
  progress: number;
  result?: any;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

interface JobProgressMonitorProps {
  projectId: number;
  onJobComplete?: (job: Job) => void;
  className?: string;
}

const JobProgressMonitor: React.FC<JobProgressMonitorProps> = ({
  projectId,
  onJobComplete,
  className = ""
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);

  // 프로젝트의 모든 작업 조회
  const { data: jobsData, isLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/jobs`],
    refetchInterval: (data: any) => {
      // 진행 중인 작업이 있으면 2초마다 새로고침
      const hasActiveJobs = data?.jobs?.some((job: Job) => 
        job.status === 'pending' || job.status === 'processing'
      );
      return hasActiveJobs ? 2000 : false;
    },
    refetchIntervalInBackground: true
  });

  useEffect(() => {
    if (jobsData && (jobsData as any).success && (jobsData as any).jobs) {
      const jobs = (jobsData as any).jobs as Job[];
      
      // 진행 중인 작업만 필터링
      const currentActiveJobs = jobs.filter(job => 
        job.status === 'pending' || job.status === 'processing'
      );
      
      // 완료된 작업 감지
      const previousActiveJobIds = activeJobs.map(job => job.id);
      const completedJobs = jobs.filter(job => 
        job.status === 'completed' && 
        previousActiveJobIds.includes(job.id) &&
        !activeJobs.find(activeJob => activeJob.id === job.id && activeJob.status === 'completed')
      );

      // 완료 콜백 호출
      completedJobs.forEach(job => {
        if (onJobComplete) {
          onJobComplete(job);
        }
        
        // 완료 토스트 표시
        toast({
          title: getJobTypeLabel(job.type) + " 완료",
          description: getJobCompletionMessage(job),
          variant: job.status === 'completed' ? 'default' : 'destructive'
        });
      });

      setActiveJobs(currentActiveJobs);
    }
  }, [jobsData, activeJobs, onJobComplete, toast]);

  const getJobTypeLabel = (type: Job['type']): string => {
    switch (type) {
      case 'template_matching': return '템플릿 매칭';
      case 'template_application': return '템플릿 적용';
      case 'gpt_translation': return 'GPT 번역';
      default: return '작업';
    }
  };

  const getJobCompletionMessage = (job: Job): string => {
    if (job.status === 'failed') {
      return job.errorMessage || '작업이 실패했습니다.';
    }
    
    if (job.result) {
      switch (job.type) {
        case 'template_matching':
          return job.result.matched 
            ? `템플릿 "${job.result.templateName}"이 매칭되었습니다.`
            : '매칭되는 템플릿이 없습니다.';
        case 'template_application':
          return `${job.result.processedSegments || 0}개 세그먼트에 템플릿이 적용되었습니다.`;
        case 'gpt_translation':
          return `${job.result.processedSegments || 0}개 세그먼트가 번역되었습니다.`;
        default:
          return '작업이 완료되었습니다.';
      }
    }
    
    return '작업이 완료되었습니다.';
  };

  const getStatusIcon = (status: Job['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'processing': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const refreshJobs = () => {
    queryClient.invalidateQueries({
      queryKey: [`/api/projects/${projectId}/jobs`]
    });
  };

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">작업 상태 확인 중...</span>
      </div>
    );
  }

  if (!activeJobs || activeJobs.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {activeJobs.map((job) => (
        <Card key={job.id} className="w-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(job.status)}
                <CardTitle className="text-sm">
                  {getJobTypeLabel(job.type)}
                </CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-medium ${getStatusColor(job.status)}`}>
                  {job.status === 'pending' && '대기 중'}
                  {job.status === 'processing' && '진행 중'}
                  {job.status === 'completed' && '완료'}
                  {job.status === 'failed' && '실패'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshJobs}
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {job.status === 'processing' && (
              <CardDescription className="text-xs">
                진행률: {job.progress}%
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {job.status === 'processing' && (
              <div className="space-y-2">
                <Progress value={job.progress} className="w-full h-2" />
                <div className="text-xs text-muted-foreground">
                  {job.progress < 25 && '작업 초기화 중...'}
                  {job.progress >= 25 && job.progress < 50 && '파일 분석 중...'}
                  {job.progress >= 50 && job.progress < 75 && '처리 중...'}
                  {job.progress >= 75 && job.progress < 100 && '완료 중...'}
                  {job.progress === 100 && '마무리 중...'}
                </div>
              </div>
            )}
            {job.status === 'failed' && job.errorMessage && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                {job.errorMessage}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default JobProgressMonitor;