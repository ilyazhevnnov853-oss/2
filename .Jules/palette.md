## 2026-01-29 - Shared UI Components Missing Accessibility Labels
**Learning:** Shared UI components (GlassButton, AppHeader, GlassSlider) lack ARIA labels, creating accessibility gaps across the application. Reusable components must explicitly handle accessibility props to ensure consistency.
**Action:** Add optional `ariaLabel` props to shared components and ensure internal elements (like hidden inputs in sliders) receive appropriate labels.
