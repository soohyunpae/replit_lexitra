# UI Language Implementation Plan

## Current State
- The app has translation files in `/client/public/locales/{en,ko}/translation.json`
- The app uses i18next library but lacks proper initialization and configuration
- Sidebar component attempts to use untranslated strings
- Auth page shows hard-coded Korean text

## Implementation Plan

### 1. Language Management Hooks
Create a language context and hook to manage the UI language state across the application.

Steps:
1. Create `/client/src/hooks/use-language.tsx`
2. Add language switching functionality
3. Persist language preference in localStorage
4. Integrate with i18next

### 2. i18next Configuration 
Set up proper i18next initialization in `/client/src/i18n/index.ts`:
1. Configure language detection
2. Set up dynamic loading of translation files
3. Add language fallbacks
4. Enable dev mode for debugging

### 3. Component Updates
Update the following components to use translations:
1. Sidebar - Add language selector and use translated strings
2. Auth pages - Convert hard-coded Korean to use translation keys
3. Project pages - Use translated content

### 4. UI Elements
Add language switching UI:
1. Add language toggle in profile settings
2. Add language indicator in header
3. Persist selection across sessions

## Code Changes Required

1. Create language hook:
```typescript
// /client/src/hooks/use-language.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type LanguageType = 'en' | 'ko';

interface LanguageContextType {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState<LanguageType>(() => {
    const saved = localStorage.getItem('lexitra-language');
    return (saved === 'en' || saved === 'ko') ? saved : 'ko';
  });

  const { i18n } = useTranslation();

  const setLanguage = (newLanguage: LanguageType) => {
    setLanguageState(newLanguage);
    i18n.changeLanguage(newLanguage);
    localStorage.setItem('lexitra-language', newLanguage);
    document.documentElement.lang = newLanguage;
  };

  useEffect(() => {
    i18n.changeLanguage(language);
    document.documentElement.lang = language;
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
```

2. Configure i18next:
```typescript
// /client/src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: true,
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json'
    }
  });

export default i18n;
```

## Success Criteria
1. Users can switch between Korean and English UI
2. Language preference persists across sessions
3. All UI elements reflect selected language
4. Smooth transition between languages
5. Proper fallback to default language

## Testing Steps
1. Verify language switching in all major components
2. Test persistence across page refreshes
3. Check translation coverage
4. Validate language detection
5. Test fallback behavior

## Implementation Order
1. Set up i18next configuration
2. Create language context and hooks
3. Update components to use translations
4. Add language switching UI
5. Test and validate