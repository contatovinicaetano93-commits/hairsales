# ADR: HairSales module boundary

## Status

Accepted.

## Context

HairSales is the professional-facing app product that lives alongside the ROM
team panel. Both products share the repository, but they have different users,
auth cookies, billing models, and data ownership rules.

## Decision

- Keep a thin public module boundary at `src/modules/hairsales/index.ts`.
  It re-exports stable HairSales concepts such as brand, plan catalog,
  entitlements, and auth cookie options without moving existing files.
- HairSales auth uses the `vitrini_pro_session` cookie (`PRO_AUTH_COOKIE`).
  This is separate from ROM team panel auth and must not grant ROM access.
- HairSales owns `subscriber_*` tables and helpers, including subscriber
  clients, appointments, connections, WhatsApp state, usage, pack purchases,
  and billing fields on `subscribers`.
- Billing is modeled as Standard/Pro `plan` plus `subscription_status`
  (`none`, `active`, `canceled`, `past_due`). Entitlements are checked through
  `src/lib/pro/entitlements.ts` instead of scattered plan comparisons.
- ROM contacts and HairSales subscriber clients are separate datasets. Never
  share or merge ROM contacts into HairSales subscriber views, and never expose
  subscriber clients in ROM contact lists.

## Consequences

- New HairSales gates should call `can`, `checkCan`, or `assertCan`.
- Cross-product imports should prefer `src/modules/hairsales` when they need
  stable HairSales product concepts.
- Larger file moves are intentionally deferred to avoid breaking existing
  imports while other migration work is in flight.
