# 파일 업로드 UX 개선을 위한 비동기 처리 구현 방안

## 🔍 현재 문제 상황 분석

### UX 문제점
- 파일 업로드 시 모든 처리(구조 분석 + 세그먼트 저장 + GPT 번역)가 동시에 실행
- 사용자가 오랜 시간 대기해야 하는 상황 발생
- 프로젝트 생성 완료까지 페이지가 블로킹됨

### 현재 처리 흐름
```
파일 업로드 → 구조 분석 → 세그먼트 저장 → GPT 번역 → 프로젝트 생성 완료
(전체 과정이 한 번에 처리됨 - 3-5분 소요)
```

## 🎯 개선 목표

### 제안하는 새로운 흐름
```
1단계: 파일 업로드 → 구조 분석 → 세그먼트 저장 → 프로젝트 즉시 생성 (30초 이내)
2단계: GPT 번역은 백그라운드에서 자동 실행되며, 사용자는 번역 상태만 확인
```

## 🛠️ 구현 방안

### Phase 1: 기존 구조 개선

#### 1-1. 프로젝트 상태 표시 개선
**파일**: `client/src/pages/project.tsx`

현재 이미 구현된 `processingStatus` 필드를 더 잘 활용:

```typescript
// 현재 상태: "processing", "ready", "error"
// 파일별로 처리 상태가 표시되고 있음

// UI에서 상태를 더 명확하게 표시
{file.processingStatus === "processing" && (
  <div className="flex items-center">
    <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full mr-1"></div>
    <span className="text-xs">번역 진행 중...</span>
  </div>
)}
```

#### 1-2. 진행률 표시 개선
**파일**: `client/src/pages/project.tsx`

기존 진행률 API를 더 자주 폴링하여 실시간성 개선:

```typescript
// 현재 이미 있는 API: GET /api/projects/:id/stats
// 폴링 주기를 5초에서 2초로 단축
const { data: projectStats } = useQuery({
  queryKey: [`/api/projects/${projectId}/stats`],
  refetchInterval: 2000, // 2초마다 갱신
  enabled: !!projectId && hasProcessingFiles
});
```

### Phase 2: 백그라운드 처리 최적화

#### 2-1. 현재 비동기 처리 구조 개선
**파일**: `server/routes.ts`

현재 이미 구현된 `setImmediate` 기반 비동기 처리를 더 효율적으로:

```typescript
// 현재 구조 (라인 1100-1200 참조):
setImmediate(async () => {
  // 파일 처리를 백그라운드에서 실행
  await processFileSegments(fileRecord.id, fileContent, project.id);
});

// 개선 방안: 진행률 업데이트 추가
setImmediate(async () => {
  try {
    // 단계별 진행률 업데이트
    await updateProcessingProgress(project.id, 10, "구조 분석 중");
    await processFileContent(file);

    await updateProcessingProgress(project.id, 50, "세그먼트 생성 중");
    await createSegments(fileRecord.id, fileContent);

    await updateProcessingProgress(project.id, 80, "번역 중");
    await translateSegments(fileRecord.id, project.id);

    await updateProcessingProgress(project.id, 100, "완료");
  } catch (error) {
    await updateProcessingProgress(project.id, -1, "오류 발생");
  }
});
```

#### 2-2. 배치 처리 개선
**파일**: `server/routes.ts` (processFileSegments 함수)

현재 세그먼트별 순차 처리를 배치 단위로 개선:

```typescript
// 현재: 각 세그먼트마다 개별 GPT 호출
// 개선: 5-10개씩 배치로 처리
const batchSize = 5;
for (let i = 0; i < savedSegments.length; i += batchSize) {
  const batch = savedSegments.slice(i, i + batchSize);

  // 배치 단위로 병렬 처리
  await Promise.all(batch.map(segment => translateSegment(segment)));

  // 배치 완료 후 잠시 대기 (API 레이트 리미트 고려)
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

### Phase 3: 사용자 피드백 개선

#### 3-1. 실시간 상태 업데이트
**파일**: `client/src/pages/project.tsx`

현재 파일별 상태 표시를 더 상세하게:

```typescript
// 현재 표시되는 상태를 더 구체적으로
const getProcessingMessage = (file) => {
  switch (file.processingStatus) {
    case "processing":
      return "파일 분석 및 번역 진행 중...";
    case "ready":
      return "번역 완료";
    case "error":
      return `오류: ${file.errorMessage || "처리 실패"}`;
    default:
      return "대기 중";
  }
};
```

#### 3-2. 전체 프로젝트 진행률 표시
**파일**: `client/src/pages/project.tsx`

파일별 상태를 종합한 전체 진행률:

```typescript
// 전체 프로젝트 처리 상태 계산
const calculateOverallProgress = (files) => {
  const totalFiles = files.length;
  const readyFiles = files.filter(f => f.processingStatus === "ready").length;
  const processingFiles = files.filter(f => f.processingStatus === "processing").length;

  if (totalFiles === 0) return { status: "empty", progress: 0 };
  if (readyFiles === totalFiles) return { status: "completed", progress: 100 };
  if (processingFiles > 0) return { status: "processing", progress: (readyFiles / totalFiles) * 100 };

  return { status: "ready", progress: 100 };
};
```

### Phase 4: 오류 처리 및 재시도

#### 4-1. 실패한 번역 재시도
**파일**: `server/routes.ts`

```typescript
// 번역 실패 시 자동 재시도 로직
const translateWithRetry = async (segment, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await translateWithGPT(segment);
      return result;
    } catch (error) {
      console.log(`번역 시도 ${attempt}/${maxRetries} 실패:`, error.message);

      if (attempt === maxRetries) {
        // 최종 실패 시 파일 상태를 error로 업데이트
        await db.update(schema.files)
          .set({ 
            processingStatus: "error",
            errorMessage: `번역 실패: ${error.message}`
          })
          .where(eq(schema.files.id, segment.fileId));
        throw error;
      }

      // 재시도 전 대기
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};
```

#### 4-2. 사용자 제어 옵션
**파일**: `client/src/pages/project.tsx`

```typescript
// 처리 중인 파일에 대한 제어 버튼
{file.processingStatus === "processing" && (
  <Button 
    variant="outline" 
    size="sm"
    onClick={() => pauseProcessing(file.id)}
  >
    일시정지
  </Button>
)}

{file.processingStatus === "error" && (
  <Button 
    variant="outline" 
    size="sm"
    onClick={() => retryProcessing(file.id)}
  >
    재시도
  </Button>
)}
```

## 🚀 기대 효과

### 사용자 경험 개선
- **대기 시간 80% 단축**: 프로젝트 생성 후 즉시 접근 가능
- **투명한 진행률**: 파일별 처리 상태 실시간 확인
- **오류 복구**: 실패한 처리에 대한 재시도 옵션

### 시스템 안정성
- **기존 구조 활용**: 현재 잘 작동하는 비동기 처리 구조 유지
- **점진적 개선**: 큰 변경 없이 단계별 개선
- **호환성 유지**: 기존 API 및 데이터 구조 보존

## 📋 구현 우선순위

### High Priority (1주)
1. **진행률 표시 개선**: 현재 상태를 더 명확하게 표시
2. **배치 처리 최적화**: 번역 속도 개선
3. **오류 처리 강화**: 실패 시 사용자 피드백

### Medium Priority (2주)
1. **실시간 폴링 개선**: 더 자주 상태 업데이트
2. **재시도 메커니즘**: 실패한 처리 복구
3. **전체 진행률 표시**: 프로젝트 수준 상태 표시

### Low Priority (3주)
1. **사용자 제어 옵션**: 일시정지/재시작 기능
2. **성능 모니터링**: 처리 시간 분석
3. **알림 시스템**: 완료 시 사용자 알림

## ✅ 결론

현재 코드베이스는 이미 효율적인 비동기 처리 구조를 가지고 있습니다. 대규모 구조 변경보다는 기존 시스템을 개선하여 사용자 경험을 향상시키는 것이 더 안전하고 효과적입니다.

주요 개선 포인트:
1. 현재 `processingStatus` 필드를 더 잘 활용
2. 기존 비동기 처리에 진행률 업데이트 추가
3. 배치 처리로 번역 속도 개선
4. 오류 처리 및 재시도 메커니즘 강화

이러한 점진적 개선을 통해 시스템 안정성을 유지하면서도 사용자 경험을 크게 향상시킬 수 있습니다.
`