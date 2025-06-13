
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

## 🔧 추가 개선 사항 (ChatGPT 제안 반영)

### 1. 중복 번역 방지
**문제**: translate API가 중복 요청되면 중복 번역이 발생할 수 있음
```typescript
// server/services/translation-queue.ts
class TranslationQueue {
  private static queue: Map<number, TranslationJob> = new Map();
  private static processing: Set<number> = new Set(); // 처리 중인 파일 추적

  static async startTranslation(fileId: number) {
    // 중복 실행 방지
    if (this.processing.has(fileId)) {
      return { 
        jobId: fileId, 
        status: 'already_processing',
        message: '이미 번역이 진행 중입니다.'
      };
    }
    
    this.processing.add(fileId);
    const job = new TranslationJob(fileId);
    this.queue.set(fileId, job);
    
    try {
      await job.start();
    } finally {
      this.processing.delete(fileId); // 완료 후 제거
    }
    
    return { jobId: fileId, status: 'started' };
  }
}
```

### 2. 실시간 피드백 최적화
**현재**: 2초마다 polling
**개선**: 프로젝트 수에 따른 동적 조정 + 향후 WebSocket 지원
```typescript
// 프로젝트 수에 따른 polling 간격 조정
const getPollingInterval = (projectCount: number) => {
  if (projectCount <= 5) return 2000;      // 2초
  if (projectCount <= 20) return 3000;     // 3초  
  return 5000;                             // 5초
};

// 향후 WebSocket 지원을 위한 인터페이스 준비
interface ProgressUpdate {
  type: 'translation_progress';
  fileId: number;
  progress: {
    completed: number;
    total: number;
    percentage: number;
    status: string;
  };
}
```

### 3. 오류 세그먼트 처리 강화
**문제**: 실패한 세그먼트가 계속 실패할 경우 무한 루프 위험
```sql
-- translation_units 테이블에 재시도 추적 필드 추가
ALTER TABLE translation_units ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE translation_units ADD COLUMN last_error_at TIMESTAMP;
ALTER TABLE translation_units ADD COLUMN error_message TEXT;
```

```typescript
// 재시도 로직 개선
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = [1000, 5000, 15000]; // 1초, 5초, 15초

const retryFailedSegments = async (fileId: number) => {
  const failedSegments = await db.query.translationUnits.findMany({
    where: and(
      eq(schema.translationUnits.fileId, fileId),
      eq(schema.translationUnits.status, 'error'),
      lt(schema.translationUnits.retryCount, MAX_RETRY_COUNT)
    )
  });

  for (const segment of failedSegments) {
    try {
      // 재시도 간격 적용
      await new Promise(resolve => 
        setTimeout(resolve, RETRY_DELAY[segment.retryCount] || 15000)
      );
      
      await translateSingleSegment(segment);
      
      // 성공 시 재시도 카운트 리셋
      await db.update(schema.translationUnits)
        .set({ retryCount: 0, errorMessage: null })
        .where(eq(schema.translationUnits.id, segment.id));
        
    } catch (error) {
      // 재시도 카운트 증가 및 오류 기록
      await db.update(schema.translationUnits)
        .set({ 
          retryCount: segment.retryCount + 1,
          lastErrorAt: new Date(),
          errorMessage: error.message
        })
        .where(eq(schema.translationUnits.id, segment.id));
      
      // 최대 재시도 횟수 도달 시 수동 번역으로 마킹
      if (segment.retryCount + 1 >= MAX_RETRY_COUNT) {
        await markAsManualTranslationNeeded(segment.id);
      }
    }
  }
};
```

### 4. 대형 문서 처리 전략
**문제**: A4 수십 페이지 문서에서 세그먼트 수천 개가 생길 수 있음
```typescript
// 대형 문서 처리를 위한 pagination 및 우선순위 로딩
const LARGE_DOCUMENT_THRESHOLD = 1000; // 1000개 이상 세그먼트
const PRIORITY_BATCH_SIZE = 50;        // 우선 처리할 배치 크기

interface LargeDocumentStrategy {
  // 1. 우선순위 기반 번역 (첫 50개 세그먼트 먼저)
  async translatePrioritySegments(fileId: number) {
    const prioritySegments = await db.query.translationUnits.findMany({
      where: eq(schema.translationUnits.fileId, fileId),
      limit: PRIORITY_BATCH_SIZE,
      orderBy: schema.translationUnits.id
    });
    
    return this.processBatch(prioritySegments);
  }
  
  // 2. 나머지 세그먼트 백그라운드 처리
  async translateRemainingSegments(fileId: number) {
    const totalSegments = await this.getSegmentCount(fileId);
    
    for (let offset = PRIORITY_BATCH_SIZE; offset < totalSegments; offset += PRIORITY_BATCH_SIZE) {
      const batch = await db.query.translationUnits.findMany({
        where: eq(schema.translationUnits.fileId, fileId),
        limit: PRIORITY_BATCH_SIZE,
        offset: offset
      });
      
      await this.processBatch(batch);
      
      // CPU 부하 방지를 위한 짧은 대기
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

// 프론트엔드: 가상화된 세그먼트 목록
const VirtualizedSegmentList = ({ fileId }: { fileId: number }) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  
  // 화면에 보이는 세그먼트만 로드
  const { data: segments } = useQuery({
    queryKey: ['segments', fileId, visibleRange],
    queryFn: () => fetchSegmentsPaginated(fileId, visibleRange.start, visibleRange.end)
  });
  
  return (
    <FixedSizeList
      height={600}
      itemCount={totalSegmentCount}
      itemSize={80}
      onItemsRendered={({ visibleStartIndex, visibleStopIndex }) => {
        setVisibleRange({ start: visibleStartIndex, end: visibleStopIndex });
      }}
    >
      {SegmentItem}
    </FixedSizeList>
  );
};
```

### 5. 사용자 알림 시스템
**현재**: 번역 완료나 실패 알림이 없음
```typescript
// 알림 시스템 인터페이스
interface NotificationSystem {
  // 즉시 알림 (Toast)
  showToast(type: 'success' | 'error' | 'info', message: string): void;
  
  // 알림 센터 (지속적 알림)
  addNotification(notification: {
    id: string;
    type: 'translation_complete' | 'translation_failed' | 'project_claimed';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    actions?: NotificationAction[];
  }): void;
  
  // 이메일 알림 (중요한 이벤트)
  sendEmailNotification(userId: number, event: EmailEvent): Promise<void>;
}

// 번역 완료 알림 통합
const notifyTranslationComplete = async (fileId: number, userId: number) => {
  const file = await getFileDetails(fileId);
  
  // 1. 즉시 Toast 알림
  notificationSystem.showToast('success', 
    `"${file.name}" 번역이 완료되었습니다.`);
  
  // 2. 알림 센터에 추가
  notificationSystem.addNotification({
    id: `translation_${fileId}_${Date.now()}`,
    type: 'translation_complete',
    title: '번역 완료',
    message: `파일 "${file.name}"의 번역이 완료되었습니다.`,
    timestamp: new Date(),
    read: false,
    actions: [
      { type: 'view_file', label: '파일 보기', url: `/translation/${fileId}` },
      { type: 'download', label: '다운로드', url: `/api/files/${fileId}/download` }
    ]
  });
  
  // 3. 이메일 알림 (사용자 설정에 따라)
  const userPrefs = await getUserNotificationPreferences(userId);
  if (userPrefs.emailOnTranslationComplete) {
    await notificationSystem.sendEmailNotification(userId, {
      type: 'translation_complete',
      fileId,
      fileName: file.name,
      projectId: file.projectId
    });
  }
};
```

## 📋 업데이트된 구현 우선순위

### Phase 1: 기본 분리 + 안정성 강화 (2-3일)
1. API 엔드포인트 분리 (`/parse`, `/translate`, `/status`)
2. 파일 상태 관리 개선
3. **중복 번역 방지 로직 추가**
4. **오류 세그먼트 재시도 메커니즘 구현**

### Phase 2: 성능 최적화 (2-3일)
1. 백그라운드 번역 작업 시스템
2. **동적 polling 간격 조정**
3. **대형 문서를 위한 우선순위 처리**
4. 진행 상황 추적 및 UI 업데이트

### Phase 3: 사용자 경험 개선 (1-2일)
1. **알림 시스템 구현 (Toast + 알림센터)**
2. 가상화된 세그먼트 목록 (대형 문서용)
3. 성능 모니터링 및 튜닝

### Phase 4: 고급 기능 (향후)
1. **WebSocket/SSE 기반 실시간 업데이트**
2. **이메일 알림 시스템**
3. 사용자 피드백 반영

## 🎯 예상 효과

- **사용자 경험**: 파일 업로드 후 즉시 원문 확인 가능
- **응답성**: 긴 번역 작업이 UI를 블록하지 않음
- **투명성**: 번역 진행 상황을 실시간으로 확인 가능
- **안정성**: 부분 실패 시에도 전체가 실패하지 않음 + 재시도 메커니즘
- **확장성**: 향후 더 큰 파일이나 병렬 처리에 대응 가능
- **신뢰성**: 중복 처리 방지 및 오류 복구 기능
- **성능**: 대형 문서와 다중 프로젝트 환경에서도 원활한 동작
