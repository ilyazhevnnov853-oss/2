## 2024-05-20 - Simulator Accessibility Pattern
**Learning:** The `Simulator` feature uses a custom "Floating Island" toolbar instead of shared components, leading to missing accessibility attributes (ARIA labels, focus rings) on icon-only buttons.
**Action:** When working on complex features like Simulators or Calculators, check for custom control bars and manually verify accessibility compliance, as they may bypass standard design system checks.
