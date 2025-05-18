import React, { createContext, useState, useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

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
  const [language, setLanguageState] = useState<LanguageType>(() => {
    const savedLanguage = localStorage.getItem("lexitra-language-preference");
    return (savedLanguage === "en" || savedLanguage === "ko") ? savedLanguage : defaultLanguage;
  });

  const { i18n } = useTranslation();

  const setLanguage = async (newLanguage: LanguageType) => {
    setLanguageState(newLanguage);
    await i18n.changeLanguage(newLanguage);
    localStorage.setItem("lexitra-language-preference", newLanguage);
    document.documentElement.lang = newLanguage;
  };

  const toggleLanguage = () => {
    const newLanguage = language === "en" ? "ko" : "en";
    setLanguage(newLanguage);
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "lexitra-language-preference") {
        const newLang = e.newValue as LanguageType;
        if (newLang && (newLang === "en" || newLang === "ko") && newLang !== language) {
          setLanguage(newLang);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    i18n.changeLanguage(language);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}