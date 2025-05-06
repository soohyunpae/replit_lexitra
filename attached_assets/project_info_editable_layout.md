# Lexitra – Project Info & Settings UI Structure

This document outlines the proposed restructuring of the project details page in Lexitra, separating fixed (non-editable) and editable project fields for clarity and improved user experience.

---

## ✅ UI Design Proposal

### 0. Project Header Layout

The project header should clearly display key identifiers and status at a glance:

- **Project ID**: Shown to the left of the project title in a small, neutral text format (e.g., `#25`)
- **Project Title**: Main identifier, centrally placed
- **Project Status Badge**: Displayed to the right of the title using color-coded labels:
  - 🟡 Unclaimed
  - 🟢 Claimed
  - 🔵 In Progress
  - ⚪ Completed

The status badge should update automatically based on actions like *Claim*, *Release*, *Complete*, or *Reopen*. This improves readability and reduces ambiguity in multi-project environments.

### 1. Split Project Details into Two Cards

#### 🔒 **Project Info** (Non-editable)

* Project Name
* Language Pair (e.g., KO → EN)
* Created Date
* Last Updated

> These fields are fixed upon project creation and are read-only.

#### ⚙️ **Project Settings** (Editable)

* **Deadline**: Date picker
* **Glossary (TB)**: Dropdown list of available TBs
* **Translation Memory (TM)**: Dropdown list of available TMs
* **Reference Files**: Upload component (drag & drop or button)
* **Notes**: Text input area

> These can be edited post-creation by project owner or admin.

---

## ✅ Interaction Design Considerations

### Option A – Two Card Layout (Recommended)

* Separate visual boxes for Info vs. Settings
* Clearly labeled sections: *Project Info* and *Project Settings*
* Edit fields are immediately visible and intuitive

### Option B – Single Card with Section Headings

* Horizontal rule and bold headings to divide info
* Fixed fields shown at top, editable below
* May reduce layout space but can be less readable with many fields

### Option C – Toggle Edit Mode (Optional)

* ‘Edit’ button toggles editable fields
* Pencil ✏️ icon on editable lines
* Slightly heavier UX but visually clean

---

## 🧠 Rationale

* Avoid confusion by visually and functionally separating fixed vs. editable fields
* Ensure users can manage important project metadata (deadline, resources, references) without re-creating a project
* Support role-based access if needed (e.g., only Admins can change TM/TB)

---

This structure enhances user clarity and prepares Lexitra for more scalable and complex workflows.
