## 2024-05-21 - Reusable Component Accessibility Props
**Learning:** The shared `GlassButton` component was designed to handle `icon` and `label`, but failed to provide an accessibility fallback for icon-only usages (where `label` is omitted). This pattern of "implicit accessibility" (assuming a label exists) creates hidden accessibility gaps in feature components.
**Action:** Always include explicit `ariaLabel` props in reusable UI components, especially those that support icon-only variants, and pass them to the underlying HTML element.
