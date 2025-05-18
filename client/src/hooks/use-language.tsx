import React, { createContext, useState, useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

// Available languages
export type LanguageType = "en" | "ko";

interface LanguageContextProps {
  language: LanguageType;
  setLanguage: (language: LanguageType) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

interface LanguageProviderProps {
  children: React.ReactNode;
  defaultLanguage?: LanguageType;
}

export function LanguageProvider({
  children,
  defaultLanguage = "en",
}: LanguageProviderProps) {
  // Initialize language state from localStorage or default
  const [language, setLanguageState] = useState<LanguageType>(() => {
    // Try to get the language preference from localStorage
    const savedLanguage = localStorage.getItem("lexitra-language-preference");
    
    if (savedLanguage === "en" || savedLanguage === "ko") {
      return savedLanguage;
    }
    
    // If no saved language, try browser language
    const browserLang = navigator.language.split('-')[0] as LanguageType;
    if (browserLang === "ko") {
      return "ko";
    }
    
    return defaultLanguage;
  });

  // i18next translation hook
  const { i18n } = useTranslation();

  // Set language handler
  const setLanguage = (newLanguage: LanguageType) => {
    // Set state
    setLanguageState(newLanguage);
    
    // Update i18n
    i18n.changeLanguage(newLanguage);
    
    // Save preference
    localStorage.setItem("lexitra-language-preference", newLanguage);
    
    // Update HTML lang attribute
    document.documentElement.lang = newLanguage;
    document.documentElement.setAttribute('lang', newLanguage);
    
    // Trigger the i18next languageChanged event to update all components
    window.dispatchEvent(new Event('languageChanged'));
    
    // Log for debugging
    console.log("Language changed to:", newLanguage);
  };

  // Toggle between available languages
  const toggleLanguage = () => {
    const newLanguage = language === "en" ? "ko" : "en";
    setLanguage(newLanguage);
  };

  // Effect to initialize language on mount and handle changes
  useEffect(() => {
    // Ensure language is set in i18n
    i18n.changeLanguage(language);
    
    // Set HTML lang attribute
    document.documentElement.lang = language;
    document.documentElement.setAttribute('lang', language);
    
    // Force global i18n update
    window.dispatchEvent(new Event('languageChanged'));
    
    // Log initial language
    console.log("Current language:", language);
    
    // Add event listener for language changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lexitra-language-preference') {
        const newLang = e.newValue as LanguageType;
        if (newLang && (newLang === "en" || newLang === "ko") && newLang !== language) {
          setLanguageState(newLang);
          i18n.changeLanguage(newLang);
          document.documentElement.lang = newLang;
          document.documentElement.setAttribute('lang', newLang);
          window.dispatchEvent(new Event('languageChanged'));
        }
      }
    };
    
    // Listen for localStorage changes (for multi-tab support)
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [language]); // Add language as dependency to ensure proper updates

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

// Custom hook to use the language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  
  return context;
}