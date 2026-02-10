## 2024-05-22 - Missing ARIA Labels on Icon-Only Navigation Buttons
**Learning:** The application uses icon-only buttons for navigation (e.g., "Back" chevron) in the main launcher (`App.tsx`) without accessible names. This makes navigation impossible for screen reader users.
**Action:** Always verify icon-only buttons have `aria-label` or `title`. For core navigation, `aria-label` is preferred for consistent announcement.
