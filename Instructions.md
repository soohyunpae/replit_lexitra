
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

