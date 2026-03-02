## 2024-05-24 - Accessibility for Icon-only Buttons
**Learning:** React components (especially reusable UI ones like `GlassButton` or `AppHeader`) that wrap standard HTML buttons must explicitly handle `aria-label` or pass it through. Without this, icon-only buttons become "ghost" controls for screen reader users.
**Action:** Always add an `ariaLabel` prop to button wrappers and ensure default icon-only buttons (like "Back" or "Home") have localized `aria-label`s hardcoded or passed in.
