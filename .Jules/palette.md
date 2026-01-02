## 2024-05-23 - [Accessibility & Structure]
**Learning:** This project has a flat structure (no `src/` folder), which caused initial path errors. Also, `index.html` was missing the entry script, preventing the app from launching.
**Action:** Always check `ls -R` or `ls -F` carefully before assuming a standard Vite `src/` structure. Verify `index.html` validity early if the screen is blank.

## 2024-05-23 - [Russian Localization]
**Learning:** The UI is entirely in Russian.
**Action:** All `aria-label` attributes must be in Russian to match the UI language (e.g., "На главную" instead of "Home").
