
# 대시보드 개선 계획

## 1. 통계 카드 구현

### 1.1 활성 프로젝트 수
- `projects` 배열에서 "Completed" 상태가 아닌 프로젝트 수를 카운트
- 표시 형식: "📁 {count}"
- i18n 키: "dashboard.activeProjects"

### 1.2 검토 대기 중인 세그먼트
- `/api/projects/review-stats` API에서 가져온 데이터 사용
- "Reviewed" 상태가 아닌 세그먼트 수를 표시
- 추가 표시: 검토 완료된 세그먼트 수
- 표시 형식: 
  - 주요 수치: "📝 {awaitingReview}"
  - 부가 정보: "({completedCount} reviewed)"
- i18n 키: 
  - "dashboard.segmentsAwaitingReview"
  - "dashboard.reviewed"

### 1.3 참여 가능한 프로젝트
- 아직 할당되지 않은(Unclaimed) 프로젝트 수를 표시
- `/api/projects/review-stats`의 availableProjects 값 사용
- 표시 형식: "🔍 {count}"
- i18n 키: "dashboard.projectsAvailableToClaim"

## 2. 최근 활동 표시

### 2.1 데이터 구조
- 프로젝트 업데이트 기록을 기반으로 표시
- 최근 5개 활동만 표시
- 각 활동은 다음 정보 포함:
  - 사용자 이름
  - 프로젝트 이름
  - 작업 종류 (완료/업데이트)
  - 작업 일시

### 2.2 표시 형식
- 각 활동: "📌 {username} {projectName} 프로젝트 {action}"
- 링크: 프로젝트 이름에 해당 프로젝트로 이동하는 링크 추가
- 활동이 없는 경우 "dashboard.noRecentActivity" 메시지 표시

## 3. 개선 사항

### 3.1 성능
- useMemo를 사용하여 최근 활동 목록 최적화
- 프로젝트 데이터 변경 시에만 재계산

### 3.2 오류 처리
- 데이터 누락 시 기본값 처리
- 정렬 및 필터링 로직 안정성 확보

### 3.3 i18n
- 누락된 번역 키 추가
  - dashboard.reviewed
  - dashboard.noRecentActivity
