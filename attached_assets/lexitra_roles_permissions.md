# Lexitra – Roles and Permissions Overview

This document outlines the minimal role-based permission system designed for the Lexitra internal translation tool.

---

## 👥 User Roles

Lexitra supports two simple roles:

### 1. **Admin**
- Typically a team lead, reviewer, or system maintainer
- Has access to all project workflows, including those owned by others

### 2. **User**
- A general translator or reviewer
- Works only on projects they have claimed or completed

---

## 🔐 Permissions Matrix

| Action                                     | Admin      | User        |
|-------------------------------------------|------------|-------------|
| View all projects                         | ✅         | ❌ (own + unclaimed only) |
| Claim unclaimed project                   | ✅         | ✅          |
| Release claimed project                   | ✅ (any)   | ✅ (own only) |
| Complete claimed project                  | ✅         | ✅ (own only) |
| Reopen completed project (any)            | ✅         | ❌          |
| Reopen own completed project              | ✅         | ✅          |
| Delete project                            | ✅         | ❌          |
| Edit TM / Termbase entries                | ✅         | ❌ (read-only) |
| Search and apply TM / TB                  | ✅         | ✅          |

---

## 🖥 UI/UX Behavior Based on Role

- **Reopen / Delete / Release** buttons will only appear for eligible roles.
- Completed projects view:
  - Users see only their own
  - Admins see all completed projects
- No need for separate admin dashboard — permission checks can be handled inline.

---

## 📝 Implementation Suggestions

- Add `role: 'admin' | 'user'` to the User schema (or session object)
- Use conditional rendering in UI:
  ```ts
  if (user.role === 'admin') { ...show sensitive actions }
  ```
- Protect API routes similarly:
  ```ts
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' })
  ```

---

This setup ensures minimal complexity while allowing secure control over sensitive operations such as project deletion and TM editing.
