# Palette's Journal

## 2024-05-22 - Missing ARIA Labels on Icon-Only Buttons
**Learning:** The application heavily uses icon-only buttons for navigation (Home, Back) in custom headers (`AppHeader`) and local layouts (`App.tsx`), but consistently lacks `aria-label` attributes, making navigation inaccessible to screen readers.
**Action:** Always check custom header components and "back" buttons for `aria-label` when no visible text is present. Enforce `aria-label` prop in reusable components like `GlassButton` when `label` is missing.
