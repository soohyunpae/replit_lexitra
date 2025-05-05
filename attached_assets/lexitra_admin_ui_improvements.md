# 📐 Lexitra Admin Dashboard UI Improvements

_Last updated: 2025-05-05_

This document outlines proposed improvements for the Lexitra Admin Dashboard interface, focusing on the unification and enhancement of Translation Memory and File Processing features.

---

## ✅ Problem Summary

- The current layout displays **Translation Memory** and **File Processing** as separate cards, leading to visual disconnection and limited scalability.
- Both `PDF Processing` and `File Format Conversion` are split into different pages, even though both serve the same purpose: **file preprocessing for translation**.
- As features grow, the current structure could cause navigation confusion and reduce efficiency for users.

---

## 💡 Proposed Improvements

### 1. Replace Cards with Tabs or Accordions

- **Tabs UI**: Create top-level tabs such as `Translation Memory` and `File Processing` for logical grouping.
- **Accordion UI**: Alternatively, use collapsible sections for each group for better scalability on one page.

---

### 2. Merge PDF & File Conversion into One Page

Combine:
- `PDF Processing` (text extraction from PDF)
- `File Format Conversion` (.docx to .txt, .hwp to PDF, etc.)

**New Page Layout Example:**

```plaintext
File Preprocessing
├── Upload File (.pdf, .docx, .hwp)
├── Text Extraction (optional OCR support)
├── Format Conversion Options (.txt, .csv, .xliff)
└── Download or Send to TM Alignment
```

- Add **preview** or **status indicator** of converted content
- Max file size and supported file types should be clearly shown
- Add **text preview** of conversion results, and allow **download after conversion**

---

### 3. Unified File Preprocessing Flow (Overview)

```plaintext
Admin Dashboard
 ├── Translation Memory
 │   ├── TM Upload
 │   ├── Bilingual Alignment
 │   └── TM Cleanup
 └── File Preprocessing
     ├── Upload & Extract (.pdf, .docx, .hwp)
     ├── Clean & Segment (if needed)
     ├── Format Conversion (.txt, .csv, .xliff)
     └── Export for Review or TM
```

---

## 🔧 Implementation Notes

- Clearly separate **file types supported** per feature
- Show **processing state** for large files (e.g. spinner or status tag)
- Ensure each section has **brief descriptions** and tooltips

---

## 📌 Summary

This restructure helps:
- Simplify the user experience
- Reduce fragmentation across pages

