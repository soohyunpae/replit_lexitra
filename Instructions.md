
# UI Internationalization Implementation Analysis

## Current State
1. Translation files exist in `/client/public/locales/{en,ko}/translation.json`
2. Language switching functionality is implemented in `/client/src/hooks/use-language.tsx`
3. i18next is configured in `/client/src/i18n/index.ts`

## Missing Translations Analysis
Based on the webview logs, several translation keys are missing in the Korean locale:

1. Admin Section Keys:
- admin.apiKeys
- admin.defaultSourceLanguage
- admin.selectSourceLanguage
- admin.defaultTargetLanguage
- admin.selectTargetLanguage

2. Language Names:
- languages.korean
- languages.japanese
- languages.english
- languages.chinese

## Files Needing Translation Review

### Priority 1: Core Layout Components
1. `/client/src/components/layout/sidebar.tsx`
2. `/client/src/components/layout/header.tsx`
3. `/client/src/components/layout/right-panel.tsx`

### Priority 2: Page Components
1. `/client/src/pages/translation.tsx`
2. `/client/src/pages/profile.tsx`
3. `/client/src/pages/projects.tsx`
4. `/client/src/pages/glossaries.tsx`
5. `/client/src/pages/admin/admin-index.tsx`

### Priority 3: Translation Components
1. `/client/src/components/translation/doc-review-editor.tsx`
2. `/client/src/components/translation/editable-segment.tsx`
3. `/client/src/components/translation/side-panel.tsx`

## Implementation Plan

### 1. Fix Missing Translations

Add the missing translations to `/client/public/locales/ko/translation.json`:

```json
{
  "admin": {
    "apiKeys": "API 키",
    "defaultSourceLanguage": "기본 원본 언어",
    "selectSourceLanguage": "원본 언어 선택",
    "defaultTargetLanguage": "기본 대상 언어",
    "selectTargetLanguage": "대상 언어 선택"
  },
  "languages": {
    "korean": "한국어",
    "japanese": "일본어",
    "english": "영어",
    "chinese": "중국어"
  }
}
```

### 2. Implementation Steps

1. Audit all components:
   - Search for hardcoded text strings
   - Replace with `t()` function calls
   - Add corresponding translations to both EN and KO locale files

2. Common patterns to look for:
   - Button labels
   - Form labels
   - Error messages
   - Success messages
   - Placeholder text
   - Menu items
   - Headers/Titles

3. Testing:
   - Test language switching in all major components
   - Verify translations in both languages
   - Check for missing translations
   - Test fallback behavior

### 3. Best Practices to Follow

1. Use translation keys that follow a clear hierarchy:
   ```typescript
   // Good
   t('projects.actions.delete')
   
   // Avoid
   t('deleteProject')
   ```

2. Use interpolation for dynamic content:
   ```typescript
   t('projects.created', { name: projectName })
   ```

3. Always include both English and Korean translations when adding new UI text

4. Use the `Trans` component for complex translations with HTML:
   ```typescript
   <Trans i18nKey="welcome">
     Welcome to <strong>{{name}}</strong>
   </Trans>
   ```

## Success Criteria

1. No missing translation keys in console logs
2. All UI elements reflect the selected language
3. Smooth transition between languages
4. Proper fallback to English for any missing translations
5. Consistent translation key naming scheme

## Implementation Order

1. Fix currently identified missing translations
2. Audit and update layout components
3. Update page components
4. Update feature-specific components
5. Add comprehensive testing
6. Document any new translation keys

## Translation Coverage Check Script

Create a script to help identify untranslated strings:

```typescript
function checkTranslationCoverage(enTranslations: object, koTranslations: object, prefix = '') {
  const missing: string[] = [];
  
  Object.entries(enTranslations).forEach(([key, value]) => {
    const currentKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object') {
      missing.push(...checkTranslationCoverage(value, koTranslations[key] || {}, currentKey));
    } else if (!koTranslations[key]) {
      missing.push(currentKey);
    }
  });
  
  return missing;
}
```

## Next Steps

1. Apply the missing translations identified above
2. Run a full audit of all components to identify any additional untranslated text
3. Implement the translation coverage check script
4. Test the language switching functionality comprehensively
5. Document any new translation keys for future reference
