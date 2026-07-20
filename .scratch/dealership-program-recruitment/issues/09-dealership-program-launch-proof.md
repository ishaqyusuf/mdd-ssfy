# 09 — Prove the complete dealership-program launch path

**What to build:** Validate the complete feature with safe migration evidence,
focused contract tests, email/PDF snapshots, and seeded browser proof from
campaign targeting through direct fulfillment and dealer lifecycle controls.

**Blocked by:** 01 — Harden dealer-origin invoice branding; 02 — Make dealer
customers private by default with explicit sharing; 03 — Carry a direct-ship
customer snapshot into office fulfillment; 04 — Create the Super Admin
recruitment campaign workspace; 05 — Run the standard sales-email recruitment
funnel end to end; 06 — Extend recruitment banners to composed emails and
reminders; 07 — Approve or deny applications and activate dealers; 08 — Suspend
and reactivate dealer accounts.

**Status:** blocked — apply Prisma schema and restart local services

- [ ] Prisma generation/validation and the intended migration/apply path are
      recorded without accepting unrelated destructive drift.
- [ ] Permission, isolation, concurrency, idempotency, token, suppression,
      notification, template, and print-cache suites pass.
- [ ] Focused typechecks and the narrowest relevant builds/tests pass or
      pre-existing failures are isolated with evidence.
- [ ] Browser QA proves campaign editing/preview, eligible email landing,
      application, approval, password setup, sharing, branded office printing,
      direct shipping, suspension, and reactivation.
- [ ] Brain schema, relationships, migrations, APIs, permissions, features,
      ADRs, task ledgers, and progress are complete.
