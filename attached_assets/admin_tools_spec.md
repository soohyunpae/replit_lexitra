# Lexitra – Admin Tools & Dashboard Specification

This document defines the scope, functionality, and structure of the admin-only dashboard in Lexitra. Admin users maintain the system's integrity, manage data, and oversee translation workflows.

---

## 🔐 Access

- The admin dashboard is accessible only to users with the `admin: true` flag.
- Route: `/admin`

### User Roles & Permissions

Lexitra defines two user roles with distinct access rights:

#### 👤 Regular User
- Can view and manage their own projects
- Can claim/release/complete assigned projects
- Can search and reuse TM/TB entries
- Cannot access admin-only routes or tools

#### 👑 Admin
- Has all regular user permissions
- Can access the admin dashboard at `/admin`
- Can upload and manage global TM/TB entries
- Can manage all user projects (reassign, delete, archive)
- Can use bilingual alignment tools and system-wide settings
- Can view analytics and perform system maintenance tasks

---

## 🧭 Dashboard Overview

The admin dashboard is divided into key functional sections:

| Section | Purpose |
|--------|---------|
| 📂 TM Tools | Manage translation memory (upload, alignment, cleanup) |
| 🧠 TB Tools | Maintain and organize termbases |
| 🔧 System Settings | Manage labels, LLM preferences, API keys (future use) |

---

## 📂 TM Tools

### 1. TM Upload
- Upload `.csv` or `.xliff` files
- Preview and confirm entries before saving to DB

### 2. Bilingual PDF Alignment
- Upload Korean and English PDFs
- Auto-generate aligned `.csv` file
- Review, edit, and validate before TM import

### 3. TM Cleanup
- Search and bulk-delete outdated TUs
- Change TU statuses in batch (e.g., `MT` → `Reviewed`)

---

## 🧠 TB Tools

- Merge or split termbases
- Detect and resolve duplicate terms
- Export or archive termbase subsets



---

## 🔧 System Settings (Planned)

- Configure LLM source or model (e.g., OpenAI vs Azure)
- Manage TM status labels (`MT`, `Reviewed`, etc.)
- Set allowed file formats and limits
- Assign or revoke admin rights (Role-based permission editor)

---

## ✨ Future Expansion Ideas

- Admin notifications
- TM/TB usage analytics
- Role-based permission editor

---

Let this document serve as a central plan for all admin-only operations within Lexitra.
