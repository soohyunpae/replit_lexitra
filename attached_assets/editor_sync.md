

# Segment Update Sync: Analysis & Strategy Comparison

This document first analyzes key syncing issues in Lexitra’s editors, then compares two client-side state management approaches and recommends a path forward.

---

## 🧐 Problem Analysis

### 1. Segment Editor: Keystroke Delay  
- **Symptom**: Fast typing (“natural”) appears as “natrua” — the textarea value lags behind the user’s keystrokes.  
- **Cause**: A single debounced function delays both the UI state update and the API call. The debounced handler wraps `setValue`, so keystroke reflections are delayed by the debounce interval.  
- **Fix**: Separate concerns—call `setValue()` immediately on each `onChange`, and debounce only the API/save invocation.

### 2. Document View: Status Toggle Not Reflecting  
- **Symptom**: Clicking the “mark reviewed” button fires the PATCH and closes the mini-editor, but the green “Reviewed” badge and styling do not update until a page refresh.  
- **Cause**: Document View consumes a local snapshot of segments (via props or context) and does not re-fetch or re-read the updated data after mutation. There is no cache invalidation or subscription in place.  
- **Fix**: After toggling status, either call `queryClient.invalidateQueries(["segments", fileId])` so `useQuery` refetches, or ensure the shared context is updated and Document View reads from that live context on every render.

---

# Segment Update Sync Strategy Comparison

This section compares two client-side state management approaches for synchronizing segment edits immediately in the UI, and recommends a path forward for Lexitra.

---

## 1. React Query Cache Invalidation + useQuery

### Pros
- **Automatic consistency**  
  Invalidating the query key (e.g. `["segments", fileId]`) causes **all** components using `useQuery` to refetch updated data from the server.
- **Minimal boilerplate**  
  No manual `setState` or callback dispatch needed—just one query key and React Query handles stale/fetch logic.
- **High extensibility**  
  Ideal for multi-tab, multi-view scenarios, pagination, filters, and future real-time collaboration layers.

### Cons
- **Initial refactor overhead**  
  Requires converting existing `useState` stores to `useQuery` calls.
- **Learning curve**  
  Must adopt React Query patterns (`isLoading`, `error`, query options).

---

## 2. Context-driven Manual Updates

### Pros
- **Quick to implement**  
  Continue using `useSegmentContext` and simply invoke `onSegmentUpdate(updatedSegment)` to update local state immediately.
- **Instant UI feedback**  
  No network round-trip needed for UI to reflect a change after a successful API call.

### Cons
- **Scattered logic**  
  Mixing Context + manual callbacks can lead to duplication if multiple views/components need the same update logic.
- **Limited scalability**  
  Each new view or mode must manually subscribe and update the context, adding maintenance overhead.

---

## Recommendation

> **For Lexitra’s long-term maintainability and multi-view needs, we recommend React Query (Option 1).**  
> Although it requires an initial migration, it centralizes state, ensures automatic refetch on invalidate, and seamlessly supports future extensions (pagination, filters, real-time sync).  
>
> If a faster, MVP-style rollout is needed first, use the Context-driven approach (Option 2) and plan to migrate to React Query in the next iteration.

---

*Document last updated: [date]*