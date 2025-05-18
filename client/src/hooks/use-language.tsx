import React, { createContext, useState, useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";

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
    
    return defaultLanguage;
  });

  // i18next translation hook
  const { i18n } = useTranslation();

  // Set language handler with persistence
  const setLanguage = (newLanguage: LanguageType) => {
    setLanguageState(newLanguage);
    i18n.changeLanguage(newLanguage);
    localStorage.setItem("lexitra-language-preference", newLanguage);
    document.documentElement.setAttribute("lang", newLanguage);
  };

  // Toggle between available languages
  const toggleLanguage = () => {
    const newLanguage = language === "en" ? "ko" : "en";
    setLanguage(newLanguage);
  };

  // Effect to sync i18next language with our state on mount
  useEffect(() => {
    i18n.changeLanguage(language);
  }, [i18n, language]);

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