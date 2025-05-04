# Lexitra Project Workflow & State Management Guide (for Replit)

This document outlines the intended logic and UI behavior for managing project lifecycle features in Lexitra: **claiming**, **completing**, and **reopening** projects.

---

## ✅ 1. Project Status Flow

Projects can exist in three possible states:

- `Unclaimed` (default): available for users to claim
- `Claimed`: assigned to one user only, hidden from others
- `Completed`: finished projects, hidden from main list (unless reopened)

---

## ✋ 2. Claim Feature (Lightweight Collaboration Model)

- Projects begin as `Unclaimed`.
- Show a **"📥 Claim this project"** button on unclaimed project rows in the project list.
- When a user clicks **Claim**:
  - The `claimedBy` field is set to the current user's ID
  - The project becomes **invisible** to all other users
  - The UI updates to reflect: "🟢 Claimed by me"
- Clicking the project name opens the editor (only for the claiming user).
- If another user tries to access the project, they should see an "Access denied" message.
- Users should also be able to **release** their claim at any time by clicking a **"Release Claim"** button on the project detail page. 
  - When released:
    - `claimedBy` is set to `null`
    - Project returns to the `Unclaimed` state and becomes visible to other users

> ❗ No real-time collaboration is required. One user per project at a time.

---

## ✅ 3. Complete Project

- When the claiming user finishes work, they can click **"Mark as Completed"** in the project detail page.
  - Before showing the completion button, optionally check that all translation units are reviewed or translated (as per project rules).
  - If not all units are complete, a confirmation modal should ask: “Some segments are not yet reviewed. Do you still want to mark this project as completed?”
- This will:
  - Change the project's `status` to `Completed`
  - Hide it from the default `/projects` view
  - Make it available in a separate `/completed-projects` view or under a filter/tab

- In the Completed view, the project becomes **read-only**.

---

## 🔁 4. Reopen Completed Project

- Add a **`···` (More)** dropdown menu next to each project in the Completed view.
- Include the following options:

  1. **↩ Reopen Project**
     - Changes the project status from `Completed` to `Claimed`
     - The project reappears in the main project list, still locked to the previous user

  2. **🗑 Delete Project**
     - Permanently removes the project from the database
     - Must display a confirmation modal: “Are you sure you want to delete this project? This action cannot be undone.”

- No need to include Edit/View Details in this dropdown (those are accessible in the detail view).

---

## 🖥 UI Integration Suggestions

- **Projects page** (`/projects`):
  - Show only `Claimed` or `Unclaimed` projects for the current user
  - Project name is clickable only if:
    - User is the claimer
    - Or project is `Unclaimed`
  - Otherwise, show grayed-out row: “🔒 Claimed by @userX”

- **Completed Projects view**:
  - Contains all projects with `status: Completed`
  - Has `···` dropdown for each row → [Reopen] and [Delete]

---

## ✅ Example Project Schema

```ts
type Project = {
  id: string;
  name: string;
  status: 'Unclaimed' | 'Claimed' | 'Completed';
  claimedBy?: string;
  claimedAt?: Date;
  completedAt?: Date;
  ...
};
```

---

## Summary

The workflow supports project claiming, releasing, completing, and reopening—all with lightweight logic and no complex role system. Only one user can edit a project at a time, and finished projects are archived but reversible.
