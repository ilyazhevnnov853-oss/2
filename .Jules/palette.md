## 2025-05-23 - Navigation Accessibility Patterns
**Learning:** Shared UI components and ad-hoc navigation buttons often miss `aria-label` attributes when they are icon-only, creating significant barriers for screen reader users.
**Action:** Always verify `aria-label` on icon-only buttons. Introduce explicit `ariaLabel` props to shared components like `GlassButton` to enforce this pattern during development.
