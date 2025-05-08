# Lexitra Translation Editor – May 2025 UI Fixes & Enhancements Summary

This document outlines key UX improvements and bug fixes proposed based on current issues observed in the Lexitra Translation Editor as of May 2025. The goal is to enhance clarity, usability, and alignment with our TM storage and review workflows.

---

## 🛠️ Segment Status & Origin Handling

### 🔧 Fix: Confusing "Modified" Badge
- The system currently adds a `Modified` badge to segments after user edits.
- This is **redundant** when origin is already updated to `HT` (Human Translation).
- ✅ **Action**: Remove the `Modified` badge entirely. The presence of `HT` is sufficient to indicate human editing.

---

## ✍️ In-Editor Translation Behavior

### 🔧 Fix: Editing Requires Icon Click
- Currently, users must click an icon to enter an "editing segment" modal.
- ✅ **Action**: Allow **direct inline editing** of the target segment in the editor panel.
- Optional advanced tools (e.g., comment, history) can still open in the right-hand side panel.

---

## 💬 Comments Panel

### 🔧 Fix: Cannot Add Comments
- The Comments tab in the right-hand panel lacks the ability to add comments.
- ✅ **Action**: Add inline comment input for each segment in the Comments tab.
- Optional: support Markdown or simple rich text (e.g., bold, bullet points).

---

## 🧠 History Tab

### 🔧 Fix: No Revision History Displayed
- Currently, History tab does not show how the segment has changed.
- ✅ **Action**: Display segment-level history **only when "Save" is clicked**.
  - Each saved revision = one historical version.
  - Display fields:
    - Date/time of save
    - Origin before/after
    - Status before/after
    - Side-by-side diff view of translation text
- ❌ Do NOT log every keystroke or draft—only save-time snapshots.
- Segments marked as `Rejected` are treated as finalized but are **not** stored in the TM.

---

## 🔍 TM / Glossary Tabs (Right Panel)

### 🔧 Fix: TM/Glossary Search Not Working
- TM and Glossary searches yield no results even when matches exist.
- ✅ **Action**: Ensure search bar is functional.
  - TM: search matches within current project's assigned TM only
  - Glossary: search terms in assigned glossary only

### 🧼 UI Refinement: TM Matches Display
- Current display includes:
  - Match % (✅ keep this)
  - Language pair (❌ remove this, redundant)
  - "Use Translation" button interferes with layout.
- ✅ **Action**: 
  - Move “Use Translation” button **below** the match result, not beside it.
  - Improve spacing and padding for legibility.

---

## ✅ Maintain: Key Features

These should remain unchanged:
- Right-hand panel tabs: TM, **Glossary** (was Terms), Comments, History

---

## 📊 Segment Progress Bar (Updated Behavior)

- The progress bar at the top of the file now reflects the number of segments in each status: Draft / Reviewed / Rejected.
- This replaces the previous GPT translation progress indicator.
- ✅ The progress bar updates only when the user clicks the "Save" button.

---

## 📌 Project Completion Logic

- A project can only be marked as **Complete** if **all segments are either `Reviewed` or `Rejected`**.
- Segments in `Draft` status will block completion.

---

These updates aim to streamline the editor interface, reduce redundant UI elements, and bring segment handling in line with the overall TM strategy.