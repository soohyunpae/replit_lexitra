⸻

📄 Lexitra PDF 번역 파이프라인 설계 요약서 (v1.0)

1. 🎯 프로젝트 목표
  •	PDF 문서를 빠르고 안정적으로 처리하고
  •	원본 레이아웃을 보존한 상태로 번역된 결과물을 출력하는 파이프라인 구축
  •	GPT 기반 번역 + TM 반영 + 결과물 다운로드까지 포함

⸻

2. 🧱 전체 구조 개요

📌 1단계: 전처리 (Parsing & Segmentation)

| 항목 | 설명 |
|------|------|
| 주 사용 도구 | `PyMuPDF (Fitz)` – 빠르고 좌표 기반 추출이 가능해 기본 도구로 채택 |
| 보완 도구 | `pdf2docx` – 복잡한 레이아웃을 보존해야 하는 특수한 경우에만 사용<br>`pdf-parse`, `pdftotext` – fallback 또는 경량 텍스트 추출용 |
| 세그먼트 분할 | 문단/문장 단위로 segment ID 부여, 점진적으로 저장 가능 |
| 속도 최적화 | 페이지 단위로 chunking, 백엔드 병렬 처리 (`worker_threads`) |
| 캐싱 전략 | 파일 해시 기반 파일 시스템 캐시 사용 (필요 시 Redis로 확장 고려) |

⸻

📌 2단계: 번역

항목	설명
번역 엔진	GPT-4 or Azure OpenAI API
TM 활용	기존 번역 메모리 매칭 우선 적용, 없는 경우 GPT 사용
삽입 방식	문장별 위치에 맞게 번역 삽입 (Word 구조 기반)
세그먼트 관리	segment-level history + TM 저장 상태 관리 (MT, Approved 등)


⸻

📌 3단계: 결과물 출력 (Layout Preservation)

출력 포맷	처리 방식
PDF	pdf2docx → python-docx에서 텍스트 삽입 → docx2pdf로 PDF 저장
DOCX	번역 삽입된 Word 파일 직접 제공
HTML	PyMuPDF or PDF.js를 기반으로 시각적으로 HTML 구성 가능 (선택적)


⸻

3. 🕹️ 사용자 경험 전략 (UX 관점)

| 기능 | 설명 |
|------|------|
| 비동기 처리 | 문서 길이가 길 경우 처리 중 표시 및 프로그레스 바 제공 |
| 미리보기 전략 | 앞 10개 세그먼트 먼저 표시 → 이후 백그라운드에서 점진적으로 처리 |
| 세그먼트 단위 저장 | 세그먼트별로 처리 후 저장 → 오류 복구 및 중단 재개 용이 |
| 결과 다운로드 | 번역 완료 시 Word 또는 PDF 형식으로 다운로드 가능 |
| 옵션 선택 | “레이아웃 유지 vs 텍스트 위주 추출” 모드 선택 제공 예정 |

⸻

4. 📦 기술 스택 요약

분류	도구
PDF 파싱	PyMuPDF, pdf2docx, pdftotext, pdf-parse
Word 처리	python-docx, docx2pdf
번역	GPT API, Translation Memory (Prisma 기반 DB)
비동기 처리	Node.js worker_threads, 또는 Python multiprocessing
캐싱	파일 해시 기반 in-memory 또는 Redis 등으로 확장 가능


⸻

5. 🪜 단계별 구현 순서
1. ✅ PyMuPDF 기반 PDF 전처리 + 페이지 chunking 구현  
2. ✅ 파일 해시 기반 캐싱 시스템 구축 (파일 시스템 기반)  
3. ✅ 세그먼트 단위 GPT 번역 + TM 적용 처리 흐름 구현  
4. 🔜 레이아웃 보존형 결과물 출력 구현 (`pdf2docx` → `python-docx` → `docx2pdf`, 필요 시)  
5. 🔜 프론트엔드 세그먼트 기반 미리보기 및 점진적 렌더링 구현  
6. 🔜 Word/PDF 다운로드 엔드포인트 제공

⸻

6. ⚖️ 구현 전략 선택 가이드

| 상황 | 추천 경로 |
|------|----------|
| 템플릿 보존, 정교한 레이아웃 유지가 중요한 경우 | `pdf2docx` → `python-docx` → `docx2pdf` |
| 빠른 추출과 구조화 텍스트 위주 작업이 필요한 경우 | `PyMuPDF` |
| 웹 기반 미리보기가 필요한 경우 | `PDF.js` (서버 렌더링에는 부적합) |

⸻

