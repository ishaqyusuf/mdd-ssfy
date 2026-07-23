# Sales Overview V2 Parity Migration Checklist

## Status

Discontinued on 2026-07-23.

V2 was never used in production. The page, sheet, query hooks, action-menu CTA,
provider/shell architecture, registry, and unused tab implementations were
removed without a redirect.

## Final Decision

- [x] Keep `/sales-book/orders` as the canonical server-first workspace.
- [x] Keep the production Sales Overview sheet as the only order/quote detail
      surface.
- [x] Remove the V2 page and sheet rather than completing a duplicate parity
      migration.
- [x] Migrate internal V2 links to the canonical URL contract.
- [x] Port useful V2 state/controller ideas into the canonical flow.
- [x] Mount only active tab content.
- [x] Make production overview reads side-effect-free.
- [x] Protect overview API reads with operational permissions.
- [x] Record the replacement architecture in ADR-028.

## Replacement Work

Future Sales Overview work is tracked against:

- `.brain/features/sales-overview.md`
- `.brain/decisions/ADR-028-canonical-sales-overview-workspace-and-sheet.md`
- `.brain/reports/2026-07-23-sales-overview-legacy-v2-midday-review.md`

Historical V2 progress remains available in git history and chronological Brain
progress entries. It is not an active migration plan.
