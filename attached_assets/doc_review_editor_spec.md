# 📄 Doc Review Editor – Functional Specification

## 🧭 Overview
This component extends Lexitra’s existing segment-based editor structure (`app/editor/page.tsx`) by introducing a document-style, side-by-side bilingual review interface for non-expert users. The goal is to provide a more intuitive and familiar editing experience that resembles working in Microsoft Word.

In this mode, users can read the full document flow while reviewing machine-translated output, and click on any translated segment to edit it in place. Each segment is individually editable while preserving the original layout context.

---

## 🔧 Implementation Summary

### 🔢 Data Format
This view uses the same data as the segment editor: from the `TranslationUnit` table or `/api/initialize` endpoint.

```json
[
  {
    "id": "seg-001",
    "source": "The invention relates to...",
    "target": "이 발명은 …",
    "status": "MT"
  }
]
```

---

## 🖥️ UI Layout – Side-by-Side Editing View

```tsx
<div className="editor-grid">
  <div className="left-panel">
    {segments.map(seg => (
      <div className="segment" key={seg.id} id={`src-${seg.id}`}>
        {seg.source}
      </div>
    ))}
  </div>

  <div className="right-panel">
    {segments.map(seg => (
      <div className="segment" key={seg.id}>
        {editingId === seg.id ? (
          <textarea
            value={editedValue}
            onChange={...}
            onBlur={...}
            autoFocus
          />
        ) : (
          <div onClick={() => setEditingId(seg.id)}>
            {seg.target}
          </div>
        )}
      </div>
    ))}
  </div>
</div>
```

---

## ✨ Interaction Behavior

| Action            | Description                                     |
|-------------------|-------------------------------------------------|
| Click translation | Activates the selected segment for editing      |
| Highlight source  | Highlights the corresponding source segment     |
| Blur or save      | Saves changes and exits editing mode            |
| State handling    | Controlled via `editingId`, `editedValue`, etc. |

---

## 🎨 Styling & Transitions
- Use smooth CSS transitions (`transition-opacity`, `fade`, `ring`, etc.)
- Tailwind CSS utilities encouraged for styling consistency

---

## 🧱 Integration Approach

- Can be implemented inside `app/editor/page.tsx` or as a new file such as `doc_mode.tsx`
- Route mode logic using query param or session storage

```tsx
const mode = searchParams.get("mode") ?? "segment";
return mode === "doc" ? <DocReviewEditor /> : <SegmentEditor />;
```

- Reuse existing TM save/update API (`/api/update_tm`)

---

## ✅ Expected Benefits
- Allows non-experts to review translations naturally, like in a Word document
- Easier to detect contextual errors and omissions
- Fully compatible with Lexitra's TM data and workflow

---

## 🗂️ Suggested Component Breakdown

| Component             | Description                | Suggested Path                                     |
|-----------------------|----------------------------|----------------------------------------------------|
| `DocReviewEditor.tsx` | Main editor layout         | `src/components/translation/doc-review-editor.tsx` |
| `DocSegment.tsx`      | Editable translation block | `src/components/translation/doc-segment.tsx`       |
| `useEditingState.ts`  | Local editing state hook   | `src/hooks/useEditingState.ts`                     |

> ⚠️ Note: These filenames and paths are suggestions based on current assumptions. Please adjust them to match the actual directory structure or naming conventions used in the project.

---

## 📎 Notes
- Start with a minimal MVP and extend features iteratively
- Future enhancements could include paragraph-based grouping, inline comments, or side annotations