import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

// 리소스 번들 직접 정의
const resources = {
  en: {
    translation: {
      common: {
        home: "Home",
        projects: "Projects",
        glossaries: "Glossaries",
        tm: "Translation Memory",
        profile: "Profile",
        admin: "Admin",
        login: "Login",
        logout: "Logout",
        myAccount: "My Account",
        myProfile: "My Profile",
        darkMode: "Dark Mode",
        lightMode: "Light Mode",
        save: "Save",
        cancel: "Cancel",
        search: "Search",
        loading: "Loading...",
        error: "Error",
        success: "Success",
        noData: "No data available",
        create: "Create",
        edit: "Edit",
        delete: "Delete",
        back: "Back",
        next: "Next",
        confirm: "Confirm",
        language: "Language"
      },
      languages: {
        en: "English",
        ko: "Korean"
      }
    }
  },
  ko: {
    translation: {
      common: {
        home: "홈",
        projects: "프로젝트",
        glossaries: "용어집",
        tm: "번역 메모리",
        profile: "프로필",
        admin: "관리자",
        login: "로그인",
        logout: "로그아웃",
        myAccount: "내 계정",
        myProfile: "내 프로필",
        darkMode: "다크 모드",
        lightMode: "라이트 모드",
        save: "저장",
        cancel: "취소",
        search: "검색",
        loading: "로딩 중...",
        error: "오류",
        success: "성공",
        noData: "데이터가 없습니다",
        create: "생성",
        edit: "편집",
        delete: "삭제",
        back: "뒤로",
        next: "다음",
        confirm: "확인",
        language: "언어"
      },
      languages: {
        en: "영어",
        ko: "한국어"
      }
    }
  }
};

// Initialize i18next
i18n
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    // Default language
    lng: 'en',
    // Fallback language
    fallbackLng: 'en',
    // Debug mode for development (can be disabled in production)
    debug: false,
    // Resources for translation
    resources,
    // Namespace for translation files
    defaultNS: 'translation',
    // Options for interpolation
    interpolation: {
      escapeValue: false, // React already safes from XSS
    },
    // React configuration
    react: {
      useSuspense: false,
    },
  });

// Function to change the language
export const changeLanguage = (language: string) => {
  return i18n.changeLanguage(language);
};

// Function to get the current language
export const getCurrentLanguage = () => {
  return i18n.language;
};

export default i18n;