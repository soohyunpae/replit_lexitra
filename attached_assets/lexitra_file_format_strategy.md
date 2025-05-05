# Lexitra – File Format Support Strategy

This document outlines the recommended file formats that Lexitra should support for both upload (import) and download (export) operations, focusing on practical use cases in patent translation workflows. It also includes basic preprocessing requirements such as PDF to text conversion.

---

## ✅ Supported Input File Formats (Import)

| Format   | Purpose                                      | Status       |
|----------|----------------------------------------------|--------------|
| `.txt`   | Simple text uploads, quick tests             | ✅ Supported |
| `.docx`  | Most common format for patent specifications | ✅ Supported |
| `.csv`   | TM / TB manual registration and imports      | ✅ Supported |
| `.xliff` | Interoperability with CAT tools              | ✅ Supported |
| `.pdf`   | Patent documents received in PDF format      | ✅ Supported via preprocessing |

### 📌 Note on PDF Support
- PDF files will be processed through an internal **PDF → structured text** pipeline
- Sentence segmentation and TU creation will follow
- Only **text-based PDFs** are supported initially (OCR excluded for now)

---

## ✅ Supported Output File Formats (Export)

| Format   | Purpose                                        | Behavior                          |
|----------|------------------------------------------------|-----------------------------------|
| `.txt`   | Simple exports of translated content            | Available for all file types      |
| `.docx`  | Final deliverable for general users             | Matched to original input         |
| `.csv`   | Exporting TU/TM content for external use       | TU metadata included              |
| `.xliff` | Round-trip CAT tool support                    | For projects originally uploaded as `.xliff` or upon request |

---

## 🧩 Format Mapping Example

| Uploaded As | Export Options Available             |
|-------------|--------------------------------------|
| `.txt`      | `.txt`, `.csv`, `.xliff`             |
| `.docx`     | `.docx`, `.csv`, `.xliff`            |
| `.xliff`    | `.xliff`, `.csv`                     |
| `.pdf`      | `.docx`, `.csv`, `.xliff` (after preprocessing) |
| `.csv`      | `.csv`, `.txt` (converted content)   |

---

## 🔄 Future Considerations
- `.tmx` for TM import/export compatibility with other systems
- `.tbx` for termbase exchange
- OCR-based `.pdf` support (e.g., scanned patents)

This strategy ensures Lexitra is compatible with both lightweight and enterprise translation workflows, balancing usability and interoperability.