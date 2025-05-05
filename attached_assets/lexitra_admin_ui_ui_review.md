# Lexitra Admin UI Review – File Preprocessing Section

This document summarizes the review feedback and required changes for the **Admin Dashboard > File Preprocessing** section in Lexitra.

---

## ✅ What’s Working

- Navigation and tab-based layout is functioning.
- Major sections and tools (PDF Processing, File Format Conversion) are present.
- Sidebar access to "Admin Dashboard", "File Preprocessing", and "Translation Memory" is available.

---

## 🛠️ Issues Found

### 1. ❗️Duplicate Section

**Problem:**  
"File Preprocessing Hub" appears twice — once in the upper main section and again at the bottom.

**Fix:**  
Remove the **duplicate 'File Preprocessing Hub'** section at the bottom of the page.

---

### 2. ❗️Missing Preview and Download Options

**Problem:**  
PDF/Text conversion tools do not show output preview or export options after processing.

**Fix:**  
Add support for:
- ✅ Text preview of processed file content (e.g., scrollable box)
- ✅ Download converted file (e.g., `.txt`, `.csv`)

---

### 3. ❗️Unnecessary Sidebar Items

**Problem:**  
"File Preprocessing" and "Translation Memory" are available as standalone items in the sidebar, but their content is already accessible through the Admin Dashboard.

**Fix:**  
Remove the "File Preprocessing" and "Translation Memory" items from the sidebar to streamline navigation and avoid duplication.

---

## 🧩 Summary of Required Changes

| Area                  | Issue                            | Action Needed                                                   |
|-----------------------|----------------------------------|----------------------------------------------------------------|
| Layout                | Duplicate section                | Remove second "File Preprocessing Hub"                         |
| File Processing Tools | No output feedback after convert | Add preview + download after processing completes              |
| Sidebar Navigation    | Unnecessary sidebar items         | Remove "File Preprocessing" and "Translation Memory" from sidebar |

---

## 🔁 Additional Suggestions (Optional)

- Use card grid view or accordion layout to improve visual grouping.
- Consider merging PDF Processing + Format Conversion into a single view if user flow overlaps.

---

## 🔄 Further Required Changes (May 5 Update)

### 1. ❌ Remove “Segment & Export” and “Text Extraction” Tabs

**Problem:**  
These features are not ready and currently appear with “개발 중” (under development) indicators.

**Fix:**  
Remove these components from the File Preprocessing view to prevent user confusion.

---

### 2. 🧭 Navigation Experience (Tab Layout)

**Problem:**  
When a user clicks on an item like “PDF Processing” or “TM Upload” from the Admin Dashboard, the interface changes to a completely new page, losing the tab-based navigation and requiring users to manually click “Admin Dashboard” to return.

**Fix:**  
Preserve the tab layout when transitioning to tool-specific pages. All actions accessed from Admin Dashboard (e.g. PDF Processing, TM Upload) should:
- Open within the current layout (e.g. tab content pane or modal)
- Allow return to dashboard view without full page reload or sidebar navigation

---

### 3. ❗️"File Preprocessing Hub" Still Exists in Lower Section

**Fix (reminder):**  
Remove the redundant lower “File Preprocessing Hub” area completely, as it duplicates content.