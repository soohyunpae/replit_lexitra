
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
