# Lexitra TM Management Guidelines

This document defines the recommended approach to storing and managing Translation Memory (TM) entries within the Lexitra platform.

---

## ✅ TM Entry Statuses

| Status     | Description                                 | Stored in TM | Default Visibility |
| ---------- | ------------------------------------------- | ------------ | ------------------ |
| `MT`       | AI-generated (GPT) translation              | ✅ (optional) | ❌                  |
| `Draft`    | Human-edited or manually translated segment | ✅            | ❌                  |
| `Reviewed` | Final, confirmed translation                | ✅            | ✅                  |

* **`MT`**: Stored if needed for debugging or future reference. Not shown by default.
* **`Draft`**: Represents incomplete or unreviewed work. Can be stored and updated to `Reviewed` upon approval.
* **`Reviewed`**: Final stage. Only `Reviewed` entries are used by default for TM matching.
* **`Rejected`**: Translation explicitly marked as invalid or incorrect. Not shown or used in TM matching. Can be restored manually as `Draft` or `Reviewed`.

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

* Use `MT`, `Draft`, `Reviewed` as standard TM statuses.
* Only `Reviewed` is shown and used by default.
* Avoid duplicates by checking source/target combinations.
* Fuzzy suggestions are never stored in TM unless reviewed.
* Consider upserting TM entries based on status updates.

---

These TM practices help maintain quality, reduce noise, and ensure consistent reuse of trusted translations within Lexitra.
