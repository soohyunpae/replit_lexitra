

# 📐 Segment Layout Sync & Mobile Responsiveness Specification

This document outlines the visual alignment strategy for the bilingual segment editor (Doc Review Editor) and the responsive layout adaptation for mobile and small screens.

---

## 1. 🎯 Layout Sync Strategy (Left ↔ Right)

### Problem
When the source (left) and target (right) segments vary in length or structure, maintaining visual alignment between corresponding segments becomes challenging.

### Goals
- Ensure each source and target segment line up correctly
- Maintain smooth scrolling and editing experience
- Avoid jitter or misalignment during editing mode toggles

### Approach Options

| Strategy                 | Description                                                                                 | Chosen? |
|--------------------------|---------------------------------------------------------------------------------------------|---------|
| `Scroll Sync`            | Synchronize vertical scroll between panels using JS                                         | ✅ Preferred |
| `Segment Anchor Mapping` | Assign anchor IDs per segment (`seg-001`, `seg-002`, etc.) and use `scrollIntoView` to sync | ✅ Use for click focus |
| `Equal Height Boxes`     | Set minHeight based on max(height of left, height of right) for each pair                   | ⚠️ Risky with dynamic content |
| `Virtualization`         | Only render visible segments, ensure sync on index                                          | Considered later (perf phase) |

---

## 2. 📱 Mobile Responsiveness Strategy

### Problem
Side-by-side layout does not work well on narrow viewports (e.g., smartphones, tablets in portrait).

### Goals
- Maintain usability and readability on small screens
- Allow editing flow without losing source context

### Behavior by Viewport Width

| Screen Width | Layout Behavior |
|--------------|-----------------|
| `≥ 768px`    | Side-by-side layout with scroll sync |
| `< 768px`    | Vertical stack: Source on top, Target below |
| `< 480px`    | Accordion-style: Show only target, tap to reveal source in popup/modal |

### Additional Features
- Option to toggle source visibility (e.g., “Show Original”)
- Tap to edit → full-width input field
- Source highlight behavior remains consistent in all views

---

## 3. 🧪 Future Considerations
- Add smooth transitions (`transition-height`, `auto`) to preserve layout
- Consider using `react-virtualized` or `react-window` when document size exceeds 100 segments

---

## 📎 Notes
- This spec is written to support Replit’s upcoming implementation of the document-style review editor
- Once confirmed, it can be implemented in conjunction with the core editor layout and `useEditingState`