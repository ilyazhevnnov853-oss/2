## 2025-02-18 - Component Reuse and CDNs
**Learning:** `AppHeader` in `Shared.tsx` is unused; most views implement custom headers, duplicating navigation logic and making accessibility updates repetitive. `index.html` relying on external CDNs (esm.sh, aistudiocdn) complicates automated verification in restricted environments.
**Action:** When auditing accessibility, check individual feature components for duplicated UI patterns instead of relying on shared component definitions. For verification, temporarily mock or replace CDN dependencies if possible.
