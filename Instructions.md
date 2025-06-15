
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

### 새로운 처리 흐름
```
파일 업로드 → 프로젝트 생성 완료 (즉시 응답)
             ↓
     백그라운드에서 실행:
     구조 분석 → 세그먼트 저장 → 단계별 GPT 번역
```

## ✅ 지금 우선 적용하면 좋은 핵심 개선 4가지

### 1. GPT 번역을 백그라운드에서 자동 처리 (setImmediate 최적화)

**현재 문제**: 업로드하면 모든 처리가 한 번에 이뤄져서 UX가 느림

**개선 방안**: 
- `setImmediate`를 사용하여 파일 처리를 백그라운드로 분리
- 프로젝트 생성 이후에도 처리될 수 있도록 구조 변경
- 사용자는 업로드 직후 바로 프로젝트에 접근 가능

```typescript
// server/routes/pdf-routes.ts 개선 예시
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    // 1. 즉시 프로젝트와 파일 레코드 생성
    const project = await createProject(projectData);
    const fileRecord = await createFileRecord(file, project.id);
    
    // 2. 즉시 응답 반환
    res.status(201).json({ project, file: fileRecord });
    
    // 3. 백그라운드 처리 시작
    setImmediate(async () => {
      await processPDFAndTranslate(fileRecord.id, file.path, project.id);
    });
  } catch (error) {
    // 오류 처리
  }
});
```

### 2. 단계별 번역 처리 (초기 10개 → 나머지 백그라운드)

**개선 방안**:
- 첫 10개 세그먼트를 우선 번역하여 사용자가 빠르게 확인 가능
- 나머지 세그먼트는 백그라운드에서 순차적으로 처리
- `partially_ready` 상태 추가로 부분 완료 표시

```typescript
async function translateSegments(fileId: number, projectId: number): Promise<void> {
  const segments = await getSegments(fileId);
  
  // 1단계: 첫 10개 우선 번역
  const initialBatch = segments.slice(0, 10);
  for (const segment of initialBatch) {
    await translateSingleSegment(segment);
  }
  
  // 부분 완료 상태 업데이트
  await updateProcessingProgress(fileId, 70, "partially_ready");
  
  // 2단계: 나머지 백그라운드 번역
  const remainingSegments = segments.slice(10);
  if (remainingSegments.length > 0) {
    setImmediate(async () => {
      await translateRemainingSegments(remainingSegments, fileId);
    });
  }
}
```

### 3. 파일 처리 상태 UI 표시 개선 (processingStatus 시각화)

**개선된 상태 표시**:
- `pending`: 회색 점 + "대기 중"
- `processing`: 회전 로더 + "파일 처리 중 (X%)"
- `translating`: 깜빡이는 점 + "번역 중 (X%)"
- `partially_ready`: 주황색 점 + "일부 번역 완료"
- `ready`: 녹색 점 + "번역 완료"
- `error`: 빨간색 점 + "처리 실패" + 오류 메시지

```tsx
// client/src/pages/project.tsx UI 개선 예시
{file.processingStatus === "processing" && (
  <div className="flex items-center">
    <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full mr-1"></div>
    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
      파일 처리 중 {file.processingProgress ? `(${file.processingProgress}%)` : ""}
    </span>
  </div>
)}

{file.processingStatus === "partially_ready" && (
  <div className="flex items-center">
    <div className="h-3 w-3 bg-orange-400 animate-pulse rounded-full mr-1"></div>
    <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded">
      일부 번역 완료
    </span>
  </div>
)}
```

### 4. GPT 번역 실패 시 재시도 로직 추가 (안정성 강화)

**재시도 로직**:
- 최대 3회 재시도
- 지수 백오프 (1초, 2초, 3초 대기)
- 최종 실패 시 오류 상태로 표시

```typescript
const translateWithRetry = async (text: string, sourceLanguage: string, targetLanguage: string, maxRetries = 3): Promise<string> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await translateWithGPT({ source: text, sourceLanguage, targetLanguage });
      return result.target;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      // 지수 백오프
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  return text; // 최종 실패 시 원문 반환
};
```

## 🗃️ 데이터베이스 스키마 개선

### 필요한 필드 추가
```sql
-- files 테이블에 필드 추가
ALTER TABLE files ADD COLUMN processingStatus TEXT DEFAULT 'pending';
ALTER TABLE files ADD COLUMN processingProgress INTEGER DEFAULT 0;
ALTER TABLE files ADD COLUMN errorMessage TEXT;
```

### 상태 값 정의
- `pending`: 처리 대기 중
- `processing`: 파일 구조 분석 중
- `translating`: GPT 번역 진행 중
- `partially_ready`: 일부 번역 완료 (첫 10개 완료)
- `ready`: 모든 번역 완료
- `error`: 처리 실패

## 🚀 구현 우선순위

### Phase 1: 백그라운드 처리 구조 (최우선)
1. `setImmediate`를 활용한 비동기 처리 구조 구현
2. 프로젝트 생성과 파일 처리 분리
3. 진행률 추적 시스템 구현

### Phase 2: UI 개선 (중요)
1. 실시간 상태 표시 UI 구현
2. 진행률 바 및 상태 아이콘 추가
3. 오류 메시지 표시 시스템

### Phase 3: 안정성 강화 (권장)
1. 재시도 로직 구현
2. 오류 로깅 및 복구 시스템
3. 성능 모니터링

## 📊 예상 개선 효과

### UX 측면
- **초기 응답 시간**: 3-5분 → 2-3초
- **사용자 대기 시간**: 전체 완료까지 대기 → 즉시 작업 시작 가능
- **진행 가시성**: 진행률 실시간 확인 가능

### 기술적 측면
- **서버 부하**: 동기 처리에서 비동기 처리로 전환
- **오류 복구**: 자동 재시도로 성공률 향상
- **확장성**: 백그라운드 처리로 동시 처리 용량 증가

## 🔧 구현 상세 가이드

### 백엔드 변경사항
1. **PDF 라우트 수정**: 즉시 응답 + 백그라운드 처리
2. **진행률 추적 함수**: `updateProcessingProgress()` 구현
3. **재시도 로직**: `translateWithRetry()` 구현
4. **스키마 업데이트**: 진행률 및 상태 필드 추가

### 프론트엔드 변경사항
1. **상태 표시기**: 각 처리 단계별 시각적 피드백
2. **진행률 바**: 실시간 퍼센트 표시
3. **오류 표시**: 상세 오류 메시지 및 툴팁
4. **상태 관리**: 모든 처리 상태의 적절한 핸들링

이 개선 방안을 통해 사용자는 파일 업로드 후 즉시 작업을 시작할 수 있으며, 번역 진행 상황을 실시간으로 확인할 수 있습니다.
