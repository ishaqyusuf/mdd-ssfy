# Latest Daily GND Codebase Review

Latest report: [2026-07-29](./2026-07-29.md)

## Executive Summary

Today's read-only review found that recent Brain work has closed several previously repeated risks: operational mutation hardening, dealer quote edit locks, dealer next-step guidance, mobile dispatch proof completion, Sales PDF V2 proof, storefront build repair, and Square Terminal settlement improvements are documented as done or partially proven. The remaining highest-risk issues are now concentrated in public scheduler/task controls, public internal read/report surfaces, the public customer pay portal trust boundary, inventory release evidence, and a red API typecheck.

The strongest operational concern is not that all writes remain public. Many reviewed writes are now protected. The open concern is narrower: some scheduler controls can still update or run tasks through public procedures, while broad sales, jobs, filters, customer payment, and report reads remain public and expose operational context that should normally be staff-, dealer-, customer-, or signed-link scoped.

Top risks: public task-event scheduler controls can update/run tasks; public internal read/report routes still expose sales/jobs/filters/accounting/print contexts; the public customer pay portal is account/phone keyed and returns payment/contact/wallet context; inventory correctness is still not release-clean while repairs remain stopped by user request; `bun run typecheck` now fails in `@gnd/api` on Sentry event typing.

No source files, app/package code, schemas, migrations, environment files, task ledgers, database syncs, inventory repair dry-runs, or inventory repair applies were changed or run.
