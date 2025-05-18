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

# File Upload Issue Analysis & Fix

## Issue
The file upload functionality in the project page's reference files section is not working when clicking the upload area. The issue appears to be related to missing file input reference handling.

## Problem Areas
1. Missing file input element reference connection
2. Incomplete click handler implementation
3. File input trigger not properly connected

## Solution Implementation

### 1. Fix File Input Reference

The current code has a fileInputRef defined but not properly connected to the file input element. We need to:

1. Ensure the file input ref is properly attached
2. Connect click handler to trigger file input
3. Handle file selection and upload

### 2. Code Changes Required

In `client/src/pages/project.tsx`, we need to:

1. Add hidden file input with ref
2. Connect drag & drop handlers
3. Implement file upload logic

### 3. Implementation Steps

1. Fix file input reference and click handler
2. Ensure proper file type validation
3. Implement upload mutation handler

## Testing Plan

1. Test click to upload functionality
2. Verify file selection works
3. Confirm successful upload to server
4. Validate file display after upload

The fix will be implemented by updating the project.tsx file to properly handle file input reference and upload functionality.
# Fixing Reviewed Ratio Display in Project Page

## Problem Analysis
The current implementation displays `36/36 (100%)` without properly calculating the actual Reviewed segments ratio. This needs to be changed to show the correct ratio of Reviewed segments only.

## Relevant Code Locations
1. Main display: `client/src/pages/project.tsx` line ~1175
2. Stats calculation: `client/src/pages/project.tsx` lines ~690-730
3. Progress bar component: `client/src/components/ui/combined-progress.tsx`

## Current Implementation Issues
1. The percentage calculation doesn't specifically focus on Reviewed status
2. The stats object structure combines different segment statuses
3. The display needs to be updated to show only Reviewed ratio

## Solution Plan
1. Update percentage calculation logic to focus on Reviewed segments
2. Modify the stats display to show:
   - Total segments count
   - Number of Reviewed segments
   - Percentage of Reviewed segments

## Implementation Details
The fix involves updating the segment stats calculation in project.tsx to properly calculate and display the Reviewed ratio. The key change is using `reviewedCount` from `statusCounts.Reviewed` instead of the total completion percentage.

## Testing Recommendations
1. Check the displayed ratio matches actual Reviewed segments count
2. Verify percentage updates when segments change status
3. Ensure consistent display across different file types and sizes

# Adding Authentication to Landing Page

## Current Issues
1. Landing page has no direct authentication functionality
2. "Dashboard" button does not handle authentication state
3. Missing proper navigation flow from landing to dashboard

## Related Files
- client/src/pages/landing.tsx
- client/src/hooks/use-auth.tsx 
- client/src/pages/auth-page.tsx

## Solution Plan

### 1. Update Landing Page
- Add authentication state check
- Modify "Dashboard" button behavior based on auth state
- Add login/register functionality
- Implement proper navigation

### 2. Required Changes
- Add auth hook usage in landing page
- Add auth-related UI components
- Update navigation logic
- Add proper routing

### 3. Implementation Steps
1. Update landing.tsx to use auth hook
2. Add authentication checks
3. Modify button behavior
4. Add proper navigation logic
5. Test user flow

### 4. Testing Plan
- Test unauthenticated user flow
- Test authenticated user flow
- Verify proper redirections
- Check error handling