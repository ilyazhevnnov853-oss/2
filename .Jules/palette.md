## 2025-12-18 - Accessibility for Shared Components
**Learning:** Shared UI components like icon-only buttons and custom sliders often miss accessibility attributes by default. Adding optional `ariaLabel` props to base components allows for easy fixes across the entire app without refactoring every call site.
**Action:** Always check base UI components first for missing a11y props.
