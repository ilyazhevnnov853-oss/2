## 2025-05-23 - Accessibility in Shared UI Components
**Learning:** Shared UI components like `AppHeader` and `GlassButton` were widely used without proper accessibility attributes (missing `aria-label` on icon-only buttons). This created a widespread accessibility gap across the application.
**Action:** When creating or modifying shared UI components (especially icon-only buttons), always include an optional `ariaLabel` prop and default to using it (or `label` if present) for the `aria-label` attribute. Ensure hardcoded navigation buttons in headers always have descriptive ARIA labels.
