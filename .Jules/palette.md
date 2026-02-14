## 2024-05-23 - Accessibility of Icon-only Buttons
**Learning:** The launcher interface used several "Back" buttons that were visually clear (left chevron) but lacked accessible names, making them invisible or confusing to screen reader users. The `GlassButton` component also lacked a mechanism to provide an accessible label when the visible label was empty.
**Action:** Always add `aria-label` to icon-only buttons. When creating reusable button components like `GlassButton`, expose an `ariaLabel` prop to support accessible names for icon-only variants.
