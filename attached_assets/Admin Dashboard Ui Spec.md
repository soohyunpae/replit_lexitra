# Lexitra – Admin Tools UI Redesign Proposal

This document outlines the proposed redesign for the **Lexitra Admin Dashboard**, focusing on usability, clarity, and workflow efficiency. It consolidates all file processing and TM management actions into a unified tab + accordion structure within the Admin Dashboard view.

---

## 🧭 Navigation Structure (Sidebar)

**Keep:**
- Dashboard
- Projects
- Terminology Base
- Translation Memory (optional)

**Remove:**
- ❌ File Preprocessing (standalone item)
- ❌ Translation Memory (as standalone below Admin Dashboard)

---

## 🗂️ Admin Tools Main Layout

When a user clicks **Admin Tools**, the **right-side view** should display the following layout:

### ✅ Tab-Based Main Sections
- **TM Management** (default selected tab)
- **File Processing**

### ✅ Accordion-Style Tool Panels
Each tab contains its tools as collapsible/expandable sections.

---

## 📁 Tab: TM Management

> Manage Translation Memory (TM) assets, align files, clean duplicates.

Accordion Sections:

- **TM Upload**
  - Upload translation memory file (CSV, TMX, Excel)
  - Fields: source/target language, description

- **Bilingual Alignment**
  - Upload parallel source/target files to align
  - Output: downloadable CSV

- **TM Cleanup**
  - Deduplicate and normalize TM entries
  - Show summary of cleaned entries

---

## 📄 Tab: File Processing

> Convert or prepare files (PDFs, DOCX, etc.) before translation.

Accordion Sections:

- **PDF Processing**
  - Upload patent PDF → extract text
  - ✅ Preview text result
  - ✅ Download extracted file

- **File Format Conversion**
  - Input: PDF, DOCX, CSV, TXT, XLIFF
  - Output: selectable format (TXT, CSV, etc.)

---

## 🛠️ Design Principles

- ✅ **Unified workspace:** All admin tools in one dashboard.
- ✅ **Tab + accordion view:** No full page reloads.
- ✅ **Consistent UI:** Admin remains in same layout; clear return paths.
- ✅ **Avoid duplicate menu items**: Sidebar stays clean.

---

## 🚧 To Be Removed
- Remove the current separate pages for:
  - TM Upload (as standalone route)
  - PDF Processing (standalone route)
- Remove Text Extraction / Segment & Export items (under development).

---

## 📌 Notes
- Keep **Admin Tools** as the single entry point for all admin tools.
- TM Management should replace the term “Translation Memory” in the tabs.

---

This redesign streamlines the admin experience and prevents navigation disruptions caused by full-page transitions. It also reduces user confusion and enforces a modular layout for future tools.
