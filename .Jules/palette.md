## 2024-05-24 - Accessibility Pattern for Icon-Only Buttons
**Learning:** Icon-only buttons (like Play/Pause in the simulator) lack accessible names, making them invisible to screen readers.
**Action:** Updated `GlassButton` to accept an `ariaLabel` prop and fallback to `label`. This ensures all buttons have a programmatic name even if the visual label is omitted for design reasons. Future icon-only buttons should always provide this prop.
