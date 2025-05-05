# Lexitra – Project UI, Workflow, and Roles Specification

This document consolidates the Lexitra project status logic, UI layout guidelines, project interaction workflows, and user roles and permissions.

---

## ✅ Project Status Lifecycle

Projects can exist in one of five clearly labeled states:

| Status Label | Meaning                            | Who Sees It?          |
| ------------ | ---------------------------------- | --------------------- |
| Unclaimed    | Project is unclaimed and available | Everyone              |
| In Progress  | Project is claimed by current user | Claiming user only    |
| Claimed      | Project is claimed by someone else | All other users       |
| Completed    | Project is marked finished         | Everyone (via filter) |

### Status Filtering Dropdown
- Filter options: `All`, `Unclaimed`, `In Progress`, `Claimed`, `Completed`
- Location: top-right of the `/projects` page

---

## 🧩 Project List Page UI Improvements

### 1. Grid View
- Ensure status badges (e.g., Completed, In Progress) do not overlap text
- Badge placement: Top-right of card
- Ensure mobile responsiveness

### 2. List View
- Remove icons from `Created`, `Last Updated`, and `Deadline` columns
- Remove `Actions` column:
  - Clicking **Project Name** opens the project detail view
  - Project description preview shown below the name
- Ensure layout is compact and clean across resolutions

### 3. Responsive Layout
- Badges, text, and buttons must scale properly on all screen sizes

---

## 🔄 Project Interaction Actions

All project-related actions (Claim, Release, Complete, Reopen, Delete) should be available within the **project detail page**—the page that opens when a user clicks a project name from the project list. This helps keep the project list clean and prevents accidental actions.

- **Claim**: Visible only when the project is in “Unclaimed” status and unclaimed. Any user can claim the project.
- **Release**: Available only to the user who claimed the project, if the project is in progress.
- **Complete**: Available only to the claiming user, shown when the project is ready to be marked finished.
- **Reopen**: Visible only for completed projects, accessible to the previous claimer or an admin.
- **Delete**: Visible only to admins, and only when the project is completed. Can be a standalone button or placed in a dropdown.

These buttons should not be placed next to "Add File", as their purpose is related to project workflow rather than file upload. Replit may choose the appropriate UI placement.

---

## 🔐 Roles & Permissions

### 1. Viewer (Default User)
- Can view unclaimed projects
- Can claim available projects
- Can access their claimed projects
- Cannot access projects claimed by others

### 2. Claimer (Project Owner)
- Can open the project editor
- Can mark project as completed
- Can release a project (return to Unclaimed)

### 3. Admin
- Can view all projects
- Can reopen or delete any completed project
- Can manage users (optional future feature)

---

## ✅ Project Schema (for reference)

```ts
interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'Unclaimed' | 'In Progress' | 'Claimed' | 'Completed';
  claimedBy?: string;
  claimedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deadline?: Date;
}
```