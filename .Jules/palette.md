## 2024-05-24 - Missing ARIA labels on navigation and icon-only buttons
**Learning:** Critical navigation components (Header, Dock) and reusable `GlassButton` often lack accessible names when they are icon-only, making the app difficult for screen reader users.
**Action:** Always add `aria-label` to icon-only buttons and ensure reusable components support/forward accessibility props.
