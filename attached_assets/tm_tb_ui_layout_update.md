# Lexitra – TM / TB UI & Dashboard Improvements

This document outlines the proposed improvements to the Translation Memory (TM) and Termbase (TB) pages in Lexitra, supporting multiple resources and improving scalability and user interaction.

---

## ✅ TM / TB Page Restructuring

### 1. Support for Multiple TM / TB Resources
- Shift from a single-TM/single-TB model to a **multi-resource layout**
- Each TM or TB is a separate unit (e.g., database entry or file group)
- For testing and demonstration, include 2–3 **sample TM and TB resources** (e.g., “Sample_TB_Electronics”, “Sample_TM_Legal”) to illustrate how the UI handles multiple resources.

### 2. Page Layout Proposal

#### 🔹 Left Panel: Resource List
- Display TM or TB entries in a list or sidebar
  - Show: name, created date, last modified
  - Click to load detailed entries on the right

#### 🔹 Right Panel: Resource Details
- **Search** within the selected TM/TB
- **Filters**:
  - For TM: by status (Approved, MT, Fuzzy, etc.)
  - For TB: by category, domain, tags
- **Edit Functions**: add, modify, or delete entries

### Optional Enhancements
- Tagging or grouping TBs by domain/project (e.g., Legal, Medical)
- Pagination or lazy-loading for large TMs/TBs

---


These changes aim to scale the interface for real-world workflows while keeping the UX intuitive.

### 3. UI Refinement from Screenshots (2025-05-06)

Based on the latest visual review of current TM and TB pages, the following structural UI improvements are proposed:

#### 🧩 Proposed Adjustments

- **TM/TB Selection Panel**
  - Introduce a left sidebar or top dropdown listing all available TM/TB resources.
  - Clicking a resource loads its contents into the main view.
  - Each resource item shows: name, created/modified date, entry count.

- **Dynamic Header Title**
  - Replace the static "Terminology Base" or "Translation Memory Database" with the selected TM/TB name to provide clarity.

- **Improved Filtering UX**
  - Add spacing, labels, and icons to filter controls.
  - Group filters (language, status, domain, etc.) more clearly.

- **TM/TB Name Display in Entry Table**
  - For each row in the table, show which TM or TB it belongs to (useful when switching quickly between resources or viewing combined results).

- **Layout Clarification**
  - Refactor header and left navigation alignment to avoid duplication/confusion (e.g. avoid showing same section title in both sidebar and main header).
  - Ensure persistent tab-based layout under Admin Tools rather than full-page switches.

#### 🧠 Visual Structure Example

```
[ TM or TB Resource List ]
└─ e.g., Default TM, Project A TB

[ Main Panel ]
- Title: "Project A – Translation Memory"
- Filters: [Language], [Status], [Search Term]
- Entry Table:
    | Source | Target | Status | Added | Resource Name | Actions |
```

These refinements will make TM/TB pages scalable and better aligned with translator workflows.