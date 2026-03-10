# LeadsBox Admin Agent Guide

Read first:
1. `../LEADSBOX_WORKSPACE_CONTEXT.md`
2. `README.md`
3. This file

## Repo Purpose

Internal operations app for admin auth, user/org management, subscribers, growth, and anomaly monitoring.
Depends on backend admin and metrics endpoints.

## Business-Critical Context

- Admin actions are operationally sensitive (suspend/restore, org status, metrics visibility).
- Clarity and speed matter more than visual complexity.
- Backend admin/auth contract changes must be mirrored quickly in UI types and pages.

## Current Coding Style

- Vite + React + TypeScript with `strict: true` in app tsconfig.
- Prefer typed API payloads using existing `src/types` models.
- Keep page-level logic in `src/pages` and shared wrappers/components in `src/components`.
- Reuse existing `api` client from `src/lib/api.ts`; do not create parallel HTTP layers.
- Keep UX/admin flows direct and fast; avoid heavy abstractions for simple operational pages.

## High-Value Paths

- `src/pages`
- `src/components`
- `src/lib`
- `src/types`

## Do-Not-Scan Defaults

- `node_modules`
- `dist`

## Cross-Repo Impact Rules

- If backend admin auth or metrics response shape changes, update admin page types and renderers.
- Preserve admin auth flow compatibility (`/admin/auth/*` endpoints).

## Validation Defaults

- `npm run lint`
- `npm run build`

## Response Contract

Return concise output with:
- summary
- files changed
- validation results
- next step
- `HANDOFF` block
