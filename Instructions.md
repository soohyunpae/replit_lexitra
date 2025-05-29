# 템플릿 다운로드 기능 문제 분석 및 해결 방안

## 🔍 문제 상황 분석

### 현재 증상
- 프로젝트 ID 96에서 "템플릿 다운로드" 버튼 클릭 시 페이지가 blank 상태가 됨
- 로그에서 다음과 같은 오류 발생:
```
Template DOCX download error: TypeError: Cannot read properties of undefined (reading 'referencedTable')
```

### 🔧 심층 코드베이스 분석

#### 1. 관련 파일 및 함수 매핑

**프론트엔드 (클라이언트)**
- `client/src/pages/project.tsx` - 템플릿 다운로드 버튼 UI 및 요청 로직
- 관련 함수: `downloadTemplateMutation.mutate()`

**백엔드 (서버)**
- `server/routes.ts` - `/api/projects/:id/download-template` API 엔드포인트
- `server/services/docx_template_service.ts` - 템플릿 서비스 로직
- `server/utils/docx_fill.ts` - docx-templater 기반 DOCX 생성
- 관련 함수: `generateDocxFromTemplate()`, `getTemplateDetails()`, `fillDocxTemplate()`

**데이터베이스 스키마**
- `shared/schema.ts` - docTemplates, templateFields, projects 테이블 정의
- `db/migrations/` - 템플릿 관련 데이터베이스 구조

#### 2. 오류 원인 분석

**주요 문제점:**
1. **Drizzle ORM 관계 설정 오류**: `referencedTable` 오류는 Drizzle의 관계(relation) 설정에서 발생
2. **템플릿 필드 관계 설정 누락**: `projects.template` 관계가 제대로 정의되지 않음
3. **docx-templater 라이브러리 미설치**: 실제 DOCX 생성 라이브러리가 없음
4. **템플릿 데이터 매핑 로직 불완전**: 번역된 세그먼트를 템플릿 placeholder에 매핑하는 로직 부족

**세부 분석:**
- 로그에서 `QueryPromise._getQuery`에서 오류 발생 → Drizzle ORM의 `with` 구문에서 관계 해석 실패
- `projects` 테이블과 `docTemplates` 테이블 간의 관계가 제대로 설정되지 않음
- `templateId` 필드는 있지만 실제 관계 매핑이 스키마에서 누락

#### 3. 현재 구현 상태 검토

**✅ 완료된 부분:**
- 템플릿 관리 UI (Admin Console)
- 템플릿 업로드 및 메타데이터 저장
- 기본 API 엔드포인트 구조
- 프로젝트에 템플릿 ID 저장

**❌ 누락/문제 부분:**
- docx-templater 라이브러리 설치
- Drizzle ORM 관계 정의 오류
- 실제 DOCX 파일 생성 로직
- 번역 세그먼트 → 템플릿 매핑 로직
- 파일 다운로드 응답 처리

## 🛠️ 해결 방안 및 구현 계획

### Phase 1: 기반 인프라 수정

#### 1-1. 필수 라이브러리 설치
```bash
npm install docxtemplater pizzip
npm install @types/pizzip --save-dev
```

#### 1-2. 데이터베이스 스키마 관계 수정
- `shared/schema.ts`에서 projects와 docTemplates 간의 관계 올바르게 정의
- Drizzle 관계 설정 문법 수정

#### 1-3. docx_fill.ts 실제 구현
- 현재 기본 틀만 있는 파일을 실제 docx-templater 기반으로 완성
- `fillDocxTemplate()`, `validateTemplate()`, `extractPlaceholders()` 함수 구현

### Phase 2: 핵심 로직 구현

#### 2-1. 템플릿 데이터 매핑 로직
- 번역된 세그먼트를 템플릿의 placeholder에 매핑하는 알고리즘 구현
- 템플릿 필드의 `orderIndex`를 활용한 순서 기반 매핑

#### 2-2. API 엔드포인트 수정
- `/api/projects/:id/download-template`에서 Drizzle 쿼리 수정
- 올바른 관계 로딩 및 오류 처리 추가

#### 2-3. DOCX 파일 생성 및 다운로드
- docx-templater를 사용한 실제 파일 생성
- 생성된 파일의 HTTP 스트림 응답 처리
- 임시 파일 정리 로직

### Phase 3: 프론트엔드 개선

#### 3-1. 오류 처리 강화
- 템플릿이 없는 경우 처리
- 네트워크 오류 및 서버 오류 대응
- 사용자 친화적 오류 메시지

#### 3-2. UX 개선
- 다운로드 진행 상태 표시
- 성공/실패 피드백 개선

## 🔧 상세 구현 단계

### Step 1: 라이브러리 설치 및 타입 정의

### Step 2: 스키마 관계 수정
```typescript
// shared/schema.ts 수정 필요
export const projectsRelations = relations(projects, ({ one, many }) => ({
  // ... 기존 관계들
  template: one(docTemplates, {
    fields: [projects.templateId],
    references: [docTemplates.id],
  }),
}));

export const docTemplatesRelations = relations(docTemplates, ({ one, many }) => ({
  creator: one(users, {
    fields: [docTemplates.createdBy],
    references: [users.id],
  }),
  fields: many(templateFields),
  projects: many(projects), // 역방향 관계 추가
}));
```

### Step 3: docx_fill.ts 완성
- PizZip과 Docxtemplater 라이브러리 사용
- 실제 DOCX 파일 읽기/쓰기 구현
- placeholder 추출 및 데이터 삽입 로직

### Step 4: 서비스 레이어 완성
- `docx_template_service.ts`에서 실제 파일 생성 로직 구현
- 템플릿과 번역 데이터 매핑 알고리즘

### Step 5: API 엔드포인트 수정
- Drizzle 쿼리에서 `with` 구문 수정
- 올바른 관계 로딩 및 오류 처리

### Step 6: 프론트엔드 오류 처리 개선

## 🚨 주의사항

1. **데이터베이스 마이그레이션**: 스키마 변경 시 기존 데이터 보존 필요
2. **메모리 관리**: 대용량 DOCX 파일 처리 시 메모리 사용량 모니터링
3. **파일 보안**: 생성된 임시 파일 자동 정리 및 접근 권한 관리
4. **성능 최적화**: 큰 프로젝트의 경우 비동기 처리 고려

## 🎯 우선순위

1. **High Priority**: docx-templater 라이브러리 설치 및 Drizzle 관계 수정
2. **High Priority**: 기본 DOCX 생성 및 다운로드 기능 구현
3. **Medium Priority**: 템플릿 매핑 로직 완성
4. **Low Priority**: UX 개선 및 고급 기능

## 🧪 테스트 계획

1. ID 96 프로젝트에서 템플릿 다운로드 기능 테스트
2. 다양한 템플릿 구조로 매핑 정확성 검증
3. 대용량 프로젝트에서 성능 테스트
4. 오류 시나리오 테스트 (템플릿 없음, 네트워크 오류 등)

이 계획에 따라 단계적으로 구현하면 템플릿 다운로드 기능이 정상적으로 작동할 것입니다.