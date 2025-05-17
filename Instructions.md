
# UI Simplification Plan

## Current Issues and Goals
1. Remove dark/light mode toggle from header
2. Move account icon to bottom of sidebar 
3. Remove header entirely

## Analysis
After reviewing the codebase:

- Header component is in `client/src/components/layout/header.tsx`
- Sidebar component is in `client/src/components/layout/sidebar.tsx`
- Main layout is in `client/src/components/layout/main-layout.tsx`

The changes will require:
1. Moving user account UI from header to sidebar bottom
2. Removing theme toggle
3. Restructuring layout to remove header

## Implementation Plan

1. Update Sidebar:
   - Add user account section at bottom
   - Use existing auth context and user info
   - Maintain dropdown functionality

2. Update MainLayout:
   - Remove header component
   - Adjust layout structure

3. Test Impacts:
   - Verify auth functionality remains intact
   - Ensure navigation still works
   - Check mobile responsiveness
