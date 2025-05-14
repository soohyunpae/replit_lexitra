# React Query Migration Plan


This document outlines the key files and architectural patterns required to fully migrate the Lexitra project to React Query for state and server data management. The goal is to progressively move toward a modular, maintainable architecture while enhancing server state handling.


---

## 1. Core Files to Update

### Hooks
- `useSegments.tsx`: Logic to fetch segments
- `useSegmentContext.tsx`: Logic to manage segment states
- `useEditingState.ts`: Logic to manage editing states

These files currently rely on Context API and useState. They need to be refactored to use `useQuery`, `useMutation`, and query cache instead.

### Segment Components
- `editable-segment.tsx`: The UI component for editable segments
- `doc-segment-authenticated.tsx`: Segment component used in Document View

Both components should follow the same data-fetching and mutation pattern to maintain consistency.

### API Layer
- `client/src/lib/api.ts`: Abstract API functions should be refactored to support use in `useQuery` and `useMutation` hooks.

### Directory Structure (Recommended)

```
/hooks
  /queries/
    useProjectQuery.ts
    useFileQuery.ts
    useTMQuery.ts
    useGlossaryQuery.ts
  /mutations/
    useSegmentMutation.ts
    useProjectMutation.ts
  /states/
    useEditingState.ts
    useUIState.ts

/components
  /translation/
    /editors/
      BaseEditor.tsx
      DocumentEditor.tsx
      SegmentEditor.tsx
    /segments/
      SegmentList.tsx
      SegmentItem.tsx
    /tm/
      TMMatches.tsx
      TMSuggestion.tsx
    /glossary/
      GlossaryTerms.tsx
```

---

## 2. Migration Patterns

### ✅ Data Fetching
Convert all `fetch` or `apiRequest` calls to `useQuery`.

### ✅ Data Updating
Wrap all update logic in `useMutation`.

### ✅ Cache Management
Use consistent `queryKey` naming conventions (e.g., `['segments', fileId]`) for cache invalidation and updates.

### ✅ State Management
Replace local state (useState) and Context API with React Query for server state.

---

## 2.5. Suggested Refactoring Steps

1. Migrate all API fetch logic into `/hooks/queries/` using `useQuery`.
2. Move all mutation logic (e.g., segment edits, project actions) into `/hooks/mutations/` using `useMutation`.
3. Refactor large components like `doc-review-editor.tsx` into composable units (`SegmentRow`, `BaseEditor`, etc.).
4. Replace Context-based state logic with React Query caching + local state via `/hooks/states/`.
5. Gradually update all screens (`projects.tsx`, `project.tsx`, `translation.tsx`) to consume new hooks.

---

## 3. Benefits

- Better separation of client vs server state
- Fewer re-renders and performance gains
- Cleaner and more declarative code
- Centralized and consistent data access across views (e.g., Segment Editor and Document View)

---

This unified plan ensures the Lexitra app adopts React Query’s full potential for scalable and maintainable data flow. By combining modular directory layout, consistent data access patterns, and declarative component design, we can support long-term growth and simplify developer onboarding.

---

## 4. API Examples

### `/api/projects`
```json
[
  {
    "id": 1,
    "name": "My Project",
    "files": [{ "id": 101, "name": "intro.txt" }]
  }
]
```

### `/api/projects/1/stats`
```json
{
  "wordCount": 540,
  "translatedPercentage": 87.3,
  "reviewedPercentage": 45.5,
  "statusCounts": {
    "100%": 120,
    "Fuzzy": 34,
    "MT": 112,
    "Reviewed": 84,
    "Edited": 15,
    "Rejected": 3
  },
  "totalSegments": 368
}
```

### `/api/segments?fileId=101`
```json
[
  {
    "id": 1001,
    "source": "This is a test segment.",
    "target": "이것은 테스트 문장입니다.",
    "status": "MT"
  }
]
```

---

## 5. Query Key Strategy

```ts
const queryKeys = {
  projects: ['projects'] as const,
  project: (id: number) => ['projects', id] as const,
  segments: (fileId: number) => ['segments', fileId] as const,
  tm: ['tm'] as const,
  glossary: ['glossary'] as const
};
```

This key system ensures consistent invalidation and cache access across hooks and views.

---

## 6. Mutation & Optimistic Strategy

- Extract mutation logic into `/hooks/mutations/`:
  - `useSegmentMutation.ts`
  - `useProjectMutation.ts`
  - `useTMMutation.ts`

- Apply optimistic update when updating segments:
  - `onMutate`, `onSuccess`, `onError` can be configured per mutation

---

## 7. Cache & Error Handling

- Set `staleTime`, `cacheTime`, `refetchOnWindowFocus` as needed per query
- Add global `ErrorBoundary` for full-page error fallback
- Handle mutation errors with `onError` callback

---

## 8. Replit Review Notes

- The phased plan is clear and modular
- API interface examples help ensure schema clarity
- Directory structure is maintainable and scalable
- Replit recommends query key constant definition for stability
- Suggest referring to `useSegments.tsx` as baseline React Query usage pattern