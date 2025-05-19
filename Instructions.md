
# Lexitra 로컬라이제이션 감사 및 구현 계획

## 1. 현재 상태

### 1.1 구현된 i18n 시스템
- i18n 기본 설정 완료 (`client/src/i18n/index.ts`)
- 언어 전환 기능 구현 (`client/src/hooks/use-language.tsx`)
- 기본 번역 파일 존재 (en/ko `client/public/locales/[lang]/translation.json`)

### 1.2 누락된 번역 확인

다음 컴포넌트/페이지들에서 번역이 누락되었거나 하드코딩된 텍스트가 발견되었습니다:

#### 컴포넌트
1. `client/src/components/translation/segment-item.tsx`
   - 세그먼트 상태 표시 
   - 에러 메시지

2. `client/src/components/translation/doc-review-editor.tsx`
   - 문서 보기 관련 UI 텍스트
   - 상태 메시지

#### 페이지
1. `client/src/pages/auth-debug.tsx`
   - 디버그 관련 메시지
   - 오류 상태 표시

2. `client/src/pages/projects.tsx`
   - 프로젝트 상태 필터
   - 정렬 옵션

### 1.3 누락된 번역 키

translation.json 파일에 다음 키들이 누락되었습니다:

```json
{
  "translation": {
    "segmentStatus": {
      "draft": "초안",
      "reviewing": "검토 중",
      "approved": "승인됨",
      "rejected": "반려됨"
    },
    "docReview": {
      "loadingError": "문서 로딩 중 오류가 발생했습니다",
      "tryAgain": "다시 시도"
    }
  }
}
```

## 2. 구현 계획

### 2.1 단계별 구현

1. 누락된 번역 키 추가
   - en/ko translation.json 파일 업데이트
   - 새로운 섹션에 대한 번역 추가

2. 컴포넌트 리팩토링
   - useTranslation 훅 추가
   - 하드코딩된 텍스트를 번역 키로 교체

3. 테스트 및 검증
   - 각 언어 전환 테스트
   - 누락된 번역 키 확인
   - 컨텍스트 정확성 검증

### 2.2 우선순위

1. 높은 우선순위
   - 사용자 인터페이스 핵심 요소
   - 오류 메시지
   - 상태 표시

2. 중간 우선순위
   - 도움말 텍스트
   - 부가 설명

3. 낮은 우선순위
   - 디버그 메시지
   - 관리자 인터페이스

## 3. 구현 가이드라인

### 3.1 번역 키 네이밍 규칙
- 계층 구조 사용 (예: `common.actions.save`)
- 컨텍스트 포함 (예: `projects.status.inProgress`)
- 일관된 케이스 사용 (camelCase)

### 3.2 코드 예시

```typescript
// Before
<span>Loading...</span>

// After
<span>{t('common.loading')}</span>

// Before
<Button>Save Changes</Button>

// After
<Button>{t('common.actions.save')}</Button>
```

### 3.3 컴포넌트 리팩토링 체크리스트

- [ ] useTranslation 훅 import 확인
- [ ] 하드코딩된 문자열 식별
- [ ] 적절한 번역 키 생성
- [ ] translation.json 파일 업데이트
- [ ] 번역된 텍스트로 교체
- [ ] 테스트 및 검증

## 4. 테스트 플랜

1. 정적 검사
   - 누락된 번역 키 확인
   - 중복 키 검사

2. 동적 테스트
   - 언어 전환 테스트
   - 컨텍스트 정확성
   - 레이아웃 깨짐 확인

## 5. 유지보수 가이드라인

1. 새로운 기능 추가 시
   - 번역 키 즉시 추가
   - 양쪽 언어 모두 업데이트

2. 코드 리뷰 체크리스트
   - 하드코딩된 문자열 확인
   - 번역 키 네이밍 규칙 준수
   - 컨텍스트 적절성 검토

# Logout Redirection Implementation Plan

## Current State
- In `useAuth` hook (client/src/hooks/use-auth.tsx), the logout mutation redirects to '/' after successful logout
- The landing page (client/src/pages/landing.tsx) already has logic to handle authenticated users but needs to be the default logout destination

## Implementation Steps

1. **Current Issues**
- Logout redirects to '/' which routes to Dashboard for unauthenticated users instead of landing page
- This creates a poor user experience with unnecessary redirects

2. **Solution**
- Modify the logout mutation to redirect to '/landing' instead of '/'
- Ensure landing page properly handles the logged out state

3. **Files to Modify**
- hooks/use-auth.tsx: Update logout redirection
- App.tsx: Ensure routing configuration is correct

## Implementation Details

1. In useAuth.tsx:
- Update logoutMutation to redirect to '/landing' instead of '/'
- Ensure proper error handling maintains the redirection

2. In landing.tsx:
- Verify authentication check works correctly
- No changes needed as current logic is correct

3. Testing Plan:
- Test logout flow from different pages
- Verify landing page loads correctly after logout
- Check authentication state management
- Ensure no redirect loops occur

## Benefits
- Clear user flow after logout
- Consistent with application architecture
- Better user experience
# 대시보드 통계 카드 실제 데이터 구현 계획

## 현재 상황
현재 dashboard.tsx의 통계 카드는 하드코딩된 값을 사용하고 있습니다:
- 활성 프로젝트 수: projects.length || 0
- 검토 대기 중인 세그먼트: 18 (하드코딩)
- 용어집 사용 현황: glossaryData.length (기본값 4)

## 구현 계획

### 1. 활성 프로젝트 수
- 이미 projects 배열을 사용하여 구현되어 있음
- 추가 필터링: "Completed" 상태가 아닌 프로젝트만 카운트하도록 수정

### 2. 검토 대기 중인 세그먼트
- 새로운 API 엔드포인트 필요: `/api/projects/review-stats`
- 모든 프로젝트의 세그먼트 중 "Edited" 상태인 것들의 개수를 집계
- React Query를 사용하여 데이터 페칭

### 3. 용어집 사용 현황
- 이미 glossaryData를 사용하여 구현되어 있음
- 실제 용어집 데이터 개수를 표시하도록 수정

## 필요한 변경사항

1. routes.ts에 새로운 API 엔드포인트 추가
2. dashboard.tsx에서 하드코딩된 값을 실제 데이터로 교체
3. 필요한 React Query hooks 추가

## 상세 구현 단계

1. API 엔드포인트 구현
2. React Query hook 생성
3. 대시보드 컴포넌트 수정
4. 에러 처리 및 로딩 상태 추가

## 구현 코드

아래 파일들을 수정해야 합니다:

1. server/routes.ts:
- 새로운 엔드포인트 `/api/projects/review-stats` 추가
- 세그먼트 통계 집계 로직 구현

2. client/src/hooks/queries/useProjectStats.ts:
- API 호출을 위한 새로운 React Query hook 생성

3. client/src/pages/dashboard.tsx:
- 하드코딩된 값을 실제 데이터로 교체
- 새로운 hook 사용
