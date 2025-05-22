# Side Panel Search Functionality Fix

## Problem Analysis
The TM and Glossary search functionality in the side panel appears to be not working. After reviewing the code in `client/src/components/translation/side-panel.tsx`, I found several issues:

1. **TM Search Issues:**
- The `searchGlobalTM` function is only triggered when typing, but not handling the empty query state correctly
- Global TM results are cleared when switching tabs but not restored when returning
- Search state management needs improvement

2. **Glossary Search Issues:**
- The `searchGlossaryTerms` function is not properly integrated with the UI state
- Search results clearing/restoration behavior needs fixing
- Missing error handling for search failures

## Solution Plan

### 1. TM Search Fix
- Update the search state management
- Improve empty query handling
- Fix results display logic
- Add proper loading states

### 2. Glossary Search Fix  
- Implement proper search results management
- Fix state handling for empty queries
- Add error handling
- Improve loading states

## Implementation Steps

1. Modify `side-panel.tsx`:
- Update search state management
- Fix search trigger logic
- Improve results display
- Add proper error handling

2. Update search functions:
- Enhance TM search functionality
- Fix Glossary search implementation
- Add proper loading states
- Improve error handling

3. Testing:
- Test empty query handling
- Verify search results display
- Check error states
- Validate loading indicators

