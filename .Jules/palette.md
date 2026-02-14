## 2025-05-16 - [Accessibility in Custom Sliders]
**Learning:** Custom slider components (wrapping `input type="range"`) often detach visual labels from the actual input element, making them invisible to screen readers.
**Action:** Always ensure custom input wrappers accept and pass down an `aria-label` or `aria-labelledby` prop to the native input element.
