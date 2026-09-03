# PlanetScale MySQL vs Neon Postgres Migration Review

Date: 2026-09-03  
Status: Decision support; migration not yet approved  
Scope: GND production, development, Preview, Prisma, Vercel, Trigger.dev,
local database tooling, and production cutover

## Executive recommendation

Do not approve a production engine migration only to fix Preview today.
First run a short PlanetScale Preview pilot using the sanitized branch GND
already owns:

1. Bring the persistent `preview` branch back to exact schema parity.
2. Refresh its bounded, sanitized fixture.
3. Enable PlanetScale Data Branching and create short-lived, data-bearing PR
   branches **from the sanitized development branch**, not from production.
4. Automate credential injection, schema checks, and PR-close deletion.

PlanetScale documents that a data branch seeded from a development branch uses
development-branch hours plus storage. This avoids the much more expensive
behavior of seeding directly from production, where the clone starts as an
additional production branch at the source size with replicas. The current GND
sanitized Preview database is only about 26 MB, so it is a practical branch
base. [PlanetScale Data Branching](https://planetscale.com/docs/vitess/schema-changes/data-branching)

Strategically, Neon Postgres is still the better fit if per-PR data-bearing
databases, Postgres capabilities, future row-level security, and standard
Prisma migrations are durable priorities. Neon branches are copy-on-write
schema-and-data clones and its Vercel integration can create a branch per
Preview Deployment. [Neon branching](https://neon.com/docs/introduction/branching)
[Neon Vercel integration](https://neon.com/docs/guides/vercel-managed-integration)

The recommended decision is therefore:

- **Near term:** harden the PlanetScale Preview workflow and measure whether it
  removes the actual bottleneck.
- **In parallel:** run a Neon/Postgres compatibility pilot with a disposable,
  sanitized snapshot.
- **Approve migration only after the pilot:** choose Neon if branch speed,
  isolation, Postgres capability, and measured operating cost justify the
  one-time migration risk.

The data volume is modest; the application compatibility surface is not. This
is a practical migration, but it is a medium-to-high-risk platform project, not
a connection-string change.

## Verified GND state

### Live database metadata

A read-only production query on 2026-09-03 confirmed:

- Engine: MySQL `8.4.11` through PlanetScale.
- Production tables: `292`.
- Production data plus indexes: `709,902,336` bytes, about `677 MiB`.
- Largest tables by approximate allocated size include `DykeStepForm` (about
  97 MB), `QtyControl` (84 MB), `HomeTasks` (43 MB), `SalesOrderItems` (37 MB),
  and `SalesOrders` (36 MB).

A separate read-only query against the configured Preview connection confirmed:

- Preview tables: `290`.
- Preview data plus indexes: `26,279,936` bytes, about `25 MiB`.
- Missing relative to the current Prisma schema:
  `SalesCompletionRecord` and `SalesTaxLedgerEntry`.

This proves two things. First, the existing curated-preview design is already
storage-efficient. Second, manual schema synchronization is currently drifting,
so any stay-on-PlanetScale option needs an automated schema-parity gate.

The PlanetScale web console could not be inspected without granting a new
GitHub OAuth authorization. No authorization was granted and no PlanetScale
account setting was changed. Exact current cluster size, bill, branch count,
and branch-hour consumption still need to be exported from the account before
the final cost decision.

### Repository compatibility inventory

The current repository contains:

- `292` Prisma models and `90` enums across the split schema.
- `133` models without a declared Prisma `@id` or `@@id`.
- MySQL-native annotations including `623` `@db.Timestamp`, `450`
  `@db.VarChar`, `157` `@db.Json`, `91` `@db.Text`, `54` `@db.Decimal`, `39`
  `@db.DateTime`, `15` `@db.LongText`, one `@db.UnsignedBigInt`, and one
  `@db.Char`.
- `285` MySQL migration SQL files across two histories: `131` under
  `packages/db/src/migrations` and `154` under
  `packages/db/src/schema/migrations`.
- Raw Prisma SQL in `22` non-test source files.
- Explicit MySQL-only SQL in at least five production/tooling files:
  `apps/api/src/db/queries/sales-form.ts`,
  `packages/db/src/local-sync.ts`,
  `packages/db/src/preview-sales-seed.ts`,
  `packages/sales/src/payment-system/infrastructure/canonical-mirror.ts`, and
  `scripts/payment-system-reconciliation-report.mjs`.
- `274` `contains`/`startsWith`/`endsWith` query occurrences across `57`
  non-test files, with only three explicit case-insensitive modes. MySQL's
  current case-insensitive collation and Postgres's default case-sensitive text
  behavior make this a large semantic test surface.

Other direct provider assumptions include:

- `provider = "mysql"` and `relationMode = "prisma"` in the Prisma datasource.
- `provider: "mysql"` in both Better Auth adapters.
- `DATABASE_URL` used as the Trigger Prisma extension's direct URL.
- MySQL Docker, port `3307`, `mysqladmin`, and MySQL defaults in repository and
  shared `local-infra-kit` commands.
- PlanetScale hostname and MySQL error `1062` checks in sync tooling.
- A repository pgloader experiment at `apps/dashboard/db.load`; it is
  destructive/schema-creating and must not be used unchanged.

## Decision matrix

| Concern | Stay on PlanetScale Vitess/MySQL | Move to Neon Postgres |
| --- | --- | --- |
| Immediate change risk | Low | Medium/high one-time migration |
| Existing app compatibility | Proven | Requires schema, SQL, search, auth, tooling, and data conversion |
| Ordinary branch contents | Schema only | Schema and data, copy-on-write |
| Per-PR realistic Preview | Requires seeded development branches and custom automation | First-class Vercel integration |
| Full production clone | Latest backup, full copy, initially production-class when sourced from production | Lightweight child branch sharing parent storage until divergence |
| Sanitized Preview | Existing GND curated seed is strong | Use sanitized `preview-base`; do not expose direct production children casually |
| Schema deployment | Excellent deploy requests, online changes, linting, gated cutover, eligible 30-minute revert | Standard Postgres migrations; use expand/contract and branch rehearsals |
| Referential integrity | Current Prisma emulation; physical FKs not enabled | Native FKs and RLS available, but should be enabled after cleanup/stabilization |
| Scale model | Mature Vitess horizontal sharding and HA | Serverless Postgres autoscaling and scale-to-zero |
| Serverless connections | Built-in Vitess pooling; HTTP driver option | PgBouncer pooled endpoint plus direct administrative endpoint |
| Recovery | Automated backups every 12 hours; restore to a branch | PITR/history and point-in-time branching; retention depends on plan |
| Entry price | No free tier; Vitess Base starts around $39/month in AWS us-east-1 | Free pilot tier; paid Launch/Scale for production |
| GND production fit on free tier | Not applicable | Current ~677 MiB allocation is above Neon's published 0.5 GB/project Free allowance |
| Future multi-tenant defense | Application scoping only unless another mechanism is added | Postgres RLS can add defense in depth after application tenant scoping |
| Lock-in/portability | Vitess workflow is differentiated and provider-specific | Standard Postgres tools and a wider provider ecosystem |

## Advantages and disadvantages

### Staying with PlanetScale/MySQL

Advantages:

- No cross-engine behavior change and no production data cutover.
- Current Prisma models, query semantics, raw SQL, Better Auth configuration,
  local tooling, and operational runbooks keep working.
- PlanetScale deploy requests provide a strong, differentiated non-blocking
  schema-change workflow with review and eligible schema rollback.
  [PlanetScale deploy requests](https://planetscale.com/docs/vitess/schema-changes/deploy-requests)
- The current 25 MiB sanitized Preview dataset is already sufficient for many
  sales, payment, inventory, production, and dispatch rehearsals.
- Vitess offers horizontal sharding if GND reaches a scale that needs it.

Disadvantages:

- A normal branch is schema-only, so data hydration remains GND-owned.
- Full production Data Branching copies all rows from the latest backup, cannot
  select tables/rows, is not synchronized afterward, and is expensive when
  sourced directly from production.
- Per-PR data branches require custom PlanetScale/Vercel automation rather than
  a turnkey integration.
- The repository's `prisma migrate dev` workflow has already hit the PlanetScale
  shadow-database limitation, and PlanetScale recommends `prisma db push` with
  its deploy-request workflow instead.
  [PlanetScale with Prisma](https://planetscale.com/docs/vitess/tutorials/using-planetscale-with-prisma)
- `relationMode = "prisma"` leaves referential enforcement to the application
  and requires explicit relation indexes.

### Moving to Neon/Postgres

Advantages:

- Data-bearing branches are fast copy-on-write clones with isolated writes.
- Vercel can create and inject a branch for each Preview Deployment.
- Short-lived branches plus scale-to-zero are a much better economic and
  operational shape for many concurrent previews.
- PostgreSQL enables native foreign keys, richer indexing and JSONB, standard
  migration tooling, extensions, and future row-level security.
- Standard PostgreSQL improves provider portability and the availability of
  backup, analysis, and migration tools.
- Neon's Free tier is generous for the converted-schema pilot and the current
  small sanitized Preview dataset.

Disadvantages:

- The production dataset does not fit the published 0.5 GB Free allowance; use
  Launch or Scale for a full production candidate and calculate cost from
  measured CU-hours, storage, history, and egress.
  [Neon pricing](https://neon.com/pricing)
- Free has a short six-hour restore window; Launch is up to seven days, while
  Scale offers up to 30 days and adds SLA/network protections.
- Scale-to-zero introduces cold-start latency; production may need a nonzero
  minimum compute or carefully chosen timeout/retry settings.
- PgBouncer transaction mode restricts session-dependent behavior such as
  persistent `SET`, temporary tables, `LISTEN/NOTIFY`, and SQL-level prepared
  statements. Administrative tools must use the direct connection.
  [Neon connection pooling](https://neon.com/docs/connect/connection-pooling)
- A child branch contains the parent's data. Direct production branches expand
  access to production-sensitive information unless masking, access, retention,
  and side-effect controls are enforced.
- PlanetScale's online deploy-request/revert experience is not automatically
  replaced by ordinary Prisma migrations.

### PlanetScale Postgres as a third option

PlanetScale now offers managed Postgres, including a $5 single-node entry tier.
However, its current plans table says Data Branching is not available for the
Postgres product, and each branch is backed by a separately billed cluster.
It does not solve GND's branch-per-preview goal as directly as Neon, so it is
not the preferred target for this specific decision.
[PlanetScale plans](https://planetscale.com/docs/planetscale-plans)

## Can PlanetScale solve the current Preview bottleneck?

Yes, probably, provided GND accepts a production-like sanitized dataset rather
than a continually synchronized full production clone.

Recommended PlanetScale Preview v2 workflow:

1. Treat `preview` as the canonical sanitized-data base branch.
2. Apply the current schema and fail CI if its schema differs from Prisma.
3. Refresh the curated fixture on a controlled schedule or before high-risk
   reviews; never silently fall back to production credentials.
4. Create/verify a backup of the sanitized development branch.
5. For each eligible PR, create a PlanetScale data branch from that sanitized
   development branch's latest backup.
6. Create a short-lived branch credential, inject it into the matching Vercel
   Preview, apply the PR schema, run smoke tests, and expose the preview.
7. Delete credentials and the branch when the PR closes or after a short TTL.
8. Track the included development-branch-hour pool. PlanetScale currently
   includes about 1,440 Vitess development-branch hours per month; one permanent
   base plus short-lived PR branches may fit if concurrency and retention are
   disciplined. [PlanetScale plans](https://planetscale.com/docs/planetscale-plans)

This workflow will not be as instant or turnkey as Neon and it will not keep
PR branches synchronized with the base. It is nevertheless a credible low-risk
solution for the current team size and 25 MiB sanitized dataset.

PlanetScale is insufficient if the hard requirement is: "every Preview must
immediately receive a current, complete production snapshot with negligible
incremental cost and no custom hydration lifecycle." That requirement favors
Neon.

## Recommended Neon topology

Use separate production and non-production projects:

- **Production project:** protected paid branch, pooled runtime role, direct
  migration role, read-only diagnostics role, backup/history policy, no
  automatic Preview children.
- **Non-production project:** a sanitized `preview-base` root refreshed through
  a controlled export/mask/import job; Vercel creates short-lived children from
  this base for PRs.
- **Exceptional production-fidelity debugging:** create a tightly controlled
  production child, disable all external side effects, restrict access, mask if
  possible, and delete it quickly. Do not make this the default Preview path.

Separating projects sacrifices direct copy-on-write from production into the
normal Preview base, but it prevents ordinary Preview automation from having
the authority to branch or reset the production project. It is the safer GND
default because Preview includes customer, auth, payment, employee, and sales
data relationships.

Runtime environment contract:

- `DATABASE_URL`: pooled Neon/PgBouncer URL for dashboard, API, dealership,
  storefront, and jobs runtime.
- `DIRECT_URL`: direct Neon URL for Prisma migration, baseline, import/export,
  diagnostic, and administrative operations.
- `APP_ENV`/an explicit database-environment label: UI and safety behavior;
  never infer production from a hostname substring.

## Prisma and code changes

### 1. Provider and native types

- Change the datasource provider to `postgresql`.
- Keep `relationMode = "prisma"` for the engine cutover so referential behavior
  does not change simultaneously. Enable physical foreign keys later after
  orphan cleanup and validation.
- Convert the 39 MySQL `@db.DateTime` fields to an intentional Postgres
  timestamp type.
- Convert 15 `@db.LongText` fields to `@db.Text`.
- Resolve the single unsigned bigint with a signed-safe mapping and live-value
  bounds check.
- Decide whether each of 157 JSON fields should be `jsonb` (default preference)
  or plain `json`.
- Classify timestamp fields as UTC instants (`timestamptz`) or local/business
  time (`timestamp`) instead of applying one bulk cast.
- Preserve decimal precision/scale and verify financial rounding.

### 2. New migration history

Prisma cannot replay MySQL migration SQL on Postgres and does not automatically
switch providers. Archive both MySQL histories as immutable records, create one
new Postgres `0_init` baseline from the converted schema, and make that the only
active Postgres history. [Prisma provider-switch limitation](https://www.prisma.io/docs/orm/v6/prisma-migrate/understanding-prisma-migrate/limitations-and-known-issues)

Apply the baseline to an empty branch, introspect/diff it back against Prisma,
and require an empty diff. Load migration data afterward in data-only mode so
pgloader does not become the schema authority.

### 3. Raw SQL and identifier behavior

Audit all 22 raw-SQL files, not only the five with obvious MySQL functions.
Postgres lowercases unquoted identifiers, while GND's physical table names are
often PascalCase. Statements such as `FROM SalesOrders` must either use quoted
`"SalesOrders"` or the physical naming strategy must change deliberately.

Required conversions include:

- `ON DUPLICATE KEY UPDATE` -> `ON CONFLICT ... DO UPDATE` or Prisma upsert.
- `DATABASE()`/MySQL `information_schema` -> Postgres catalogs or
  `to_regclass`.
- `JSON_SET`/`JSON_EXTRACT` -> `jsonb_set`/Postgres operators or Prisma logic.
- Backtick quoting -> double-quoted identifiers.
- `AUTO_INCREMENT` resets -> sequence `setval` operations.
- MySQL duplicate code `1062` -> Prisma error handling or PostgreSQL SQLSTATE.
- Raw aliases and boolean results -> explicit quoted aliases and typed results.
- Lock/retry behavior -> Postgres deadlock/serialization retry validation.

### 4. Search, sorting, and collation

The 274 string-filter occurrences require behavior tests. Decide field by field
whether matching should be case-insensitive. Use Prisma `mode: "insensitive"`,
`citext`, or expression/trigram indexes based on actual query needs. Test sort
order, accents, punctuation, and null placement because MySQL and Postgres
defaults differ. [Prisma case sensitivity](https://www.prisma.io/docs/orm/prisma-client/queries/case-sensitivity)

### 5. Authentication and clients

- Change the Better Auth Prisma adapter provider in both auth surfaces.
- Regenerate the main Prisma client and the flattened jobs schema/client.
- Point Trigger's Prisma build extension at `DIRECT_URL` while runtime tasks use
  pooled `DATABASE_URL`.
- Validate login, session refresh, magic link/OAuth, logout, password reset,
  dealership auth, and development quick-login behavior.

### 6. Local, sync, seed, and deployment tooling

- Replace the local MySQL Compose service with Postgres and update readiness,
  ports, users, and database names.
- Update the shared `local-infra-kit` GND profile. It already contains a shared
  Postgres sync engine used by other projects, so GND should adopt that path
  instead of rewriting it from scratch.
- Retire or rewrite `packages/db/src/local-sync.ts` and the PlanetScale-only
  Preview seeder safety checks.
- Update root DB commands, README examples, fixture defaults, CI, Vercel,
  Trigger.dev, and all hosted environment variables.
- Add a provider-neutral database fingerprint and ensure non-production and
  production safety checks still fail closed.

## Data migration plan

Use a Prisma-first target schema and a repeatable pgloader/data-only pipeline.
Neon's official PlanetScale guide uses pgloader and requires a final source
write pause because it is a snapshot copy, not continuous replication.
[Neon migration guide](https://neon.com/docs/import/migrate-from-planetscale)

1. Export a PlanetScale backup/dump and retain a credential-free manifest.
2. Restore to an isolated intermediate MySQL instance if direct PlanetScale
   access is unstable or pgloader needs predictable connectivity.
3. Apply the reviewed Postgres baseline to an empty Neon branch.
4. Load data only, with explicit casts for date/time, JSON, boolean, enum,
   unsigned values, and any legacy invalid data.
5. Reset every sequence to at least `MAX(id) + 1`.
6. Run `ANALYZE` and only add/tune indexes from measured query plans.
7. Compare counts, key sets, null distributions, min/max values, checksums, and
   named business aggregates.
8. Rehearse twice on fresh branches using exactly the final runbook.

At roughly 677 MiB including MySQL indexes, raw transfer volume is not the main
risk. Final downtime should be determined by a timed rehearsal, but it is
reasonable to start with a write-freeze strategy rather than designing
heterogeneous CDC immediately. Add CDC only if measured dump/load/validation
cannot fit the business's approved maintenance window.

## What must exist before cutover

To make "100% migrated" evidence-based rather than aspirational, create these
artifacts:

- A 292-table migration manifest with keys, counts, sizes, cast rules, load
  order, checks, and owner.
- A machine-readable provider-compatibility inventory for raw SQL, native
  types, auth providers, MySQL URLs, and tooling assumptions.
- One canonical Postgres Prisma baseline plus an empty-diff CI check.
- A repeatable data-only loader with per-table results and deterministic retry.
- A parity verifier covering counts, keys, sequences, JSON, timestamps,
  decimals, orphans, and domain invariants.
- Search/collation parity tests for customer, sales, inventory, production,
  finance, dealership, and storefront lookup paths.
- A writer registry and maintenance switch covering web/API mutations, jobs,
  Trigger tasks, payment callbacks, imports, cron, and manual scripts.
- Dual-environment CI that runs the relevant application tests against MySQL
  before cutover and Postgres in the migration branch.
- Performance baselines for the highest-value routes and background jobs.
- A cutover runbook with named owners, timed commands, go/no-go thresholds,
  and pre-write versus post-write rollback rules.
- A restore drill and provider-independent encrypted export.
- A Neon Preview lifecycle test proving create, migrate, inject, smoke, expire,
  and delete behavior.

No vendor or test suite can literally guarantee zero migration defects. The
completion standard should be: two identical full rehearsals, zero unexplained
critical mismatches, all P0/P1 workflows passing, an empty schema diff, measured
performance within thresholds, and a rehearsed rollback before writes open.

## Phased execution and gates

### Phase A — Two-week decision pilot

- Fix PlanetScale Preview schema drift and prove seeded PR branch automation.
- Create a Neon Free pilot with the converted schema and sanitized data small
  enough to fit the plan.
- Measure branch creation, migration time, cold starts, connection behavior,
  Preview cleanup, and developer friction on both.
- Export current PlanetScale bill/branch-hour usage and model Neon Launch/Scale
  with observed compute, storage, history, and egress.

Gate: select "stay" or "migrate" using measured evidence.

### Phase B — Provider-neutral cleanup

- Remove/abstract MySQL-only SQL while production remains on MySQL.
- Add explicit text-matching semantics and tests.
- Generalize environment identity, auth provider configuration, and database
  safety helpers.

Gate: changes pass against current MySQL and reduce the cross-engine diff.

### Phase C — Postgres schema and tooling

- Convert native types and provider.
- Establish the Postgres baseline and direct/pooled URL contract.
- Convert local Docker, shared infra, jobs, auth, seed, and sync tooling.

Gate: a fresh Neon branch builds with an empty Prisma schema diff and every
runtime surface boots.

### Phase D — Loader, parity, and application rehearsal

- Build the 292-table manifest and data-only loader.
- Run full domain parity, mutation smoke tests, and performance comparisons.
- Complete two consecutive clean rehearsals.

Gate: measured cutover fits the maintenance window and all P0/P1 checks pass.

### Phase E — Production cutover

- Freeze schema and writes, stop all writers, take final backup/dump, load,
  validate, switch pooled/direct credentials, smoke read paths, then open
  controlled writes.
- Keep PlanetScale intact and read-only.

Gate: no critical mismatch, auth/payment/inventory/sales mutations succeed, and
error/latency/connection metrics stay within thresholds.

### Phase F — Stabilization

- Reconcile at one hour, 24 hours, 72 hours, and end of observation window.
- Prove Neon restore, tune indexes/pools, and keep PlanetScale for 2–4 weeks.
- Retire PlanetScale only after explicit approval.
- Add physical foreign keys and RLS in later, separately reviewed phases.

## Timeline and smoothness estimate

For one experienced engineer with domain-owner support:

- Decision pilot: 1–2 weeks.
- Provider-neutral cleanup and Postgres schema/tooling: 2–3 weeks.
- Loader, parity automation, and two rehearsals: 2–3 weeks.
- Final rehearsal/cutover: about 1 week of preparation plus the measured
  maintenance window.
- Observation before decommissioning: 2–4 weeks, mostly monitoring.

Calendar work can overlap, but a realistic implementation range is roughly
5–8 engineering weeks before cutover. The migration can be smooth because the
database is under 1 GB and Prisma already centralizes most access. It is not a
one-week switch because schema semantics, raw SQL, case-insensitive searches,
auth, and database tooling are spread across critical sales/payment/inventory
paths.

## Final decision rule

Stay on PlanetScale if the sanitized-base PR-branch pilot is fast enough, its
custom automation is reliable, and current operating cost is acceptable. That
choice buys the lowest risk and preserves PlanetScale's excellent schema deploy
workflow.

Choose Neon if the team expects multiple simultaneous Preview environments,
wants production-shaped branch data as a normal daily workflow, values
Postgres/RLS/portability beyond Preview, and accepts paid production sizing plus
the one-time 5–8 week migration program.

My present recommendation is **PlanetScale Preview v2 immediately, Neon
Postgres as the likely strategic target after a successful compatibility and
cost pilot**.

## References

- [Current vendor research](../research/2026-09-03-planetscale-vitess-vs-neon-postgres-vendor-research.md)
- [Existing migration plan](../plans/2026-08-04-planetscale-to-neon-postgres-migration.md)
- [Existing curated Preview decision](../decisions/2026-08-23-planetscale-preview-curated-sales-seed.md)
- [PlanetScale Preview verification](../research/2026-08-23-planetscale-preview-branch-verification.md)
- [PlanetScale plans](https://planetscale.com/docs/planetscale-plans)
- [PlanetScale branching](https://planetscale.com/docs/vitess/schema-changes/branching)
- [PlanetScale Data Branching](https://planetscale.com/docs/vitess/schema-changes/data-branching)
- [Neon pricing](https://neon.com/pricing)
- [Neon branching](https://neon.com/docs/introduction/branching)
- [Prisma PostgreSQL connector](https://www.prisma.io/docs/orm/overview/databases/postgresql)

