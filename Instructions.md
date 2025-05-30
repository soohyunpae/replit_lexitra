
# 템플릿 매칭 기능 문제 분석 및 해결 방안

## 🔍 문제 상황 분석

### 현재 증상
- 프로젝트 생성 후 "매칭 시도" 버튼 클릭 시 페이지가 blank 상태가 됨
- 이후 해당 프로젝트 페이지 접근 시에도 계속 blank 페이지 표시
- 브라우저 콘솔에서 JavaScript 오류 발생 가능성

### 🔧 심층 코드베이스 분석

#### 1. 관련 파일 및 함수 매핑

**프론트엔드 (클라이언트)**
- `client/src/pages/project.tsx` - 템플릿 매칭 버튼과 UI 로직
- 관련 함수: 템플릿 매칭 fetch 요청 (익명 함수로 구현됨)

**백엔드 (서버)**
- `server/routes.ts` - `/api/projects/:id/match-template` API 엔드포인트 (누락)
- `server/services/docx_template_service.ts` - 템플릿 서비스 로직
- `server/routes/templates.ts` - 템플릿 관련 API 라우트
- 관련 함수: `matchTemplateToDocument()`, `getTemplates()`, `getTemplateDetails()`

**데이터베이스 스키마**
- `shared/schema.ts` - docTemplates, templateFields, projects 테이블
- `db/migrations/add-template-to-projects.sql` - 템플릿 관련 컬럼 추가

#### 2. 오류 원인 분석

**주요 문제점:**

1. **API 엔드포인트 누락**: `server/routes.ts`에 `/api/projects/:id/match-template` 엔드포인트가 구현되지 않음
2. **프론트엔드 오류 처리 부족**: 템플릿 매칭 요청 실패 시 적절한 오류 처리가 없어 페이지가 멈춤
3. **템플릿 매칭 로직 불완전**: `docx_template_service.ts`의 `matchTemplateToDocument()` 함수가 미완성 상태
4. **데이터베이스 관계 설정**: projects 테이블의 `template_id`와 `template_match_score` 컬럼 업데이트 로직 누락

**세부 분석:**
- `project.tsx`에서 템플릿 매칭 요청이 실패하면 catch 블록에서 toast만 표시하고 페이지 상태가 복구되지 않음
- 서버에서 404 또는 500 오류 발생 시 클라이언트가 적절히 처리하지 못함
- `matchTemplateToDocument()` 함수가 파일 경로를 받도록 설계되었으나 실제 프로젝트 파일과 연결되지 않음

#### 3. 현재 구현 상태 검토

**✅ 완료된 부분:**
- 템플릿 관리 UI (Admin Console)
- 템플릿 업로드 및 메타데이터 저장
- 기본 데이터베이스 스키마
- 프로젝트에 템플릿 정보 표시

**❌ 누락/문제 부분:**
- 프로젝트 템플릿 매칭 API 엔드포인트
- 실제 파일 기반 템플릿 매칭 로직
- 프론트엔드 오류 복구 메커니즘
- 매칭 결과 데이터베이스 저장 로직

## 🛠️ 해결 방안 및 구현 계획

### Phase 1: API 엔드포인트 구현

#### 1-1. 프로젝트 템플릿 매칭 API 추가
- `server/routes.ts`에 `/api/projects/:id/match-template` POST 엔드포인트 추가
- 프로젝트의 첫 번째 파일을 기반으로 템플릿 매칭 수행
- 매칭 결과를 데이터베이스에 저장

#### 1-2. 템플릿 매칭 서비스 로직 완성
- `docx_template_service.ts`의 `matchTemplateToDocument()` 함수 개선
- 실제 파일 내용 기반 텍스트 매칭 알고리즘 구현
- 매칭률 계산 및 임계값 설정

### Phase 2: 프론트엔드 안정성 개선

#### 2-1. 오류 처리 강화
- 템플릿 매칭 요청 실패 시 페이지 상태 복구
- 로딩 상태 관리 개선
- 사용자 친화적 오류 메시지

#### 2-2. UI/UX 개선
- 매칭 진행 상태 표시
- 매칭 결과 시각적 피드백
- 재시도 기능 추가

### Phase 3: 데이터베이스 연동 완성

#### 3-1. 매칭 결과 저장
- `template_id` 필드 업데이트
- `template_match_score` JSON 형태로 매칭 정보 저장
- 매칭 히스토리 추적

## 🔧 상세 구현 단계

### Step 1: API 엔드포인트 추가 (server/routes.ts)

```typescript
// 프로젝트 템플릿 매칭 API
app.post(
  `${apiPrefix}/projects/:id/match-template`,
  verifyToken,
  async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // 관리자 권한 체크
      if (userRole !== "admin") {
        return res.status(403).json({ 
          matched: false,
          message: "관리자만 템플릿 매칭을 수행할 수 있습니다." 
        });
      }

      // 프로젝트 조회
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, projectId),
        with: { files: true }
      });

      if (!project) {
        return res.status(404).json({ 
          matched: false,
          message: "프로젝트를 찾을 수 없습니다." 
        });
      }

      // 파일이 없는 경우
      if (!project.files || project.files.length === 0) {
        return res.status(400).json({ 
          matched: false,
          message: "매칭할 파일이 없습니다." 
        });
      }

      // 첫 번째 파일로 템플릿 매칭 수행
      const firstFile = project.files[0];
      const matchResult = await templateService.matchProjectToTemplate(projectId, firstFile.id);

      if (matchResult && matchResult.matched) {
        // 매칭 성공 시 프로젝트 업데이트
        await db.update(schema.projects)
          .set({
            templateId: matchResult.templateId,
            templateMatchScore: JSON.stringify({
              templateId: matchResult.templateId,
              templateName: matchResult.templateName,
              matchScore: matchResult.matchScore,
              matchedAt: new Date().toISOString()
            }),
            updatedAt: new Date()
          })
          .where(eq(schema.projects.id, projectId));

        return res.json({
          matched: true,
          templateId: matchResult.templateId,
          templateName: matchResult.templateName,
          matchScore: matchResult.matchScore,
          message: `템플릿 "${matchResult.templateName}"이 성공적으로 매칭되었습니다.`
        });
      } else {
        return res.json({
          matched: false,
          message: "매칭되는 템플릿을 찾을 수 없습니다. (임계값: 70% 이상)"
        });
      }
    } catch (error) {
      console.error('템플릿 매칭 오류:', error);
      return res.status(500).json({ 
        matched: false,
        message: "템플릿 매칭 중 서버 오류가 발생했습니다." 
      });
    }
  }
);
```

### Step 2: 템플릿 매칭 서비스 개선 (server/services/docx_template_service.ts)

```typescript
// 프로젝트 기반 템플릿 매칭 함수 추가
export async function matchProjectToTemplate(projectId: number, fileId: number) {
  try {
    // 파일 내용 가져오기
    const file = await db.query.files.findFirst({
      where: eq(schema.files.id, fileId),
      with: { segments: true }
    });

    if (!file || !file.segments) {
      return { matched: false, message: "파일 또는 세그먼트를 찾을 수 없습니다." };
    }

    // 파일의 모든 소스 텍스트 결합
    const sourceText = file.segments
      .map(segment => segment.source)
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    // 모든 템플릿 가져오기
    const templates = await getTemplates();
    
    let bestMatch = null;
    let bestScore = 0;
    const MATCH_THRESHOLD = 0.7; // 70% 임계값

    // 각 템플릿과 매칭률 계산
    for (const template of templates) {
      const templateDetail = await getTemplateDetails(template.id);
      
      if (!templateDetail) continue;

      // 템플릿의 샘플 콘텐츠와 매칭
      const templateContent = templateDetail.fields
        .map(field => field.sampleContent)
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      // 간단한 키워드 기반 매칭 점수 계산
      const score = calculateTextSimilarity(sourceText, templateContent);
      
      if (score > bestScore && score >= MATCH_THRESHOLD) {
        bestScore = score;
        bestMatch = {
          templateId: template.id,
          templateName: template.name,
          matchScore: score
        };
      }
    }

    if (bestMatch) {
      return {
        matched: true,
        ...bestMatch
      };
    } else {
      return {
        matched: false,
        message: `매칭률이 임계값(${MATCH_THRESHOLD * 100}%)을 넘는 템플릿이 없습니다.`
      };
    }
  } catch (error) {
    console.error('템플릿 매칭 처리 오류:', error);
    return {
      matched: false,
      message: "템플릿 매칭 중 오류가 발생했습니다."
    };
  }
}

// 텍스트 유사도 계산 함수
function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;

  // 단어 기반 Jaccard 유사도 계산
  const words1 = new Set(text1.split(/\s+/).filter(word => word.length > 2));
  const words2 = new Set(text2.split(/\s+/).filter(word => word.length > 2));
  
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}
```

### Step 3: 프론트엔드 오류 처리 개선 (client/src/pages/project.tsx)

```typescript
// 템플릿 매칭 버튼 클릭 핸들러 개선
<Button
  variant="ghost"
  size="sm"
  className="ml-2 h-6 px-2 text-xs"
  onClick={async () => {
    try {
      // 로딩 상태 표시
      const loadingToast = toast({
        title: "템플릿 매칭 중",
        description: "잠시만 기다려주세요...",
      });

      const response = await fetch(`/api/projects/${projectId}/match-template`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("auth_token") || ""}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      // 로딩 토스트 제거
      loadingToast.dismiss?.();
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.matched) {
        toast({
          title: "템플릿 매칭 성공",
          description: `템플릿 "${result.templateName}"이 적용되었습니다. (매칭률: ${Math.round(result.matchScore * 100)}%)`,
        });
      } else {
        toast({
          title: "템플릿 매칭 실패",
          description: result.message || "매칭되는 템플릿을 찾을 수 없습니다.",
          variant: "destructive",
        });
      }
      
      // 프로젝트 정보 새로고침
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}`],
      });
      
    } catch (error) {
      console.error("템플릿 매칭 요청 오류:", error);
      
      // 구체적인 오류 메시지 제공
      let errorMessage = "네트워크 오류가 발생했습니다.";
      if (error instanceof Error) {
        if (error.message.includes('HTTP 404')) {
          errorMessage = "템플릿 매칭 기능이 아직 구현되지 않았습니다.";
        } else if (error.message.includes('HTTP 403')) {
          errorMessage = "관리자 권한이 필요합니다.";
        } else if (error.message.includes('HTTP 500')) {
          errorMessage = "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
        }
      }
      
      toast({
        title: "템플릿 매칭 실패",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }}
  disabled={!isAdmin} // 관리자만 사용 가능
>
  매칭 시도
</Button>
```

### Step 4: 데이터베이스 스키마 확인 및 보완

```sql
-- shared/schema.ts에서 관계 확인
export const projectsRelations = relations(projects, ({ one, many }) => ({
  // 기존 관계들...
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

## 🚨 주의사항

1. **점진적 배포**: API 엔드포인트를 먼저 구현하고 테스트한 후 프론트엔드 개선 적용
2. **오류 복구**: 현재 blank 페이지 상태인 프로젝트는 브라우저 캐시 클리어 또는 하드 리프레시 필요
3. **권한 관리**: 템플릿 매칭은 관리자만 수행할 수 있도록 제한
4. **성능 고려**: 대용량 파일의 경우 텍스트 매칭 성능 최적화 필요

## 🎯 우선순위

1. **High Priority**: API 엔드포인트 구현 및 기본 매칭 로직
2. **High Priority**: 프론트엔드 오류 처리 개선
3. **Medium Priority**: 매칭 알고리즘 정확도 개선
4. **Low Priority**: 고급 매칭 기능 및 UI 개선

## 🧪 테스트 계획

1. **기본 기능 테스트**: 템플릿이 등록된 상태에서 프로젝트 매칭 테스트
2. **오류 시나리오 테스트**: 템플릿이 없는 경우, 파일이 없는 경우, 권한이 없는 경우
3. **매칭 정확도 테스트**: 다양한 문서 유형으로 매칭률 검증
4. **UI 안정성 테스트**: 매칭 실패 후 페이지 복구 확인

이 계획에 따라 단계적으로 구현하면 템플릿 매칭 기능이 안정적으로 작동하고 blank 페이지 문제가 해결될 것입니다.


## 템플릿 시스템 관련 파일 목록
1. 백엔드 서비스 파일들
server/services/docx_template_service.ts - 템플릿 관리 핵심 서비스 (분석, 저장, 매칭, 생성)
server/utils/docx_fill.ts - docx-templater 기반 DOCX 파일 처리 유틸리티
server/routes/templates.ts - 템플릿 관련 API 라우트
2. 데이터베이스 스키마
shared/schema.ts - docTemplates, templateFields 테이블 정의
db/migrations/add-template-to-projects.sql - 프로젝트에 템플릿 관계 추가
db/migrations/manual-template-tables.sql - 템플릿 테이블 생성
3. 프론트엔드 파일들
client/src/pages/admin/template-manager.tsx - 관리자용 템플릿 관리 페이지
client/src/pages/project.tsx - 프로젝트 페이지 (템플릿 매칭 버튼 및 다운로드 기능)
4. 메인 라우트 파일
server/routes.ts - 프로젝트 템플릿 매칭 API (/api/projects/:id/match-template)
5. 업로드 디렉토리
uploads/templates/ - 업로드된 템플릿 파일들 저장소
uploads/tmp/ - 임시 업로드 파일들
6. 테스트 파일
test/template-test.js - 템플릿 테스트 스크립트
주요 기능별 파일 분류
템플릿 관리 (관리자)
server/services/docx_template_service.ts - 템플릿 CRUD
server/routes/templates.ts - 템플릿 API
client/src/pages/admin/template-manager.tsx - 관리자 UI
템플릿 매칭 (사용자)
server/routes.ts (Line 1700+) - 매칭 API
client/src/pages/project.tsx (Line 400+) - 매칭 버튼
server/services/docx_template_service.ts - matchTemplateToDocument() 함수
템플릿 기반 파일 생성
server/utils/docx_fill.ts - docx-templater 처리
server/routes.ts (Line 1650+) - 다운로드 API
client/src/pages/project.tsx (Line 200+) - 다운로드 버튼
이러한 파일들이 협력하여 DOCX 템플릿을 업로드, 분석, 매칭, 적용하는 전체 시스템을 구성합니다.