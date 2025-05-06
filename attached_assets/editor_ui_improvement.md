# Lexitra – File Editor UI Improvements

This document outlines proposed improvements to the Lexitra file editor interface to streamline translation workflows, improve user interaction, and consolidate reference materials.

---

## ✅ Editor Structure: Simplification & Flexibility

### 🔹 Current Issues

* Translation target segments are not directly editable unless entering a separate editing mode ("editing segment" popup)
* GPT translation must be triggered segment-by-segment
* TM/TB/Comment/History data appear only within the popup – not visible during standard editing

### 🔹 Proposed Enhancements

#### 1. Inline Editing

* Make all target segments **directly editable in the editor view**
* Eliminate the need to click an icon to enter "editing mode"

#### 2. Batch GPT Translation

* Add **"Translate File with GPT"** option at the top (or floating toolbar) for batch pretranslation
* Optionally allow batch GPT for selected segments

#### 3. Persistent Side Panel for References

* Fixed right-side panel with 4 tabs:

| Tab            | Function                                                                   |
| -------------- | -------------------------------------------------------------------------- |
| **TM Matches** | Auto-display TM matches for selected segment from project-assigned TM only |
| **Glossary**   | Show glossary matches from assigned TBs                                    |
| **Comments**   | Add/view segment-specific notes                                            |
| **History**    | View version history of the segment                                        |

> 🔄 Content updates automatically based on currently selected segment.

> 🔍 TM & TB searches are scoped **only to resources assigned to the current project**.

#### 4. Optional Enhancements

* Auto-highlight matched terms from TB in target input box
* Indicate TM match % (e.g., 100%, Fuzzy) inline next to segments

---

## 🧠 Rationale

* Removes friction by avoiding separate popup workflows
* Aligns with UX expectations from tools like Smartling or Phrase
* Improves visibility and accessibility of TM/TB while translating

---

## 🆕 Summary of Changes

| Component  | Change                                                      |
| ---------- | ----------------------------------------------------------- |
| Editor     | Inline editable target segments                             |
| GPT        | Segment-level buttons removed, replaced with global trigger |
| References | Side panel with TM/TB/Comments/History tabs                 |
| Popup      | "Editing Segment" modal removed                             |

This new layout allows users to translate more fluidly while staying context-aware.
