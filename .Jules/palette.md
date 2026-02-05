## 2024-05-23 - Navigation Accessibility Gaps
**Learning:** A recurring pattern of missing `aria-label` attributes on icon-only navigation buttons (e.g., Back, Home) was observed across `App.tsx`, `Shared.tsx`, and `FloatingDock.tsx`. While some components used `title` for tooltips, they lacked explicit accessible names for screen readers.
**Action:** When creating or modifying navigation components, always verify that icon-only buttons include `aria-label` attributes and visible focus indicators (`focus-visible`) to ensure full accessibility for screen reader and keyboard users.
