# Lexitra i18n Implementation Plan

## Current Status
- Basic i18n setup exists with React-i18next
- Translation files present but not fully utilized 
- Language switching feature partially implemented but not working

## Implementation Plan

### 1. Fix Language Provider Integration
- Add LanguageProvider to App.tsx wrapper to fix context errors
- Ensure provider properly initializes with saved language preference
- Hook up language switching in profile page preferences

### 2. Translation Management
- Utilize existing `/client/public/locales/{en,ko}/translation.json` files
- Add missing translations and organize hierarchically
- No auto-translation - all strings manually managed

### 3. User Interface
- Add language selection in Profile page preferences
- Store user language preference in localStorage
- Apply language changes immediately across app

### 4. Testing
- Verify language switching works
- Confirm translations load correctly
- Check persistence of language selection

## Components Required

1. Language Provider (src/hooks/use-language.tsx)
2. Profile Page Language Settings (src/pages/profile.tsx)
3. Translation Files (public/locales/{en,ko}/translation.json)

## Implementation Notes

The system will:
- Use manual translations only
- Persist language preference
- Support English and Korean UI
- Allow switching via profile preferences

### 5. File Changes Required

1. New Files:
- client/src/hooks/use-language.tsx

2. Modified Files:
- client/src/App.tsx
- client/src/pages/profile.tsx
- client/public/locales/en/translation.json
- client/public/locales/ko/translation.json

### 6. Implementation Order

1. Setup Language Provider
2. Implement language switching in profile preferences
3. Update translation files
4. Test language switching and persistence

### 7. Testing Checklist

- Language switching works correctly
- All UI elements are translated
- No missing translations
- Proper fallback to default language
- Language persistence between sessions
- Proper handling of dynamic content

## Dependencies

- `react-i18next`
- `i18next`
- `i18next-http-backend`