---
name: interaction-copy
description: Improve microcopy and interaction text across this app so actions, errors, confirmations, and empty states are clearer, shorter, and more motivating for workout logging flows.
---

# Interaction Copy

Use this skill when the user asks to improve UX wording, button labels, alerts, or app tone.

## Scope

Review copy in:
- `public/index.html`
- `public/log.html`
- `public/admin.html`
- `public/recommendations.html`
- `public/app.ts`
- `public/admin.ts`
- `public/recommendations.ts`

## Copy Principles

- Prefer action-oriented labels: "Save session", "Update session", "Delete session"
- Keep error messages specific and recoverable
- Keep confirmations concise and clear
- Keep motivational tone supportive but not noisy
- Use consistent terminology: session, exercise, sets, reps, history, recommendations

## Required Checks

1. Primary CTA text is obvious and specific
2. Empty states explain next action
3. Error states explain what to fix
4. Success toasts confirm what happened
5. Navigation labels are consistent across pages

## Output Format

For each proposed change:
- Existing text
- Replacement text
- File path and code location (HTML or TS)
- One-line rationale tied to user clarity

## Constraint

Do not change data logic in this skill unless copy depends on a small UI state hook.

## Repository Safety

Never include or request:
- Secrets, tokens, API keys, passwords, cookies, or `.env` values
- Personal emails or private account identifiers
- Machine-specific absolute paths (for example `/Users/...`)
