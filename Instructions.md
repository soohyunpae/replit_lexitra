# Side Panel Search Functionality Fix

## Problem Analysis
The TM and Glossary search functionality in the side panel appears to be not working. After reviewing the code in `client/src/components/translation/side-panel.tsx`, I found several issues:

1. **TM Search Issues:**
- The `searchGlobalTM` function is only triggered when typing, but not handling the empty query state correctly
- Global TM results are cleared when switching tabs but not restored when returning
- Search state management needs improvement

2. **Glossary Search Issues:**
- The `searchGlossaryTerms` function is not properly integrated with the UI state
- Search results clearing/restoration behavior needs fixing
- Missing error handling for search failures

## Solution Plan

### 1. TM Search Fix
- Update the search state management
- Improve empty query handling
- Fix results display logic
- Add proper loading states

### 2. Glossary Search Fix  
- Implement proper search results management
- Fix state handling for empty queries
- Add error handling
- Improve loading states

## Implementation Steps

1. Modify `side-panel.tsx`:
- Update search state management
- Fix search trigger logic
- Improve results display
- Add proper error handling

2. Update search functions:
- Enhance TM search functionality
- Fix Glossary search implementation
- Add proper loading states
- Improve error handling

3. Testing:
- Test empty query handling
- Verify search results display
- Check error states
- Validate loading indicators

⸻

🧩 기능 명칭 제안

“Template Manager” 또는 “문서 템플릿 관리”
(관리자 전용 기능으로 위치함)

⸻

🧭 전체 기능 흐름 요약

[관리자(Admin)]  
└── Template Manager  
    ├── 템플릿 업로드 및 구조 정의 (1회성)  
    ├── 템플릿 구조 시각화 및 수정  
    └── 템플릿 목록 관리 (이름, 설명, 미리보기, 수정, 삭제)

[일반 사용자(User)]  
└── 파일 업로드  
    └── 템플릿 적용 여부 자동 감지 or 수동 선택  
        └── 세그먼트 추출 및 번역 흐름 진행


⸻

🖥️ UI/UX 설계안

📍1. 템플릿 관리자 메뉴 추가 (Admin Console)

위치
  •	/admin/templates
  •	사이드바 메뉴에 추가:
Admin Console > 템플릿 관리

UI 구성

요소	설명
📂 템플릿 목록	등록된 템플릿 카드/테이블 (이름, 설명, 업로드일, 사용횟수)
➕ 새 템플릿 등록	.docx 업로드 → 구조 자동 분석
🧩 구조 편집	테이블 구조, 스타일 기반 세그먼트 지정 UI
🔍 미리보기	원문+번역 병렬 예시
🗑 삭제	사용 중인 경우 경고 표시


⸻

📍2. 템플릿 구조 편집 인터페이스
  •	사용자가 업로드한 문서의 구조 미리보기
  •	각 테이블/문단/스타일에 대해 “번역 대상”으로 지정 가능
  •	예:

✅ 테이블[1] > Row[2] > Cell[1] → 번역 대상  
❌ 테이블[1] > Row[1] > Header → 제외


  •	스타일 기반 추출 가능성:
  •	“BodyText”, “Heading 2” 등 스타일로 필터링도 가능

⸻

📍3. 파일 업로드 페이지 개선 (일반 사용자)

위치
  •	기존 /upload 또는 /project/:id

UI 변경 요소

요소	설명
📘 템플릿 자동 감지	템플릿 구조와 일치하면 자동 적용 알림
🛠 수동 선택	“템플릿 선택” 드롭다운 (관리자가 등록한 템플릿 목록)
🧩 세그먼트 프리뷰	“탬플릿이 적용되어 아래 영역이 번역 대상입니다” 표시
⏱️ 속도 개선	구조 파악 시간이 단축 → 사용자 입장에서는 더 빠른 처리 경험


⸻

📍4. 프론트엔드 라우트 제안

경로	기능
/admin/templates	템플릿 목록
/admin/templates/new	템플릿 업로드
/admin/templates/:id	구조 편집
/upload	문서 업로드 및 템플릿 적용 (자동/수동)


⸻

🛠️ 백엔드 및 DB 설계 개요

항목	설명
Template	id, name, description, createdAt, docxFilePath
TemplateStructure	templateId, segmentType, tableIndex, rowIndex, cellIndex, styleName 등
사용 문서와 매칭	문서 업로드 시 템플릿 구조와 비교하여 일치 여부 판단


⸻

✍️ 사용자 시나리오 (요약)

관리자

  1.	템플릿 문서 업로드
  2.	구조 자동 분석 → 번역 대상 영역 지정
  3.	저장 → 템플릿 리스트에 등록됨

사용자

  1.	파일 업로드
  2.	템플릿 구조 자동 적용
  3.	빠르고 정확한 세그먼트 추출 → 번역 진행

⸻

✅ 정리: 왜 이 방식이 좋은가?
  •	관리자는 한 번만 설정, 사용자 입장에서는 더 빠르고 정확한 번역 경험
  •	TM 자동 적용율 ↑, 후편집 작업 ↓
  •	템플릿이 반복되는 기업/기관 사용자에게 특히 효과적