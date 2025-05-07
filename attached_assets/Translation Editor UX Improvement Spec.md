Lexitra Translation Editor – UX Improvement Spec

This document outlines the essential UX improvements required for the Translation Editor in the Lexitra platform. These changes aim to provide a more efficient, intuitive, and scalable experience for translators working with large translation files.

⸻

✅ 1. Default Auto-Translation Behavior

• Upon file open:
  • TM Matching:
    • 100% matches → origin: 100%, status: Draft
    • Fuzzy matches → origin: Fuzzy, status: Draft
  • No TM match:
    • Translated with GPT → origin: MT, status: Draft

Auto-translation is now triggered automatically on file open. All segments are pre-filled with translation suggestions and marked as Draft.

⸻

✅ 2. Segment Status Filter Functionality

Add filter options to narrow view by:
• Status:
  • Draft
  • Reviewed
  • Rejected
• Origin:
  • MT
  • Fuzzy
  • 100%

This enables focused review and processing for each translation stage.

⸻

✅ 3. Pagination vs. Infinite Scroll

Support both UI patterns depending on file size:
	•	Default: Infinite Scroll
	•	Smoothly loads more segments as user scrolls down
	•	Alternative: Page Navigation
	•	Display 10–20 segments per page
	•	Provide « Prev Page 2 of 6 Next » controls

⸻

✅ 4. In-File Search Functionality

Add a search bar at the top of the editor to allow searching by:
	•	Source text
	•	Target text
	•	Segment number
	•	TM match text

Search should scroll to the matching segment.

⸻

✅ 5. Segment Change Tracker

Allow users to view all segments that were modified from their initial state (TM match or AI result).
	•	Add a “Show modified segments” view or toggle
	•	Filter view displays only edited segments
	•	Optional integration with status filter
	•	Modified segments retain their original origin unless edited by a human.
	•	If human-edited and marked as Reviewed, the origin is updated to 'HT' when saved to TM.

⸻

✅ 6. Bulk Status Update

Allow users to update status for multiple segments at once:
	•	Add checkboxes next to segments
	•	Add “Select All” and per-page selection options
	•	Provide actions:
	•	Set selected to Reviewed
	•	Set selected to Draft
	•	Set selected to Rejected

⸻

✅ 7. Save File Behavior

“Save" button should:
	•	Store:
		•	Translations
		•	Segment statuses
		•	Inline comments, edits, and actions
		•	Modified segments
		•	Preserve session state (modified segments, scroll position, filters) so users can resume work later
	•	Only segments marked as Reviewed are stored to the Translation Memory (TM).
	•	Segments modified by a human and reviewed are stored with origin: HT.
	•	All other origin types (MT, Fuzzy, 100%) are preserved unless modified.
	•	Note: The "Save" button is distinct from the "Complete" action. "Save" is available within the editor and can be used repeatedly during the editing process. In contrast, "Complete" is a project-level action and should only be performed once all files within the project are finalized. This distinction helps prevent accidental completion of individual files within multi-file projects.

⸻

✅ 8. Editor Header Navigation

• Add breadcrumb navigation to the top of the Editor page to provide clear navigation back to the project or project list:
  • Example: 
    Projects > Project 325: Electric Battery Patent > KR_20230921_file01.txt
    - "Projects" links to the full project list
    - "Project 325..." links to the project detail page
    - Filename is shown as plain text

• Only display the "💾 Save" button in the top-right corner of the header
  • Do not include a "Complete" button in this view
  • Project completion must be done only from the project-level page

• This layout provides better orientation within the workspace, avoids accidental project completion, and supports navigation in multi-file projects.

⸻

These improvements will ensure Lexitra provides a robust, translator-friendly editing experience that supports scalability and high-quality review workflows.

---

🧠 Additional Clarification on TM Storage:

In Lexitra, segment `status` reflects the review workflow (Draft, Reviewed, Rejected), while `origin` reflects the translation source (MT, Fuzzy, 100%, HT). Only segments marked as Reviewed are saved to the TM. When a segment is edited by a human, its origin is updated to `HT` to distinguish it from machine-generated matches.

---

🛠️ Right-Hand Panel and Progress Bar:

• The right-hand panel (currently containing TM / Terms / Comments / History tabs) should remain as-is with no structural UI changes at this stage.  
• The “Terms” tab should be renamed to “Glossary”.  
• Functional review and enhancement of the Glossary, Comments, and History tabs will be addressed in a future update and are not within the current scope.  
• The existing translation progress bar at the top of the file editor, which visualizes segment completion by status, should remain and continue to update as users mark segments.