
# Language Switching Implementation Plan

## Current Issues
1. Language switching is only affecting profile page instead of entire application
2. Language selection in preferences does not properly propagate changes
3. The i18n configuration needs optimization

## Analysis

### Related Files
1. `client/src/hooks/use-language.tsx` - Main language context provider
2. `client/src/pages/auth-page.tsx` - Auth page showing language handling
3. `client/src/i18n/index.ts` - i18n configuration
4. `client/src/pages/profile.tsx` - Profile page with language preferences

### Root Cause
1. Language change not being propagated to i18n instance correctly
2. Missing language context provider at app root level
3. Inconsistent language state management between local storage and context

## Implementation Plan

### 1. Update Language Provider
The current language provider needs to ensure:
- Proper initialization from localStorage
- Consistent language state across app
- Proper propagation of language changes

### 2. Update i18n Configuration
Need to:
- Ensure proper language detection
- Handle language changes correctly
- Maintain consistent state with provider

### 3. Fix Profile Page Integration
Must:
- Connect language selection to global context
- Properly trigger language changes
- Update UI immediately on change

## Code Changes Required

1. Update `use-language.tsx`:
```typescript
export function LanguageProvider({
  children,
  defaultLanguage = "en",
}: LanguageProviderProps) {
  const [language, setLanguageState] = useState<LanguageType>(() => {
    const savedLanguage = localStorage.getItem("lexitra-language-preference");
    return (savedLanguage === "en" || savedLanguage === "ko") ? savedLanguage : defaultLanguage;
  });

  const { i18n } = useTranslation();

  const setLanguage = (newLanguage: LanguageType) => {
    setLanguageState(newLanguage);
    i18n.changeLanguage(newLanguage);
    localStorage.setItem("lexitra-language-preference", newLanguage);
    document.documentElement.lang = newLanguage;
  };

  // Initialize on mount
  useEffect(() => {
    i18n.changeLanguage(language);
    document.documentElement.lang = language;
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}
```

2. Update `App.tsx` to wrap entire application with LanguageProvider:
```typescript
function App() {
  return (
    <LanguageProvider>
      {/* Rest of app components */}
    </LanguageProvider>
  );
}
```

## Testing Plan

1. Test Language Switch:
- Change language in profile preferences
- Verify all components update
- Check persistence after refresh

2. Test Language Detection:
- Clear localStorage
- Verify proper default language
- Check browser language detection

3. Test Components:
- Verify sidebar updates
- Check auth pages
- Validate all translated content

## Success Criteria

1. Language switch in profile updates entire application UI
2. Language persists across page refreshes
3. All components properly reflect selected language
4. No UI flicker during language switch
5. Consistent language state across all pages

## Implementation Steps

1. Apply code changes in sequence:
   - Update language provider
   - Fix i18n configuration
   - Update profile page integration
   
2. Test each change incrementally

3. Verify full application functionality after changes

4. Monitor for any performance impacts

This plan addresses the core issues preventing proper language switching and provides a clear path to implementation.
