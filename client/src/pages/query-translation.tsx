import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { QueryBasedEditor } from '@/components/translation/query-based-editor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCw, ChevronLeft, File } from 'lucide-react';
import { Link } from 'wouter';

/**
 * React Query 기반 번역 페이지
 * 
 * 이 페이지는 기존 번역 페이지의 대안으로, React Query를 활용한 상태 관리를 보여줍니다.
 * - useState 대신 useQuery로 서버 데이터 관리
 * - 낙관적 업데이트 + 자동 캐시 무효화를 통한 즉각적인 UI 반영
 * - 더 효율적인 상태 관리와 성능 개선
 */
export default function QueryTranslationPage() {
  // 라우트 파라미터에서 파일 ID 추출
  const [, params] = useRoute<{ fileId: string }>('/query-translation/:fileId');
  const fileId = params?.fileId ? parseInt(params.fileId, 10) : 0;

  // 파일 정보 조회 (React Query 사용)
  const {
    data: fileData,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: [`/api/files/${fileId}`],
    queryFn: async () => {
      if (!fileId) return null;
      const response = await apiRequest('GET', `/api/files/${fileId}`);
      return response.json();
    },
    // 파일 ID가 유효한 경우에만 쿼리 활성화
    enabled: !!fileId,
    refetchOnWindowFocus: false
  });

  // 프로젝트 정보 조회
  const { data: projectData } = useQuery({
    queryKey: ['/api/projects', fileData?.projectId],
    queryFn: async () => {
      if (!fileData?.projectId) return null;
      const response = await apiRequest('GET', `/api/projects/${fileData.projectId}`);
      return response.json();
    },
    // 파일 데이터가 있고 프로젝트 ID가 있는 경우에만 활성화
    enabled: !!fileData?.projectId,
    refetchOnWindowFocus: false
  });

  // ID가 없는 경우
  if (!fileId) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>파일을 찾을 수 없습니다</CardTitle>
            <CardDescription>
              유효한 파일 ID를 URL에 입력해주세요.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/">
              <Button variant="default">
                <ChevronLeft className="w-4 h-4 mr-2" />
                홈으로 돌아가기
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <RotateCw className="w-5 h-5 mr-2 animate-spin" />
              파일 데이터 로딩 중...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">파일 ID: {fileId}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 에러 상태
  if (isError || !fileData) {
    return (
      <div className="container py-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">파일을 불러올 수 없습니다</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RotateCw className="w-4 h-4 mr-2" />
              다시 시도
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/files">
            <Button variant="outline" className="mb-2">
              <ChevronLeft className="w-4 h-4 mr-1" />
              파일 목록으로
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{fileData.name}</h1>
          {projectData && (
            <p className="text-muted-foreground">
              프로젝트: {projectData.name} | 
              {projectData.sourceLanguage} → {projectData.targetLanguage}
            </p>
          )}
        </div>
      </div>

      {/* React Query 기반 에디터 컴포넌트 */}
      <QueryBasedEditor
        fileId={fileId}
        fileName={fileData.name}
        sourceLanguage={projectData?.sourceLanguage}
        targetLanguage={projectData?.targetLanguage}
      />
    </div>
  );
}