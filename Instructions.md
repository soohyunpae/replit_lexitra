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

## ✅ 지금 우선 적용하면 좋은 핵심 개선 3가지

1. GPT 번역을 백그라운드에서 자동 처리 (setImmediate 최적화)
- 📍 현재는 업로드하면 모든 처리가 한 번에 이뤄져서 UX가 느림.
- ✅ 제안된 구조처럼 setImmediate 내부에서 GPT 번역을 백그라운드로 분리하고, 프로젝트 생성 이후에도 처리될 수 있도록 하면:
  - 사용자는 업로드 직후 바로 프로젝트에 접근 가능
  - 번역이 진행 중임을 실시간으로 확인 가능

예시 코드:
```ts
setImmediate(async () => {
  try {
    await updateProcessingProgress(project.id, 20, "processing");
    await processFileContent(file);

    await createSegments(fileRecord.id, fileContent);

    await updateProcessingProgress(project.id, 50, "translating");
    await translateSegments(fileRecord.id, project.id);

    await updateProcessingProgress(project.id, 100, "ready");
  } catch (error) {
    await updateProcessingProgress(project.id, -1, "error");
  }
});
```

2. 파일 처리 상태 UI 표시 개선 (processingStatus 시각화)
- ✅ 현재 파일마다 processingStatus가 있으면, UI에서 다음처럼 직관적으로 보여줘:

예시 코드:
```tsx
{file.processingStatus === "processing" && (
  <div className="flex items-center">
    <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full mr-1"></div>
    <span className="text-xs">파일 처리 중...</span>
  </div>
)}
{file.processingStatus === "ready" && (
  <span className="text-xs text-green-600">번역 완료</span>
)}
{file.processingStatus === "error" && (
  <span className="text-xs text-red-500">처리 실패</span>
)}
```

- 🧠 사용자가 “이게 지금 처리 중인지, 끝났는지” 헷갈리지 않도록 실시간 피드백 제공!

3. GPT 번역 실패 시 재시도 로직 추가 (간단한 안정성 강화)
- GPT 번역 중 오류가 났을 경우 자동 재시도하는 기능 추가:
- ✅ 사용자 입장에서 “왜 안됐지?” 하는 상황을 줄일 수 있어.

예시 코드:
```ts
const translateWithRetry = async (segment, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await translateWithGPT(segment);
      return result;
    } catch (error) {
      if (attempt === maxRetries) {
        await db.update(schema.files)
          .set({ processingStatus: "error", errorMessage: `번역 실패: ${error.message}` })
          .where(eq(schema.files.id, segment.fileId));
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};
```

---
✨ 요약 – 가장 중요한 3가지

| 순위 | 개선 항목 | 효과 |
|------|------------|--------|
| 1 | 백그라운드 GPT 번역 처리 (setImmediate) | UX 속도 개선 + 초기 결과 빠르게 확인 가능 |
| 2 | 파일 처리 상태 시각화 | 사용자 불확실성 해소 |
| 3 | 번역 실패 재시도 | 안정성 ↑, 오류율 ↓ |

✅ 1단계와 2단계를 분리하여 UX 개선
- 프로젝트 생성 시점에는 GPT 번역을 제외하고 파일 구조 분석 + 세그먼트 저장까지만 수행
- GPT 번역은 백엔드에서 자동 실행되되, 사용자에게는 ‘진행 중’ 상태로 표시

✅ 상태 관리 필드 간소화
- 번역 상태는 `status` 필드 하나로만 사용자에게 표시됨
- `origin`은 GPT 번역, TM 매칭 등 출처 기록용으로 내부에서만 활용됨

✅ 단순화된 사용자 경험
- 사용자는 프로젝트 생성 후 즉시 편집 가능
- GPT 번역은 세그먼트별로 점진적으로 표시되어 실시간 작업 가능

---

## 🚨 현재 코드베이스 분석 결과 - 구현 필요사항

### 🔍 발견된 문제점들

#### 1. **processingStatus 필드 부재**
- ❌ **문제**: Instructions.md에서 제안하는 `processingStatus` 필드가 현재 스키마에 없음
- ✅ **해결방안**: `files` 테이블에 `processingStatus` enum 필드 추가 필요
- 📋 **값**: `"pending" | "processing" | "translating" | "ready" | "error"`

#### 2. **진행률 추적 함수 미구현**
- ❌ **문제**: Instructions.md에서 언급하는 `updateProcessingProgress` 함수가 코드베이스에 존재하지 않음
- ✅ **해결방안**: 프로젝트 및 파일 처리 상태 업데이트 함수 구현 필요

#### 3. **백그라운드 처리 로직 부재**
- ❌ **문제**: 현재 `pdf_processor_service.ts`에서 모든 처리가 동기적으로 이루어짐
- ✅ **해결방안**: Instructions.md 제안대로 `setImmediate`를 사용한 백그라운드 처리 구현

#### 4. **재시도 로직 없음**
- ❌ **문제**: GPT 번역 실패 시 재시도하는 `translateWithRetry` 함수가 구현되어 있지 않음
- ✅ **해결방안**: 자동 재시도 로직 구현

#### 5. **UI 상태 표시 불완전**
- ❌ **문제**: `client/src/pages/project.tsx`에서 파일 처리 상태를 실시간으로 보여주는 UI가 부족
- ✅ **해결방안**: Instructions.md 제안만큼 상세한 상태 표시 UI 구현

### 🎯 주요 불일치 사항

| 구분 | 제안사항 | 현재 상태 | 구현 필요도 |
|------|----------|-----------|------------|
| **스키마** | `processingStatus` 필드 | ❌ 없음 | 🔥 높음 |
| **서비스 로직** | 비동기 백그라운드 처리 | ❌ 동기 처리 | 🔥 높음 |
| **UI 컴포넌트** | 실시간 상태 표시 | ⚠️ 기본만 있음 | 🔥 높음 |
| **에러 핸들링** | 재시도 로직 | ❌ 없음 | 🟡 중간 |

### 📋 구현 순서 권장사항

1. **1단계: 스키마 수정**
   ```sql
   ALTER TABLE files ADD COLUMN processingStatus TEXT DEFAULT 'pending';
   ```

2. **2단계: 백그라운드 처리 함수 구현**
   - `updateProcessingProgress` 함수 추가
   - `translateWithRetry` 함수 추가

3. **3단계: 서비스 로직 재구성**
   - 동기 → 비동기 백그라운드 처리로 변경
   - `setImmediate` 활용한 처리 분리

4. **4단계: UI 컴포넌트 보강**
   - 실시간 상태 표시 및 진행률 시각화
   - 에러 상태 표시

### ⚠️ 주의사항
Instructions.md의 제안을 실제로 구현하려면 위 사항들을 먼저 정비해야 합니다. 현재 코드베이스는 동기적 처리 방식으로 되어 있어, 비동기 백그라운드 처리로 전환하는 것이 핵심 과제입니다.