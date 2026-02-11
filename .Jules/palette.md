## 2024-05-22 - Shared Components Accessibility Gaps
**Learning:** Found that core shared UI components (AppHeader, GlassButton) lacked critical accessibility attributes (aria-label) and focus states, effectively making navigation and interaction difficult for screen reader and keyboard users across the entire application.
**Action:** Always audit the lowest-level shared components (UI primitives) first. Adding a11y props (like `ariaLabel`) and styles (like `focus-visible`) there fixes the issue globally with minimal code duplication.
