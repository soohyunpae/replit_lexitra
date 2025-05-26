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

---

🔄 **리팩토링 및 도구 전략 전환 (2025.05)**

**기존 구조**
- 템플릿 구조 추출 및 적용에 `mammoth` 라이브러리 사용
- 단순 텍스트 추출 중심 → 구조 및 스타일 정보 부족
- `.docx` 포맷 그대로 재구성 불가

**새로운 전략**
- 템플릿 정의 및 문서 출력은 `docx-templater` 중심으로 전환
- `{{placeholder}}` 기반으로 템플릿 필드 정의
- 업로드된 문서에서 해당 위치에 있는 텍스트만 추출하여 대응
- 번역 후 원래 템플릿 구조 그대로 `.docx` 재생성 가능

**도구 분리 전략**
| 역할 | 도구 | 설명 |
|------|------|------|
| 텍스트 추출 (보조) | `mammoth` | 구조 간단히 파악하거나 빠른 segment 추출용 |
| 템플릿 구조 유지 및 `.docx` 생성 | `docx-templater` + `pizzip` | 문서 레이아웃 재현, 번역 삽입, `.docx` 다운로드 지원 |
| 에디터 구조 기반 뷰 | Slate.js 또는 구조 JSON 기반 | 시각적으로 문서 구조 미리보기 및 편집 가능하게 설계 예정 |

**예상 구현 흐름**
1. 관리자 템플릿 업로드 → `.docx`에서 `{{field}}` 정의된 구조 추출
2. 사용자 문서 업로드 → 해당 필드 위치의 내용 추출
3. 각 필드에 대해 번역 수행
4. 번역된 결과를 템플릿에 삽입하여 `.docx` 파일 재생성
5. 프론트엔드에서 템플릿 구조 기반 세그먼트 에디터 구현 (구조 표시 + 번역 결과 입력 가능)

⸻

🖥️ UI/UX 설계안

📍1. 템플릿 관리자 메뉴 (Admin Console 내의 탭으로 구현되어 있음)

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

---

📌 `docx-templater` 기반 구조 대응 필드 예시

| 필드 | 설명 |
|------|------|
| placeholder | 문서 내 `{{필드명}}` 형태로 정의된 마커 |
| originalText | 원문 텍스트 |
| translatedText | GPT 또는 TM 기반 번역 결과 |
| type | paragraph / table / cell 등 |
| orderIndex | 문서 내 순서 보존을 위한 인덱스 |

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

---

## 🔧 현재 구현 상태 분석 및 완성 가이드

### 📊 현재 구현된 기능들

✅ **완료된 기능**
- Admin Console의 Template Manager UI (템플릿 목록, 업로드, 상세보기)
- 템플릿 파일 업로드 및 placeholder 추출 기능
- 템플릿 필드 관리 (번역 대상 지정, 필수 여부 설정)
- DB 스키마 (docTemplates, templateFields 테이블)
- 기본 API 엔드포인트 (/api/admin/templates)

❌ **미완성/누락된 기능**
- 실제 docx-templater 라이브러리 설치 및 구현
- 사용자 문서 업로드 시 템플릿 자동 매칭
- 번역 완료 후 템플릿 기반 DOCX 파일 생성
- 완성된 DOCX 파일 다운로드 기능

---

### 🛠️ 단계별 완성 구현 가이드

#### **1단계: 필수 라이브러리 설치**

```bash
npm install docxtemplater pizzip
npm install @types/pizzip --save-dev
```

#### **2단계: docx_fill.ts 실제 구현**

현재 `server/utils/docx_fill.ts`가 기본 틀만 있고 실제 docx-templater 구현이 누락되어 있음. 다음과 같이 완성:

**주요 구현 포인트:**
- `fillDocxTemplate()` 함수에서 실제 docx-templater 사용
- `validateTemplate()` 함수로 템플릿 유효성 검사
- `extractPlaceholders()` 함수로 placeholder 정확히 추출

#### **3단계: 템플릿 매칭 로직 개선**

`server/services/docx_template_service.ts`의 `matchTemplateToDocument()` 함수 개선:

**현재 문제점:**
- mammoth만 사용하여 기본적인 분석만 수행
- docx-templater 기반 정확한 placeholder 매칭 부족

**개선 방안:**
- docx-templater로 업로드된 문서의 placeholder 추출
- 기존 템플릿들과 placeholder 기반 정확한 매칭
- 유사도 계산 알고리즘 개선 (Jaccard similarity 외 추가 방법)

#### **4단계: 사용자 워크플로우에 템플릿 적용**

**파일 업로드 시 템플릿 매칭:**
- `server/routes/pdf-routes.ts`나 파일 업로드 라우트에서 템플릿 매칭 호출
- 매칭된 템플릿이 있으면 프로젝트에 연결
- 프론트엔드에서 "템플릿이 적용되었습니다" 알림 표시

**번역 프로세스 연동:**
- 세그먼트 추출 시 템플릿 구조 고려
- placeholder 위치에 따른 세그먼트 순서 및 구조 보존

#### **5단계: 번역 완료 후 DOCX 생성**

**번역 완료 시 템플릿 기반 파일 생성:**
- 프로젝트 페이지에 "템플릿으로 다운로드" 버튼 추가
- 번역된 세그먼트를 placeholder에 매핑
- `fillDocxTemplate()` 호출하여 완성된 DOCX 생성
- 생성된 파일 다운로드 제공

#### **6단계: 프론트엔드 UI 개선**

**프로젝트 페이지 개선:**
- 템플릿 적용 여부 표시
- 템플릿 기반 다운로드 옵션 추가
- 템플릿 구조에 따른 세그먼트 그룹핑 표시

**파일 업로드 페이지 개선:**
- 템플릿 자동 감지 알림
- 수동 템플릿 선택 드롭다운
- 템플릿 적용 미리보기

---

### 🔗 구현 우선순위

1. **High Priority**: docx-templater 라이브러리 설치 및 기본 구현
2. **High Priority**: 템플릿 기반 DOCX 생성 및 다운로드 기능
3. **Medium Priority**: 사용자 워크플로우에 템플릿 매칭 연동
4. **Low Priority**: UI/UX 개선 및 고급 매칭 알고리즘

---

### 📝 테스트 시나리오

**ID 94 template test 프로젝트 검증:**
1. 업로드된 ASMA00359-KR.docx가 템플릿과 매칭되었는지 확인
2. 번역 완료 후 템플릿 기반 다운로드 가능한지 테스트
3. 생성된 DOCX가 원본 템플릿 구조를 유지하는지 검증

---

### 🚨 주의사항

- 현재 mammoth 기반 분석은 보조용으로만 사용, 실제 처리는 docx-templater 사용
- placeholder 추출 시 정확성 중요 (공백, 대소문자, 특수문자 처리)
- 대용량 파일 처리 시 메모리 관리 고려
- 생성된 파일의 임시 저장 및 자동 정리 구현

---

🧱 개발자용 구현 설계서 (Replit 기준)

### 🔧 개요

- 목적: 사용자가 업로드한 `.docx` 문서를 템플릿 구조에 맞춰 번역하고, 번역 결과를 원래 템플릿 구조에 삽입하여 `.docx`로 다시 다운로드할 수 있게 구현
- 개발 환경: Replit (Next.js + FastAPI), 템플릿 구조는 프론트/백엔드 공통 schema 사용

---

### 📂 주요 디렉토리 및 파일 구조

```
/server
  └─ routes/templates.ts        # 템플릿 업로드/매칭 API
  └─ services/docx_template_service.ts  # 템플릿 구조 추출/변환 처리
  └─ utils/docx_fill.ts         # docx-templater 기반 변환 모듈 (신규)
  └─ uploads/templates/         # 업로드된 원본 템플릿 저장 위치

/shared
  └─ schema.ts                  # Template, TemplateStructure 타입 정의

/web
  └─ pages/admin/templates      # 관리자 템플릿 목록/등록/수정 UI
  └─ pages/upload               # 사용자 문서 업로드 및 매칭 UI
```

---

### ⚙️ 단계별 구현 설계

#### 1. 템플릿 업로드 및 구조 추출
- 사용자가 `.docx` 업로드 (`POST /templates`)
- 백엔드에서 `docx-templater` 또는 `mammoth`를 사용하여 구조 추출
- 추출된 구조를 `TemplateStructure[]`로 저장 (type, placeholder, isTranslatable 포함)
- 구조 정보 DB에 저장

#### 2. 사용자 문서 업로드 시 템플릿 매칭
- 업로드된 문서의 구조를 `TemplateStructure[]`로 파싱
- 기존 템플릿과 구조 유사도 비교 (필드 수, 순서 등)
- 유사한 템플릿이 있을 경우 자동 적용 or 수동 선택 제공

#### 3. 번역 세그먼트 추출 및 처리
- 각 `placeholder`에 대응되는 원문 텍스트를 추출하여 GPT or TM으로 번역
- 번역 결과는 `{ placeholder, translatedText }` 형식으로 보관

#### 4. 템플릿에 번역 삽입 및 `.docx` 재생성
- `docx_fill.ts`에서 `docx-templater` 사용
- 기존 템플릿 파일에 `{ placeholder: translatedText }` 데이터를 삽입
- 완성된 `.docx` 생성 후 사용자에게 다운로드 제공

#### 5. 프론트엔드 UI 구성
- 관리자 UI에서 템플릿 구조 확인 및 번역 대상 설정 가능
- 사용자 업로드 후 적용된 템플릿 구조와 번역 세그먼트 확인 가능

---

### 🔑 주요 고려사항

- 템플릿 구조는 `placeholder` 기반으로 통일 (`{{fieldName}}` 형식)
- 번역 중간 결과와 최종 결과는 모두 DB에 저장 (히스토리 관리 대비)
- 비정형 문서 대비 에러 처리 필요 (템플릿에 포함되지 않은 경우 등)


⸻

### 🛠️ 주요 API 명세

📌 1. 템플릿 업로드
    •	POST /api/templates
    •	FormData로 .docx 파일 업로드
    •	서버에서 docx-templater 또는 mammoth로 구조 추출
    •	DB에 Template, TemplateStructure 저장

⸻

📌 2. 템플릿 목록 조회
    •	GET /api/templates
    •	관리자 UI에서 사용
    •	저장된 템플릿의 id, name, description, createdAt, usageCount 등 반환

⸻

📌 3. 특정 템플릿 상세 조회
    •	GET /api/templates/:id
    •	해당 템플릿 구조(TemplateStructure[]) 반환

⸻

📌 4. 템플릿 구조 수정
    •	PUT /api/templates/:id/structures/:structureId
    •	구조 항목의 isTranslatable 값 등을 업데이트 (ex: 사용자가 번역 대상 여부 변경)

⸻

📌 5. 템플릿 삭제
    •	DELETE /api/templates/:id
    •	사용 중인 경우 경고 처리 필요

⸻

📌 6. 템플릿 매칭
    •	POST /api/templates/match
    •	본문: 업로드된 문서의 구조 JSON
    •	응답: 가장 유사한 템플릿 ID + 유사도 점수

⸻

📌 7. 번역 삽입 및 .docx 생성
    •	POST /api/templates/:id/fill
    •	본문: { placeholder: translatedText } 맵
    •	응답: 생성된 .docx 파일 다운로드 URL

⸻

