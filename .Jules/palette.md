## 2025-02-21 - [Accessibility] Missing ARIA Labels on Icon-Only Buttons
**Learning:** Reusable UI components like `GlassButton` often lack explicit accessibility props, leading to widespread a11y gaps when used in icon-only modes.
**Action:** When creating or refactoring UI primitives, always include optional `ariaLabel` props that fallback to visible labels, and audit consumers (like `App.tsx` navigation) for missing accessible names.
