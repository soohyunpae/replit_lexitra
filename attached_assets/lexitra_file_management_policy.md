# Lexitra – File Management Policy

This document defines the file upload and modification policy for translation projects in Lexitra. It ensures clarity, stability, and security throughout the project lifecycle.

---

## ✅ Guiding Principle

**Files must be uploaded during project creation. After a project is created, no files can be added, removed, or modified.**

This policy ensures that:

* Translation Units (TUs), GPT translations, and TM matching remain consistent
* Workflow is protected from accidental disruption
* Project responsibility and ownership are clearly maintained

---

## 📁 Project File Upload Policy

### 1. **File Upload Timing**

* **All files must be attached during the project creation step**
* Projects without files cannot be created

### 2. **Post-Creation Restrictions**

* Once a project is created, **work files cannot be changed**
* Users cannot:

  * Add new work files
  * Replace existing work files
  * Delete uploaded work files

### 3. **Project Metadata Remains Editable**

* Users can still edit:
  * Project name and description
  * Notes (internal comments, translator instructions, etc.)
  * References (external links or supporting files not used for translation)

### 4. **What if a work file is missing or incorrect?**

* The user must **delete the project and create a new one**
* Optional: A future feature may support "Duplicate Project" to reuse settings easily

---

## 🔐 Claim Workflow Compatibility

* This policy avoids conflicts when a project is already claimed
* Ensures TUs, GPT results, and TM matches are generated from a stable input set

---

## 🧭 UX Guidelines

* At project creation:

  * Show a clear message: "📎 Files are required to create a project. You won’t be able to change them later."
* On the project detail page:

  * Show attached files in read-only view
  * Do not allow file changes at any stage

---

## 🚫 Not Supported

* Editing files after project creation
* Adding files after claiming
* Reprocessing TUs based on file changes

---

This strict file control ensures Lexitra remains a stable and trusted environment for high-stakes document translation.
