# Palette's Journal

## 2025-05-23 - Accessibility in Custom Form Controls
**Learning:** The custom `GlassSlider` component uses an invisible native input for functionality but separates the visual label, leaving screen readers without context.
**Action:** Always link the native input to its label using `aria-label` or `id`/`for` when building custom controls that hide the native element.
