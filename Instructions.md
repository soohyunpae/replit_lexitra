# UI Internationalization Implementation Guide

## Missing Translations
현재 누락된 번역 키들:

1. TM (Translation Memory) 섹션:
- tm.added: "추가됨"
- tm.modifiedBy: "수정한 사람"

## Translation Files
- 영어: `/client/public/locales/en/translation.json`
- 한국어: `/client/public/locales/ko/translation.json`

## Implementation Steps
1. 각 컴포넌트에서 하드코딩된 텍스트 검사
2. useTranslation 훅 사용 확인
3. 번역 키 추가 및 업데이트
4. 컴포넌트 리팩토링

## Priority Components
1. /client/src/components/layout/
2. /client/src/components/translation/
3. /client/src/pages/

## Testing
- 각 언어 전환 시 UI 텍스트 확인
- 누락된 번역 키 검사
- 컨텍스트에 맞는 번역 검증