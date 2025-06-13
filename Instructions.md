
# 📄 Lexitra 파일 처리 구조 개선안

## ✅ 현재 구조 (문제점 포함)

| 단계 | 작업 내용 | 문제점 |
|------|-----------|--------|
| ① 파일 업로드 | 문서 저장 | 빠름 |
| ② 파싱 + TM 매칭 + GPT 번역 | 모든 처리 동시에 수행 | 처리 시간이 길어 UI가 멈춘 것처럼 보임 |
| ③ 화면 표시 | 번역 결과 표시 | 전 단계 완료까지 기다려야 하므로 사용자 경험 나쁨 |

## 🚀 개선 후 구조 (단계 분리 + 비동기 처리)

| 단계 | 작업 내용 | 실행 시점 |
|------|-----------|-----------|
| ① 파일 업로드 | 문서 저장 | 업로드 즉시 |
| ② 전처리 (파싱/세그먼트 추출) | 원문만 추출 | 업로드 직후 빠르게 처리 |
| ③ 화면 표시 | 원문만 먼저 렌더링 | 사용자 즉시 확인 가능 |
| ④ TM 매칭 + GPT 번역 | 번역 버튼 클릭 시 실행 | 프론트에서 요청 후 백엔드 비동기 처리 |
| ⑤ 상태 UI 표시 | 진행 중 상태 / 완료 알림 | 사용자 경험 개선 |

## 🛠 구체적인 구현 작업 항목

### 1. 백엔드 API 분리 및 리팩토링

#### 현재 문제점 분석
- `server/routes.ts`의 `/api/initialize` 엔드포인트가 모든 처리를 한 번에 수행
- 파일 파싱, TM 매칭, GPT 번역이 순차적으로 실행되어 응답 시간이 길어짐

#### 개선 방안

**A. API 엔드포인트 분리**
```typescript
// 기존: POST /api/initialize (모든 처리 한 번에)
// 개선: 아래 3개 API로 분리

POST /api/projects/:id/parse        // 파일 파싱 및 세그먼트 추출만
POST /api/projects/:id/translate    // TM 매칭 + GPT 번역 (비동기)
GET  /api/projects/:id/status       // 번역 진행 상황 조회
```

**B. 파일 상태 관리 개선**
```typescript
// files 테이블에 상태 필드 추가/활용
enum FileStatus {
  UPLOADED = 'uploaded',     // 업로드 완료
  PARSING = 'parsing',       // 파싱 중
  PARSED = 'parsed',         // 파싱 완료 (원문 세그먼트 추출됨)
  TRANSLATING = 'translating', // 번역 중
  READY = 'ready'            // 번역 완료
}
```

### 2. 프론트엔드 UI/UX 개선

#### A. 프로젝트 페이지 개선 (`client/src/pages/project.tsx`)
```typescript
// 파일 상태별 UI 표시 로직
const renderFileStatus = (file: FileInfo) => {
  switch (file.status) {
    case 'uploaded':
    case 'parsing':
      return <Skeleton>파싱 중...</Skeleton>;
    case 'parsed':
      return (
        <div>
          <Button onClick={() => startTranslation(file.id)}>
            전체 번역 시작
          </Button>
          <span>원문 {file.segmentCount}개 세그먼트 준비됨</span>
        </div>
      );
    case 'translating':
      return <TranslationProgress fileId={file.id} />;
    case 'ready':
      return <Button variant="success">번역 완료 - 편집하기</Button>;
  }
};
```

#### B. 번역 진행 상황 컴포넌트 추가
```typescript
// client/src/components/TranslationProgress.tsx
const TranslationProgress = ({ fileId }: { fileId: number }) => {
  const { data: progress } = useQuery({
    queryKey: ['translation-progress', fileId],
    queryFn: () => api.getTranslationProgress(fileId),
    refetchInterval: 2000, // 2초마다 상태 확인
  });

  return (
    <div>
      <ProgressBar value={progress?.percentage || 0} />
      <span>{progress?.completed || 0} / {progress?.total || 0} 세그먼트 완료</span>
    </div>
  );
};
```

### 3. 백엔드 비동기 처리 로직

#### A. 번역 작업 큐 시스템 (간단한 버전)
```typescript
// server/services/translation-queue.ts
class TranslationQueue {
  private static queue: Map<number, TranslationJob> = new Map();

  static async startTranslation(fileId: number) {
    const job = new TranslationJob(fileId);
    this.queue.set(fileId, job);
    
    // 백그라운드에서 비동기 실행
    job.start().catch(console.error);
    
    return { jobId: fileId, status: 'started' };
  }

  static getProgress(fileId: number) {
    const job = this.queue.get(fileId);
    return job?.getProgress() || { status: 'not_found' };
  }
}
```

#### B. 청크 단위 번역 처리
```typescript
// 10-20 세그먼트씩 묶어서 GPT 요청
const translateInChunks = async (segments: Segment[]) => {
  const CHUNK_SIZE = 15;
  const chunks = chunkArray(segments, CHUNK_SIZE);
  
  for (const chunk of chunks) {
    try {
      const translations = await openai.translateBatch(chunk);
      await saveTranslations(translations);
      
      // 진행 상황 업데이트
      await updateTranslationProgress(fileId, chunk.length);
    } catch (error) {
      console.error('청크 번역 실패:', error);
      // 실패한 청크는 개별 처리 또는 재시도
    }
  }
};
```

### 4. 데이터베이스 스키마 조정

#### A. 번역 진행 상황 추적 테이블
```sql
-- translation_progress 테이블 추가
CREATE TABLE translation_progress (
  file_id INTEGER PRIMARY KEY,
  total_segments INTEGER NOT NULL,
  completed_segments INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT
);
```

#### B. 기존 files 테이블 활용
```typescript
// 기존 status 필드 값 확장 활용
// 'processing' -> 'parsing', 'translating', 'ready' 등으로 세분화
```

### 5. API 호출 플로우 개선

#### A. 파일 업로드 후 플로우
```typescript
// 1. 파일 업로드
const uploadResponse = await api.uploadFile(file);

// 2. 즉시 파싱 시작 (빠른 처리)
const parseResponse = await api.parseFile(uploadResponse.fileId);

// 3. 원문 세그먼트 즉시 표시
router.push(`/projects/${projectId}`);

// 4. 사용자가 "번역 시작" 버튼 클릭 시
const translateResponse = await api.startTranslation(fileId);

// 5. 번역 진행 상황 모니터링
const { data: progress } = useQuery({
  queryKey: ['translation-progress', fileId],
  queryFn: () => api.getTranslationProgress(fileId),
  refetchInterval: 3000,
  enabled: isTranslating
});
```

### 6. 타임아웃 및 에러 처리

#### A. 요청 타임아웃 설정
```typescript
// 각 API 요청별 적절한 타임아웃 설정
const API_TIMEOUTS = {
  parse: 30000,      // 30초 (파싱)
  translate: 300000, // 5분 (번역 시작)
  progress: 10000    // 10초 (상태 조회)
};
```

#### B. 에러 복구 로직
```typescript
// 번역 실패 시 재시도 로직
const retryFailedSegments = async (fileId: number) => {
  const failedSegments = await getFailedSegments(fileId);
  for (const segment of failedSegments) {
    try {
      await translateSingleSegment(segment);
    } catch (error) {
      // 최대 3회 재시도 후 수동 번역으로 마킹
      await markAsManualTranslationNeeded(segment.id);
    }
  }
};
```

## 📋 구현 우선순위

### Phase 1: 기본 분리 (1-2일)
1. API 엔드포인트 분리 (`/parse`, `/translate`, `/status`)
2. 파일 상태 관리 개선
3. 프론트엔드 기본 UI 개선

### Phase 2: 비동기 처리 (2-3일)
1. 백그라운드 번역 작업 시스템
2. 진행 상황 추적 및 UI 업데이트
3. 에러 처리 및 재시도 로직

### Phase 3: 최적화 (1-2일)
1. 청크 단위 병렬 처리
2. 성능 모니터링 및 튜닝
3. 사용자 피드백 반영

## 🎯 예상 효과

- **사용자 경험**: 파일 업로드 후 즉시 원문 확인 가능
- **응답성**: 긴 번역 작업이 UI를 블록하지 않음
- **투명성**: 번역 진행 상황을 실시간으로 확인 가능
- **안정성**: 부분 실패 시에도 전체가 실패하지 않음
- **확장성**: 향후 더 큰 파일이나 병렬 처리에 대응 가능
