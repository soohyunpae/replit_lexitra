# Lexitra – Translation Input Preprocessing Specification

This document defines the unified preprocessing flow for handling various file types (PDF, TXT, DOCX, CSV, XLIFF) when creating new translation projects or translation memory (TM) entries in Lexitra.

---

## ✅ Purpose

- Enable users to upload diverse file formats as translation input
- Automatically extract and segment content into sentence-level Translation Units (TUs)
- Prepare content for either translation workflows (projects) or TM population

---

## 📂 Supported File Types & Handling

| File Type | Description | Preprocessing Notes |
|-----------|-------------|---------------------|
| `.pdf`    | Patent documents in PDF format | Special handling for structure, OCR (future) |
| `.txt`    | Clean plain text | Simple line/sentence segmentation |
| `.docx`   | Microsoft Word files | Extract paragraphs, preserve headings/sections |
| `.csv`    | Aligned bilingual pairs | Used directly for TM creation |
| `.xliff`  | CAT tool-compatible format | Parsed for direct TU ingestion |

---

## 🔁 Standard Preprocessing Flow (All Formats)

1. **File Upload**
   - User selects file during project creation
   - Optional metadata (project title, description)

2. **Text Extraction**
   - Format-specific parsing
   - Normalize line breaks and encoding

3. **Sentence Segmentation**
   - Auto-split paragraphs into sentences using NLP (e.g., spaCy)
   - Optional: retain section numbers (e.g., [0001], [0002])

4. **Preview & Confirmation**
   - Show user a preview (first 10 sentences)
   - User confirms before project is finalized

5. **TU Generation & Project Integration**
   - Store each segment as a TU
   - Language detection used to pre-fill source language
   - TM integration active for sentence reuse

---

## 📄 PDF-Specific Considerations

- PDF parser required (e.g., `pdf-parse`, `pdfjs`)
- Remove artifacts like page numbers, footers
- OCR support for scanned patents planned for v2+
- Bilingual alignment from two PDFs handled via admin-only workflow

---

## 🧠 Project Creation vs TM Population

| Use Case | Input | Result |
|----------|-------|--------|
| Project creation | Monolingual file | TUs created, ready for translation |
| TM upload | Aligned bilingual data (CSV/XLIFF) | Stored directly in TM DB |

---

## 🔐 Admin-Only Workflow – Bilingual TM Creation from PDF

### Overview

For cases where admins want to construct TM entries from bilingual patent files (e.g., KR and EN PDFs), Lexitra offers a semi-automated preprocessing flow.


### Workflow Steps

1. **Upload**
   - Korean and English PDFs uploaded together

2. **Automated Processing**
   - Extract text from both
   - Segment into sentences
   - Align by position
   - Generate `.csv` file (`source`, `target`)

3. **Review & Validation**
   - Admin reviews and edits the `.csv` if needed
   - Once validated, entries saved as TUs (`status: reviewed`)

4. **Post-Processing**
   - Option to link TM entries to a project
   - Retry alignment if needed

---

Let this document serve as the single source of truth for all input preprocessing tasks in Lexitra. If new file types or admin tools are introduced in the future, this document can be modularly extended.