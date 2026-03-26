---
name: design-system-guardrails
description: Establish and enforce lightweight design-system guardrails for this app, including consistent tokens for color, spacing, typography, and component states across existing CSS files.
---

# Design System Guardrails

Use this skill when the user asks to make the UI more consistent, cleaner, or easier to scale.

## Scope

Primary targets:
- `public/style.css`
- `public/admin.css`
- `public/recommendations.css`

Relevant markup:
- `public/log.html`
- `public/admin.html`
- `public/recommendations.html`

## Workflow

1. Extract repeated values:
- Colors
- Spacing values
- Border radius values
- Font sizes
- Shadows and borders

2. Define normalized tokens in `:root` (or a shared top-level block), for example:
- `--color-bg`
- `--color-surface`
- `--color-border`
- `--color-text`
- `--space-2` ... `--space-8`
- `--radius-sm` ... `--radius-lg`

3. Replace repeated literals with tokens in all three CSS files.

4. Standardize component states:
- Hover
- Focus-visible
- Disabled
- Active

5. Preserve current visual identity unless the user explicitly requests a redesign.

## Output Requirements

When reporting changes, include:
- Which tokens were introduced
- Which components were normalized
- Any intentional exceptions kept for branding or emphasis

## Guardrail

Do not introduce heavy framework abstractions. Keep the system lightweight and understandable in plain CSS.

## Repository Safety

Never include or request:
- Secrets, tokens, API keys, passwords, cookies, or `.env` values
- Personal emails or private account identifiers
- Machine-specific absolute paths (for example `/Users/...`)
