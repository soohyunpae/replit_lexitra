# Lexitra – Segment History & Save Behavior Specification

This document outlines the behavior of the segment history and save mechanism in the Lexitra Translation Editor.

---

## ✅ Purpose

To track meaningful translation changes while minimizing noise, history logs are tied to user-driven save actions. This ensures that only intentional, review-worthy revisions are preserved.

---

## 🧩 Core Principle

**Only segments that are explicitly saved by the user are logged in history.**

Edits in progress, intermediate keystrokes, or auto-saves are not recorded. The system treats the `Save` button as a user signal to commit a version of the segment.

---

## 📄 Save-Driven History Logging

| Scenario                                             | Saved? | Logged to History? |
| ---------------------------------------------------- | ------ | ------------------ |
| Segment is edited but not saved                      | ❌      | ❌                  |
| Segment is edited and then saved                     | ✅      | ✅                  |
| Segment status is changed to Reviewed without saving | ❌      | ❌                  |
| Segment status is changed and saved                  | ✅      | ✅                  |

---

## 🏷️ Origin Tracking and Save

When saving, the `origin` of a segment is updated based on the following logic:

* If a segment initially came from TM with `origin: MT`, `Fuzzy`, or `100%` and **was edited by a human**, then:

  * On save, the `origin` becomes `HT`
* If it is not edited, the original `origin` value is preserved

---

## 💾 Save Button vs. Complete Action

* **Save**: File-level action, allows translators to preserve ongoing work and log history
* **Complete**: Project-level action, only available after all files in a project are finalized (and all segments are `Reviewed`)

---

## 🧠 History Panel Behavior

* The history tab in the right-hand panel shows **user-saved segment versions**
* Shows: segment content, timestamp, status at save time, origin
* Only final saved versions are shown, not every keystroke

---

## 🔒 Why Not Auto-Save Every Change?

Reasons for this approach:

* Prevent clutter from irrelevant intermediate edits
* Ensure consistency with Translation Memory rules (only `Reviewed` segments are saved)
* Align with user intent and control
* Keeps system lightweight and maintainable

---

## 🔄 TM Integration Reminder

* **Only `Reviewed` segments are saved to the TM**
* **History shows saved changes**, even if they’re not stored in the TM

---

## ✅ Summary

Segment history in Lexitra is:

* **Manually triggered** (Save-based)
* **Origin-aware**
* **TM-compatible**
* **Meaningful to translators**

This design balances auditability, performance, and clarity in professional translation workflows.
