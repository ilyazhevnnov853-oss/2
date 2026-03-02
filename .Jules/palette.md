## 2025-02-18 - Accessibility in Shared Components
**Learning:** Shared UI components like `AppHeader` and `GlassButton` are often used across the app, but if they lack accessibility props (like `ariaLabel`), they create widespread accessibility gaps that are hard to fix individually.
**Action:** When creating or updating shared UI components, always include optional `ariaLabel` props to allow consumers to provide context for icon-only buttons.
