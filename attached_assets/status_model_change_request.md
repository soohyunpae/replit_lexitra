# ✅ Lexitra Status Model Change Request (for Replit)

This document summarizes the requested changes to the translation segment status model for Lexitra, to be implemented in collaboration with the Replit development team.

---

## 🔄 Summary of Change

### Before
- Two fields were used to describe segment status:
  - `origin`: Source of the translation (MT, TM, HT)
  - `status`: Workflow stage (e.g., Draft, Approved)

### After
- Internally, `origin` is retained for analytics/debugging
- For the UI, a single simplified `status` field is shown to users

| Status     | Meaning                                | Saved to TM? |
|------------|----------------------------------------|---------------|
| `MT`       | Machine translated (GPT), unmodified   | ❌            |
| `100%`     | Exact match from TM                    | ❌            |
| `Fuzzy`    | Fuzzy match from TM                    | ❌            |
| `Edited`   | User has modified the translation      | ❌            |
| `Reviewed` | User has reviewed and approved         | ✅            |

> `origin` (MT, TM, HT) is used internally and no longer shown in the UI.

---

## 🛠️ Implementation Requests

- [ ] Replace all UI-facing status logic with the 5 simplified values
- [ ] Maintain `origin` in the database and API for internal use
- [ ] Only save to TM if `status === "Reviewed"`
- [ ] Return `status` in API responses; `origin` can be included separately if needed
- [ ] Status transition rules:
  - Initial status is inferred from `origin`
  - On user edit → status becomes `Edited`
  - On user approval/check → status becomes `Reviewed`

---

## 📎 Reference
- See updated `/TM_storage_guidelines.md` for full specification

This change aims to simplify the workflow and improve clarity for end users while preserving traceability and analytical depth for internal logic.