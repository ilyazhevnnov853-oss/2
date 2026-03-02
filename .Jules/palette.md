## 2025-05-15 - Accessibility in Icon-Only Buttons
**Learning:** The project relies heavily on icon-only buttons for critical features (simulation controls), often using `title` tooltips as the only label. This creates a significant barrier for screen reader users, especially on mobile where hover (tooltips) don't exist.
**Action:** When creating or modifying icon-only buttons, always include an explicit `aria-label`, even if a `title` is present. Mirroring the `title` text to `aria-label` is a safe and effective pattern here.
