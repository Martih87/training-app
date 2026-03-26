---
name: ui-ux-audit
description: Run a focused UI and UX audit for this training app, identify high-impact friction points, and produce prioritized, file-specific fixes across layout, interaction flow, and mobile ergonomics.
---

# UI UX Audit

Use this skill when the user asks for UI review, UX feedback, usability improvements, or design polish.

## Scope

Read these files first:
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

## Audit Rubric

Evaluate each page for:
- Information hierarchy and scanability
- Clarity of primary and secondary actions
- Mobile usability and touch ergonomics
- Feedback states (loading, success, error, empty)
- Interaction consistency across pages
- Accessibility basics (focus visibility, labels, keyboard paths, contrast)

## Output Format

Return findings in this order:
1. High severity issues that block or confuse users
2. Medium severity friction that slows task completion
3. Low severity polish opportunities

For each finding, include:
- User impact in one sentence
- Exact file path(s) to change
- Concrete fix recommendation
- Optional code-level note if implementation is straightforward

## Priority Rule

Prefer fixes that improve:
1. Logging a session quickly
2. Editing and understanding history
3. Weekly recommendations comprehension

Keep recommendations grounded in existing vanilla HTML, CSS, and TypeScript architecture.

## Repository Safety

Never include or request:
- Secrets, tokens, API keys, passwords, cookies, or `.env` values
- Personal emails or private account identifiers
- Machine-specific absolute paths (for example `/Users/...`)
