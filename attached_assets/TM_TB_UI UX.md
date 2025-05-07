### 🧩 UI Layout Recommendations

After consideration, the TM and Glossary pages will adopt a **single unified view**, instead of using tab-based layouts.

#### ✅ Rationale
- Most features—such as searching, viewing, and managing glossary/TM items—are naturally part of a single workflow.
- Keeping users in a single context reduces navigation friction and avoids confusion around tabs that actually switch routes.
- Admin-specific features can be introduced without disrupting the general user flow.

#### 🧭 Layout Strategy

**Glossary Page**
- Unified page containing:
  - **Search Terms** section – visible to all users
  - **Glossary List** – visible to all users
  - **Admin Controls** (for admins only), such as:
    - Add Glossary
    - Upload File
    - Delete Glossary
  - Admin controls appear as contextual UI (e.g. buttons within each list item or toolbar)

**Translation Memory Page**
- Unified page containing:
  - **Search TM Entries** section – visible to all users
  - **TM List** – visible to all users
  - **Admin Controls** (for admins only), such as:
    - Add TM Entry
    - Upload TM File
    - Delete TM
    - Move TM Management tools (currently located in Admin Tools) into this page
  - Admin controls appear as contextual UI

**Navigation Note**
- Use breadcrumb navigation at top of main content (not header bar)
- For example: `Glossary > Search Terms` or `Translation Memory > TM List`

This structure ensures clarity and scalability while keeping workflows unified and efficient.

#### ✅ Benefits
- Reduces redundant navigation
- Simplifies UX while keeping it scalable
- Enables smooth workflows, especially for admin users managing data while browsing

Let us know if a visual layout or wireframe is needed.

### 🔍 UI Labeling Clarification

- Use **Search Terms** and **Search TM Entries** as tab/menu labels for clarity and conciseness.
- In longer descriptions or tooltips, "Search for..." phrasing may be used for better readability.
- "Glossary List" and "TM List" should be visible to all users for reference, even if only admins can manage them.
