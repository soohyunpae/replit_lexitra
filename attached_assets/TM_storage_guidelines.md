# Lexitra TM Management Guidelines

This document defines the recommended approach to storing and managing Translation Memory (TM) entries within the Lexitra platform. Lexitra now simplifies status tracking for translation segments to focus on clarity and usability. Internally, we still preserve the `origin` of each segment (e.g., MT, TM, HT), but the user interface will only display a simplified `status` that reflects the current workflow stage.

---

## ✅ TM Entry Statuses (User-facing)

Lexitra now simplifies status tracking for translation segments to focus on clarity and usability. Internally, we still preserve the `origin` of each segment (e.g., MT, TM, HT), but the user interface will only display a simplified `status` that reflects the current workflow stage.

| Status      | Description                                          | Stored in TM | Default Visibility |
|-------------|------------------------------------------------------|--------------|---------------------|
| `MT`        | GPT-translated segment, unmodified                   | ❌           | ✅                  |
| `100%`      | TM match with perfect confidence, unmodified         | ❌           | ✅                  |
| `Fuzzy`     | TM match with partial similarity                     | ❌           | ✅                  |
| `Edited`    | Segment has been edited by a human                   | ❌           | ✅                  |
| `Reviewed`  | Final approved version by human                      | ✅           | ✅                  |

> Internally, each segment retains a separate `origin` field (`MT`, `TM`, `HT`) for debugging, analytics, and advanced workflows. This data is not shown to end users unless explicitly needed.

---

## ✅ TM Save Conditions

| Condition                       | Save to TM? | Status     |
| ------------------------------- | ----------- | ---------- |
| GPT translation only            | Optional    | `MT`       |
| Manual translation (unreviewed) | Optional    | `Draft`    |
| Human-edited GPT result         | Optional    | `Draft`    |
| Reviewed by human               | ✅ Yes       | `Reviewed` |

---

## ✅ TM Deduplication Logic

To prevent multiple identical TM entries from being stored:

### 🔍 Deduplication Key:

* `source` + `target`

### 🛠 Behavior:

* On save, check if same `source` + `target` exists:

  * ✅ If exists with same status → **skip**
  * ✅ If exists with different status → **update status**
  * ❌ If not exists → **insert new entry**

---

## ✅ Handling of TM "Use" Action

When user clicks "Use" on a TM suggestion:

* System should **check if entry already exists** (same source/target)

  * If it exists → **do not add duplicate**
  * Optionally update `status` to `Reviewed`

---

## ✅ Fuzzy Match Handling

Fuzzy matches refer to TM suggestions that are **partially matched** to the source segment:

| Scenario                      | TM Status Change                  | Notes                       |
| ----------------------------- | --------------------------------- | --------------------------- |
| Fuzzy match auto-suggested    | No immediate TM change            | Used for suggestion only    |
| Human accepts/edits & reviews | Update or create `Reviewed` entry | Saved as new reviewed match |

* Fuzzy matches **do not automatically enter TM**.
* If a fuzzy match is edited and marked as reviewed, only the `Reviewed` entry is stored. No fuzzy entries are saved.

---

## ✅ Rejected Status Handling

If a TM entry is marked as `Rejected`, it is not used for matching or suggestions. However, to support flexible review workflows, the system should allow manual restoration:

- Provide a **"Restore"** action on `Rejected` entries.
- Allow user to select which status to restore to:
  - `Draft` (if further revision is needed)
  - `Reviewed` (if rejection was a mistake)

This allows reviewers to recover or reclassify rejected translations efficiently.

---

## ✅ Summary

* Use simplified status values (`MT`, `100%`, `Fuzzy`, `Edited`, `Reviewed`) in the user interface.
* Internally maintain a separate `origin` field (`MT`, `TM`, `HT`) for debugging and analytics.
* Only `Reviewed` entries are stored in TM and used for matching by default.
* Fuzzy suggestions are not stored unless explicitly reviewed.
* Status transitions are simplified and triggered through user interactions (edit/save/approve).
