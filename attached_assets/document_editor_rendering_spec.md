

# 📄 Document View Rendering Specification

This document outlines the updated rendering strategy for the Lexitra Document View editor. The goal is to preserve the internal segment-level structure while improving visual continuity and readability by grouping segments by paragraph (block) for display.

---

## ✅ Motivation

In the current editor implementation, each segment is rendered as a separate block element. This results in a disjointed appearance, especially when translating documents originally structured in paragraphs.

To support better contextual review and a more natural reading experience—particularly for non-translators such as patent attorneys—we propose rendering segments as grouped paragraphs (blocks), while still maintaining segment-level editability and status tracking.

---

## 🔧 Implementation Strategy

### 1. Internal Structure (No Change)
- Segments remain the fundamental unit for:
  - Translation
  - TM matching
  - Status tracking (MT, 100%, Fuzzy, Edited, Reviewed)
- Each segment should include a `paragraphId` or `blockId` to enable grouping.

### 2. Document View Rendering

| Aspect        | Strategy |
|---------------|----------|
| Grouping      | Segments are grouped by `paragraphId` and rendered together as a visual block |
| Layout        | Within each paragraph block, segments are displayed `inline` or with minimal spacing |
| Edit behavior | Each segment remains individually editable on click |
| Highlight     | When a segment is active, its background changes; others remain inline |
| Scroll sync   | Paragraph blocks can be aligned left/right for bilingual view as before |

### Example Pseudocode:

```tsx
{paragraphs.map(paragraph => (
  <div className="paragraph-block" key={paragraph.id}>
    {paragraph.segments.map(segment => (
      <span className="inline-segment" key={segment.id}>
        {editingId === segment.id ? (
          <textarea ... />
        ) : (
          <span onClick={...}>{segment.target}</span>
        )}
      </span>
    ))}
  </div>
))}
```

---

## ✅ Expected UX Improvements

- Translation is displayed in a format closer to the original document
- Easier to read and compare paragraphs side by side
- Encourages more holistic revision by reviewers
- Non-translator users feel more comfortable with the flow

---

## 📎 Notes

- This update is UI-only: segment-level logic remains untouched
- Paragraph grouping may be inferred from original file (e.g., `.docx`) or pre-processed on backend
- Consider fallback grouping if no `paragraphId` is available (e.g., every 3 segments)

This rendering update supports Lexitra's dual-mode user experience: robust for translators, intuitive for reviewers.