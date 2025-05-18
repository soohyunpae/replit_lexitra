import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

// Initialize i18next
i18n
  // Load translations via HTTP for production use
  .use(Backend)
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
    // Namespace for translation files
    defaultNS: 'translation',
    // Caching configuration
    load: 'languageOnly',
    // Options for interpolation
    interpolation: {
      escapeValue: false, // React already safes from XSS
    },
    // Backend configuration for loading translations
    backend: {
      // Path where translations will be loaded from
      loadPath: '/locales/{{lng}}/{{ns}}.json',
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