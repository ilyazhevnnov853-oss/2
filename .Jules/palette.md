## 2025-05-15 - Accessibility Pattern in Custom UI Components
**Learning:** Reusable components like `GlassButton` often prioritize visual `label` props but neglect accessibility props for icon-only usage.
**Action:** Always ensure custom UI components accept an `ariaLabel` prop that falls back to the visible label if not provided, ensuring both visual and screen reader users are served.
