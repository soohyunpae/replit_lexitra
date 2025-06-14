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
2단계: GPT 번역은 업로드 완료 후 자동으로 실행되며, 사용자는 번역 상태만 확인
```

## 🛠️ 구현 방안

### Phase 1: 업로드 단계 분리

#### 1-1. 프로젝트 생성 API 수정
**파일**: `server/routes.ts`

현재 `/api/projects` POST 엔드포인트를 다음과 같이 수정:

**Before:**
```typescript
// 현재: 모든 처리를 한 번에
POST /api/projects
→ 파일 업로드 + 구조 분석 + 세그먼트 저장 + GPT 번역
```

**After:**
```typescript
// 수정: 단계별 처리
POST /api/projects
→ 파일 업로드 + 구조 분석 + 세그먼트 저장만
→ 프로젝트 즉시 생성 (segments 테이블에 origin: 'PENDING' 상태로 저장)

POST /api/projects/:id/translate
→ GPT 번역 백그라운드 처리 자동 실행
```

#### 1-2. 세그먼트 상태 관리 개선
**파일**: `shared/schema.ts`

segments 테이블의 origin 필드에 새로운 상태 추가:
```typescript
export const segmentOriginEnum = pgEnum('segment_origin', [
  'MT',      // 기존: Machine Translation
  'TM',      // 기존: Translation Memory
  'HT',      // 기존: Human Translation
  'PENDING', // 새로운: 번역 대기 중
  'FAILED'   // 새로운: 번역 실패
]);
```

#### 1-3. 프로젝트 상태 추가
**파일**: `shared/schema.ts`

projects 테이블에 번역 진행 상태 필드 추가:
```typescript
export const projects = pgTable('projects', {
  // ... 기존 필드들
  translationStatus: varchar('translation_status', { length: 20 }).default('PENDING'),
  // 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  translationProgress: integer('translation_progress').default(0),
  // 0-100 퍼센트 진행률
});
```

### Phase 2: 백그라운드 처리 시스템

#### 2-1. 번역 작업 큐 시스템 구현
**새 파일**: `server/services/translation_queue.ts`

```typescript
// 큐 기반 번역 처리 시스템 구현
interface TranslationJob {
  projectId: number;
  segmentIds: number[];
  priority: 'high' | 'normal' | 'low';
}

class TranslationQueue {
  private queue: TranslationJob[] = [];
  private processing: Map<number, boolean> = new Map();

  // 번역 작업 추가 (자동 실행)
  async addJob(projectId: number, segmentIds: number[]): Promise<void>

  // 백그라운드 번역 처리
  async processQueue(): Promise<void>

  // 진행률 업데이트
  async updateProgress(projectId: number, completed: number, total: number): Promise<void>
}
```

#### 2-2. WebSocket 실시간 진행률 업데이트
**파일**: `server/index.ts` 및 `client/src/lib/websocket.ts`

WebSocket을 통해 번역 진행률을 실시간으로 클라이언트에 전송:

```typescript
// 서버사이드 이벤트
socket.emit('translation_progress', {
  projectId: number,
  progress: number, // 0-100
  currentSegment: number,
  totalSegments: number,
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
});
```

#### 2-3. 번역 API 엔드포인트 분리
**새 파일**: `server/routes/translation.ts`

```typescript
// 번역 진행률 조회
GET /api/projects/:id/translation-status
→ { progress: number, status: string, eta: string }

// 번역 중단
POST /api/projects/:id/stop-translation
→ 번역 작업 중단
```

### Phase 3: 프론트엔드 UX 개선

#### 3-1. 프로젝트 생성 플로우 수정
**파일**: `client/src/pages/projects.tsx`

프로젝트 생성 후 즉시 번역 페이지로 이동하며, 번역은 자동 실행되어 상태만 확인:

```typescript
// 프로젝트 생성 완료 후
const handleProjectCreated = (projectId: number) => {
  // 즉시 프로젝트 페이지로 이동
  navigate(`/projects/${projectId}`);

  // 번역은 자동 실행되며, 사용자는 진행 상태만 확인
};
```

#### 3-2. 번역 진행률 표시 컴포넌트
**새 파일**: `client/src/components/translation/translation-progress.tsx`

```typescript
// 실시간 번역 진행률 표시
interface TranslationProgressProps {
  projectId: number;
  onComplete: () => void;
}

export function TranslationProgress({ projectId, onComplete }: TranslationProgressProps) {
  // WebSocket으로 실시간 진행률 수신
  // 진행 바, ETA, 현재 처리 중인 세그먼트 정보 표시
  // 일시정지/재시작/중단 버튼 없이 자동 진행 상태만 표시
}
```

#### 3-3. 프로젝트 페이지 개선
**파일**: `client/src/pages/project.tsx`

번역 상태에 따른 UI 분기:

```typescript
// 번역 상태별 UI 표시
switch (project.translationStatus) {
  case 'PENDING':
    // 번역 대기 중 상태 표시
    break;
  case 'IN_PROGRESS':
    // 진행률 표시
    break;
  case 'COMPLETED':
    // 일반 편집기 표시
    break;
  case 'FAILED':
    // 오류 및 재시도 안내 표시
    break;
}
```

### Phase 4: 고급 기능

#### 4-1. 배치 처리 옵션
**파일**: `server/services/translation_queue.ts`

```typescript
// 번역 배치 설정 옵션
interface TranslationConfig {
  batchSize: number;        // 한 번에 처리할 세그먼트 수 (기본: 10)
  concurrency: number;      // 동시 처리 수 (기본: 3)
  delayBetweenBatch: number; // 배치 간 지연 시간 (ms)
  priority: 'speed' | 'cost' | 'quality';
}
```

#### 4-2. 사용자 설정 저장
**파일**: `shared/schema.ts`

```typescript
// 사용자별 번역 설정 저장
export const userTranslationSettings = pgTable('user_translation_settings', {
  userId: integer('user_id').references(() => users.id),
  autoStartTranslation: boolean('auto_start_translation').default(true),
  batchSize: integer('batch_size').default(10),
  // ... 기타 설정들
});
```

#### 4-3. 번역 히스토리 및 분석
**새 파일**: `server/services/translation_analytics.ts`

```typescript
// 번역 성능 분석 및 최적화
interface TranslationMetrics {
  averageTimePerSegment: number;
  successRate: number;
  errorPatterns: string[];
  recommendedBatchSize: number;
}
```

## 🔧 구현 우선순위

### High Priority (1-2주)
1. **프로젝트 생성 API 분리**: 즉시 생성 + 번역 대기 상태
2. **기본 번역 큐 시스템**: 자동 순차 처리 구현
3. **프론트엔드 번역 진행률 표시 컴포넌트**: 자동 진행 상태 표시

### Medium Priority (2-3주)
1. **WebSocket 진행률 업데이트**: 실시간 상태 표시
2. **번역 중단 기능**: 사용자 제어 옵션
3. **배치 처리 최적화**: 성능 개선

### Low Priority (3-4주)
1. **사용자 설정 기반 자동 번역 옵션**
2. **번역 분석 및 최적화**: 성능 모니터링
3. **에러 처리 및 재시도**: 안정성 개선

## 🚀 기대 효과

### 사용자 경험 개선
- **대기 시간 90% 단축**: 30초 내 프로젝트 접근 가능
- **투명한 진행률**: 실시간 번역 상태 확인
- **유연한 제어**: 자동 번역 실행과 상태 확인

### 시스템 안정성
- **리소스 분산**: 피크 시간 부하 분산
- **오류 격리**: 번역 실패가 프로젝트 생성에 영향 없음
- **확장성**: 큐 시스템으로 다중 프로젝트 동시 처리

### 개발 및 운영
- **모니터링 개선**: 번역 성능 분석 가능
- **사용자 피드백**: 번역 품질 및 속도 최적화
- **비용 최적화**: API 호출 배치 처리로 효율성 증대

## 📋 구현 체크리스트

### 백엔드 작업
- [ ] segments 테이블 상태 필드 추가 (PENDING, FAILED)
- [ ] projects 테이블 번역 진행률 필드 추가
- [ ] 프로젝트 생성 API 분리 (번역 제외)
- [ ] 번역 큐 시스템 구현 (자동 실행)
- [ ] 번역 API 엔드포인트 분리 (진행률 조회, 중단)
- [ ] WebSocket 진행률 이벤트 구현
- [ ] 배치 처리 로직 구현

### 프론트엔드 작업
- [ ] 프로젝트 생성 플로우 수정
- [ ] 번역 진행률 컴포넌트 구현 (자동 상태 표시)
- [ ] WebSocket 진행률 수신 구현
- [ ] 프로젝트 상태별 UI 분기
- [ ] 사용자 설정 페이지 추가

### 테스트 및 모니터링
- [ ] 대용량 파일 업로드 테스트
- [ ] 동시 다중 프로젝트 번역 테스트
- [ ] 네트워크 중단 시 복구 테스트
- [ ] 번역 성능 모니터링 구현
- [ ] 사용자 피드백 수집 시스템

이 구현 방안을 통해 파일 업로드 시 사용자 경험을 크게 개선하고, 시스템의 확장성과 안정성을 높일 수 있습니다.
