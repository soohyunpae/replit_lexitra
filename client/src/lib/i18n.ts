
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      // Common
      "Projects": "Projects",
      "Files": "Files",
      "Reference Files": "Reference Files",
      "Project Info": "Project Info",
      "Translation Summary": "Translation Summary",
      "Project Notes": "Project Notes",
      "Word Count": "Word Count",
      "words": "words",
      "Reviewed": "Reviewed",
      "segments": "segments",
      
      // Status
      "No files yet": "No files yet",
      "No Reference Files": "No Reference Files",
      "Drop files here or click to upload": "Drop files here or click to upload",
      
      // Actions
      "Claim": "Claim",
      "Release": "Release",
      "Complete": "Complete",
      "Reopen": "Reopen",
      "Edit": "Edit",
      "Cancel": "Cancel",
      "Save": "Save",
      "Delete": "Delete",
      "Open Editor": "Open Editor"
    }
  },
  ko: {
    translation: {
      // Common
      "Projects": "프로젝트",
      "Files": "파일",
      "Reference Files": "참조 파일",
      "Project Info": "프로젝트 정보",
      "Translation Summary": "번역 요약",
      "Project Notes": "프로젝트 노트",
      "Word Count": "단어 수",
      "words": "단어",
      "Reviewed": "검토됨",
      "segments": "세그먼트",
      
      // Status
      "No files yet": "파일이 없습니다",
      "No Reference Files": "참조 파일이 없습니다",
      "Drop files here or click to upload": "여기에 파일을 드롭하거나 클릭하여 업로드",
      
      // Actions
      "Claim": "작업 시작",
      "Release": "작업 해제",
      "Complete": "완료",
      "Reopen": "재개",
      "Edit": "편집",
      "Cancel": "취소", 
      "Save": "저장",
      "Delete": "삭제",
      "Open Editor": "편집기 열기"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
