---
name: a11y-smoke-check
description: Run a practical accessibility smoke check for this app and implement low-effort, high-impact fixes for keyboard navigation, focus visibility, labeling, and color contrast issues.
---

# A11y Smoke Check

Use this skill when the user asks for accessibility improvements, inclusive UX, or usability hardening.

## Scope

Check:
- `public/index.html`
- `public/log.html`
- `public/admin.html`
- `public/recommendations.html`
- `public/style.css`
- `public/admin.css`
- `public/recommendations.css`
- `public/app.ts`
- `public/admin.ts`
- `public/recommendations.ts`

## Checklist

1. Keyboard
- All interactive controls are keyboard reachable
- No keyboard traps in modal or overlays
- Logical tab order on each page

2. Focus visibility
- Buttons, links, inputs, and custom controls have visible `:focus-visible` styles
- Focus style contrasts with the background

3. Labels and semantics
- Inputs have programmatic labels
- Buttons have clear accessible names
- Decorative icons do not replace readable text

4. Feedback states
- Errors are announced visually and phrased clearly
- Success feedback is visible without relying only on color

5. Contrast quick pass
- Text over backgrounds is legible in normal and hover states
- Secondary text remains readable on mobile

## Output Format

Report:
1. Blocking accessibility issues
2. Medium-priority issues
3. Quick wins

For each item include:
- Impacted users
- File path(s)
- Minimal fix

## Constraint

Favor small, reliable improvements over large rewrites. Keep compatibility with current vanilla stack.

## Repository Safety

Never include or request:
- Secrets, tokens, API keys, passwords, cookies, or `.env` values
- Personal emails or private account identifiers
- Machine-specific absolute paths (for example `/Users/...`)
