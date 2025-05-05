# Lexitra – Project List Page Feedback

This document outlines issues observed in the latest implementation of the project list page and necessary corrections for Replit.

---

## ❗ Incorrect or Missing Updates

### 1. **Status Labels**

- Current status: `"In progress (by you)"`
- Correction:
  - Use status label as defined: **"In Progress"**
  - Do not append "(by you)". Claimed projects by other users should display as **"Claimed"**.

---

### 2. **Icons in Metadata Columns**

- Current issue:
  - `Created`, `Last Updated`, and `Deadline` columns still display icons.
- Correction:
  - Remove all icons from these three columns to ensure a cleaner UI in **list view**.

---

### 3. **Actions Column**

- Current issue:
  - The `Actions` column still exists and shows a "View" button.
- Correction:
  - Remove the `Actions` column entirely.
  - Project **Name** should serve as the clickable link to open the project detail page.

---

### 4. **Project ID Column**

- Suggested addition:
  - Add a new `Project ID` column to help users distinguish projects by number.
  - Display the numerical ID (e.g., 19 for `/projects/19`)

---

### 5. **Project Detail Page Not Updating**

- Issue:
  - Changes are not reflected in the project detail page.
  - Likely due to route structure: URLs like `/projects/19` may not be properly recognized or updated.
- Suggestion:
  - Ensure the detail page receives the same design and logic updates as the list/grid view.
  - If route-based rendering is used, verify dynamic routing correctly renders detail UI.

---

Please address these issues and ensure consistency across both views and navigation states.