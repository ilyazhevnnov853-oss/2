## 2024-05-23 - Accessibility Pattern: Icon-Only Buttons
**Learning:** The codebase frequently uses `title` for tooltips on icon-only buttons but omits `aria-label`. While `title` provides some accessibility, it is not consistently announced by all screen readers and does not replace the need for an explicit accessible name.
**Action:** When creating or refactoring icon-only buttons, always include `aria-label`, even if `title` is present. Ideally, create a reusable `IconButton` component that enforces this.
