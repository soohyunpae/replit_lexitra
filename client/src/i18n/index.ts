import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

// 언어 리소스 번들 직접 정의
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
        language: "Language",
        general: "General",
        system: "System"
      },
      profile: {
        title: "Profile",
        personalInfo: "Personal Information",
        preferences: "Preferences",
        accountInformation: "Account Information",
        username: "Username",
        userId: "User ID",
        themeSettings: "Theme Settings",
        chooseTheme: "Choose your preferred theme mode",
        language: "Language",
        uiLanguage: "UI Language",
        chooseUiLanguage: "Choose the language for the user interface",
        currentUiLanguage: "Current UI language",
        defaultLanguages: "Set your default source and target languages for translation projects",
        sourceLanguage: "Source Language",
        targetLanguage: "Target Language",
        savePreferences: "Save Preferences",
        loggingOut: "Logging out..."
      },
      languages: {
        en: "English",
        ko: "Korean",
        ja: "Japanese"
      },
      projects: {
        title: "Projects",
        createNewProject: "Create New Project",
        myProjects: "My Projects",
        allProjects: "All Projects",
        searchProjects: "Search projects...",
        noProjects: "No projects found",
        projectCreated: "Project created",
        projectName: "Project Name",
        description: "Description",
        created: "Created",
        lastUpdated: "Last Updated",
        deadline: "Deadline",
        status: "Status",
        actions: "Actions",
        unclaimed: "Unclaimed",
        inProgress: "In Progress",
        claimed: "Claimed",
        completed: "Completed",
        claimProject: "Claim",
        completeProject: "Complete",
        viewProject: "View"
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
        language: "언어",
        general: "일반",
        system: "시스템"
      },
      profile: {
        title: "프로필",
        personalInfo: "개인 정보",
        preferences: "환경 설정",
        accountInformation: "계정 정보",
        username: "사용자 이름",
        userId: "사용자 ID",
        themeSettings: "테마 설정",
        chooseTheme: "원하는 테마 모드를 선택하세요",
        language: "언어",
        uiLanguage: "UI 언어",
        chooseUiLanguage: "사용자 인터페이스 언어를 선택하세요",
        currentUiLanguage: "현재 UI 언어",
        defaultLanguages: "번역 프로젝트의 기본 소스 및 대상 언어 설정",
        sourceLanguage: "소스 언어",
        targetLanguage: "대상 언어",
        savePreferences: "환경 설정 저장",
        loggingOut: "로그아웃 중..."
      },
      languages: {
        en: "영어",
        ko: "한국어",
        ja: "일본어"
      },
      projects: {
        title: "프로젝트",
        createNewProject: "새 프로젝트 생성",
        myProjects: "내 프로젝트",
        allProjects: "모든 프로젝트",
        searchProjects: "프로젝트 검색...",
        noProjects: "프로젝트가 없습니다",
        projectCreated: "프로젝트 생성됨",
        projectName: "프로젝트 이름",
        description: "설명",
        created: "생성일",
        lastUpdated: "마지막 업데이트",
        deadline: "마감일",
        status: "상태",
        actions: "작업",
        unclaimed: "미할당",
        inProgress: "진행 중",
        claimed: "할당됨",
        completed: "완료됨",
        claimProject: "할당받기",
        completeProject: "완료",
        viewProject: "보기"
      }
    }
  }
};

// Get the user's preference from localStorage or use browser language
const getUserLanguage = () => {
  const savedLanguage = localStorage.getItem("lexitra-language-preference");
  
  if (savedLanguage === "en" || savedLanguage === "ko") {
    return savedLanguage;
  }
  
  // If no saved preference, try to use browser language
  const browserLang = navigator.language.split('-')[0];
  return browserLang === "ko" ? "ko" : "en"; // Only support en/ko for now
};

// Initialize i18next
const initI18n = () => {
  return i18n
    .use(initReactI18next)
    .use(Backend)
    .init({
      // Get language from localStorage or fallback to browser language
      lng: getUserLanguage(),
      // Fallback language
      fallbackLng: 'en',
      // Debug mode for development (can be disabled in production)
      debug: process.env.NODE_ENV === 'development',
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
        bindI18n: 'languageChanged',
        bindI18nStore: '',
      },
      // Detect language changes
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: 'lexitra-language-preference',
      },
      // Add more responsive behavior for language changes
      keySeparator: '.',
      nsSeparator: ':',
      // Add event listener for language changes
      returnEmptyString: false,
      returnNull: false,
    });
};

// Initialize i18n
initI18n();

// Add event listener for language changes
document.addEventListener("DOMContentLoaded", () => {
  const savedLanguage = localStorage.getItem("lexitra-language-preference");
  if (savedLanguage) {
    document.documentElement.lang = savedLanguage;
    document.documentElement.setAttribute('lang', savedLanguage);
  }
});

// Function to change the language
export const changeLanguage = (language: string) => {
  localStorage.setItem("lexitra-language-preference", language);
  document.documentElement.lang = language;
  document.documentElement.setAttribute('lang', language);
  return i18n.changeLanguage(language).then(() => {
    // Force update all components by dispatching a custom event
    window.dispatchEvent(new Event('i18nextLanguageChanged'));
  });
};

// Function to get the current language
export const getCurrentLanguage = () => {
  return i18n.language;
};

export default i18n;