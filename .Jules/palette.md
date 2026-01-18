# 2024-05-23 - Accessibility Pattern: Icon-Only Buttons
**Learning:** The application frequently uses icon-only buttons for navigation (especially "Back" and "Home") without accessible labels, relying on visual cues or tooltips which are insufficient for screen readers.
**Action:** Always verify that buttons rendering only icons (like `<ChevronLeft />` or `<Home />`) include an explicit `aria-label` attribute describing their action (e.g., `aria-label="Назад"`). Additionally, ensure they have `focus-visible` styles for keyboard users.
