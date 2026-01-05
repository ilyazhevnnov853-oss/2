## 2024-05-23 - Accessibility of Reusable Components
**Learning:** Common UI components like `AppHeader` and `GlassButton` often strip or ignore accessibility props if not explicitly handled.
**Action:** Always ensure wrapper components spread `...props` to the underlying interactive element or explicitly handle `aria-*` attributes.
