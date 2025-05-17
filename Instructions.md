
# Account Menu & Settings Integration Plan

## Current State Analysis
- Account dropdown menu currently has 3 items: My Account, My Profile, and Logout
- Theme toggle is in header component
- No unified settings page exists
- Language pair preferences not centralized

## Required Changes
1. Modify sidebar.tsx to simplify dropdown menu
2. Update profile.tsx to include theme and language settings
3. Add language pair preference controls
4. Remove theme toggle from header

## Implementation Details

### 1. Dropdown Menu Changes (sidebar.tsx)
- Remove "My Profile" item
- Keep "My Account" and "Logout" only
- Update navigation to go to the unified settings page

### 2. Profile Page Updates (profile.tsx)
- Add theme toggle section
- Add language pair preference section
- Organize settings into logical groups using Card components
- Add save functionality for new settings

### 3. Code Changes Required

#### Files to Modify:
1. `client/src/components/layout/sidebar.tsx`
2. `client/src/pages/profile.tsx`
3. `client/src/hooks/use-theme.tsx` (possibly)

#### Integration Points:
- User preferences API endpoints
- Theme context/provider integration
- Language pair state management

## Testing Plan
1. Verify dropdown menu shows only required items
2. Confirm theme toggle works in new location
3. Test language pair preference saving
4. Check settings persistence after logout/login

## UI/UX Considerations
- Group related settings together
- Use clear, descriptive labels
- Provide immediate feedback on changes
- Maintain consistent styling with existing UI

## Implementation Plan

1. Update sidebar dropdown first
2. Expand profile page layout
3. Add new settings components
4. Integrate state management
5. Test thoroughly

This change will create a more streamlined and intuitive user experience by consolidating all user-specific settings in one location.
