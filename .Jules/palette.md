## 2026-01-26 - Systematic Missing ARIA Labels on Icon-Only Buttons
**Learning:** The application systematically uses icon-only buttons for navigation and tools (Home, Back, Simulator Toolbar) relying solely on `title` attributes. This creates a widespread accessibility gap for screen readers. Shared components like `FloatingDock` and `AppHeader` were primary offenders.
**Action:** When creating new icon-only buttons or components, strictly enforce an mandatory `ariaLabel` prop or fallback to `label` if visible, ensuring `title` is mirrored to `aria-label`.
