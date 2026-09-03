# PlanetScale Vitess vs Neon Postgres: Vendor Research

Date verified: 2026-09-03  
Status: Decision-support research, not an approved architecture decision  
Scope: Current vendor capabilities and Prisma implications relevant to GND's
PlanetScale MySQL/Vitess versus Neon Postgres decision

## Executive finding

Neon is the stronger fit for the specific developer-experience problem described:
creating many short-lived, production-shaped databases for Vercel previews. A
normal Neon child branch is an instant copy-on-write clone containing the
parent's schema and data, writes are isolated as deltas, and branch creation
does not load the parent. Neon documents an integration that creates a branch
per Vercel Preview Deployment, injects that branch's connection variables, and
can run Prisma migrations before the preview build.
[Neon branching](https://neon.com/docs/introduction/branching)
[Neon Vercel integration](https://neon.com/docs/guides/vercel-managed-integration)

PlanetScale can address the preview problem without changing database engines,
but it requires choosing between two less convenient data workflows:

1. Normal development branches copy the schema only. GND must load and refresh
   its own curated or sanitized test dataset.
2. Data Branching copies all schema and all data from the latest backup, but a
   branch seeded from production starts as another production branch at the
   source cluster size, includes two replicas, and is billed accordingly until
   downsized or deleted. It cannot select rows/tables, stay synchronized with
   production, or merge data back.

[PlanetScale branching](https://planetscale.com/docs/vitess/schema-changes/branching)
[PlanetScale Data Branching](https://planetscale.com/docs/vitess/schema-changes/data-branching)

The practical recommendation is therefore conditional:

- If isolated preview databases with current production-shaped data are a
  strategic day-to-day requirement, proceed toward Neon Postgres through a
  measured pilot and rehearsed cutover.
- If a small sanitized fixture is sufficient and migration risk is currently
  more expensive than preview friction, retain PlanetScale and automate the
  already-established schema-only branch plus curated-seed approach.
- Do not treat Neon's Free plan as the production sizing answer. It is an
  excellent pilot/development tier only when the entire project fits within
  0.5 GB. Production will normally require Launch or Scale, and Scale is the
  plan that includes an uptime SLA, IP allow rules, private networking, and the
  longest restore window.

## Side-by-side decision matrix

| Concern | PlanetScale Vitess / MySQL | Neon Postgres |
| --- | --- | --- |
| Engine migration | None; GND remains on its current Prisma/MySQL behavior | One-time MySQL-to-Postgres schema, data, query, and migration-history conversion |
| Normal branch contents | Schema only | Schema and data by default, using copy-on-write |
| Production-data branch | Full latest-backup clone; starts as separately billed production branch at source size | Lightweight child branch sharing parent storage until it diverges |
| Selective/sanitized branch | Application-owned seed/import process | Schema-only branch is available in beta; otherwise use a sanitized parent/base branch |
| Per-preview automation | CLI/API automation is possible, but GND still owns data hydration | Documented Vercel integration creates and wires a branch per preview |
| Schema delivery | Strong differentiated workflow: deploy requests, online changes, conflict checks, gated cutover, and a 30-minute schema-revert window | Standard Postgres/Prisma migration workflow; branch previews make rehearsals cheap but do not replace safe expand/contract migrations |
| Serverless connections | Built-in connection pooling; an HTTP PlanetScale driver is also available | PgBouncer transaction pooling up to 10,000 client connections; use pooled runtime and direct administrative URLs |
| Recovery | Base plan backups every 12 hours, restored to a new branch | PITR/history: Free 6 hours (1 GB change cap), Launch up to 7 days, Scale up to 30 days; snapshots and `pg_dump` options also exist |
| Entry economics | No free plan; AWS us-east-1 Vitess starts at PS-10, $39/month; about 1,440 development-branch hours/month are included | Free: 100 CU-hours/project, 10 branches/project, 0.5 GB storage/project; paid Launch is usage-based with no minimum |
| Main operational advantage | Mature Vitess scale, non-blocking schema deploys, no rewrite of the application database semantics | Fast data-bearing branching, scale-to-zero, cheap ephemeral environments, native Postgres capabilities |
| Main operational disadvantage | Full data branches are heavyweight/costly; ordinary branches do not solve production-data previews by themselves | Cold starts, PgBouncer transaction-mode constraints, and a material cross-engine migration |

## PlanetScale Vitess / MySQL: current offering

### Pricing and branch capacity

PlanetScale no longer has a free plan. On the current Base plan, the official
AWS `us-east-1` price table lists the smallest Vitess network-storage cluster,
PS-10 (1/8 vCPU, 1 GiB memory, one primary plus two replicas), at $39/month.
Prices vary by provider and region. Base includes 10 GB of network-attached
storage; additional Vitess storage is billed per instance. It also includes
one production branch and about 1,440 development-branch hours per month—about
two continuously running development instances.
[PlanetScale us-east-1 pricing](https://planetscale.com/pricing?region=us-east)
[PlanetScale plans](https://planetscale.com/docs/planetscale-plans)
[PlanetScale Vitess pricing](https://planetscale.com/docs/vitess/pricing)

Development branches have reduced resources and are not production HA
environments. They are appropriate for development, CI, and staging. Creating
one copies only the source schema. Data and schema changes remain isolated from
other branches.
[PlanetScale branching](https://planetscale.com/docs/vitess/schema-changes/branching)

### What PlanetScale can do for the preview bottleneck

**Low-cost standing preview:** retain a PS-DEV branch and load a bounded,
sanitized fixture. This is already the repository's recorded approach in
[`2026-08-23-planetscale-preview-curated-sales-seed.md`](../decisions/2026-08-23-planetscale-preview-curated-sales-seed.md).
Its weakness is data freshness: GND owns selection, masking, referential
completeness, reset, and refresh.

**High-fidelity short-lived preview:** enable Data Branching and seed from the
latest production backup. PlanetScale copies every table and row; it cannot
filter the copy. The child is point-in-time only and neither subsequent
production changes nor preview writes synchronize in either direction. A clone
from a production branch is initially another production branch at the same
resource size with two replicas and full storage charges. PlanetScale permits a
later resize and prorates billing, so this is viable for an occasional
high-fidelity investigation, but is poorly shaped for one full-data branch per
ordinary pull request.
[PlanetScale Data Branching](https://planetscale.com/docs/vitess/schema-changes/data-branching)

### Advantages of staying

- No cross-engine cutover, query-semantics change, or provider-switch rewrite
  of Prisma migration history.
- PlanetScale's deploy requests provide schema diffs, lint/conflict checks,
  online data synchronization into shadow tables, optional gated cutover, and
  a 30-minute revert window for eligible non-instant schema deployments.
  [PlanetScale deploy requests](https://planetscale.com/docs/vitess/schema-changes/deploy-requests)
- The platform documents built-in connection pooling; PlanetScale's serverless
  HTTP driver can also be used with Prisma through
  `@prisma/adapter-planetscale`.
  [PlanetScale Vitess workflow](https://planetscale.com/docs/vitess/best-practices)
  [PlanetScale with Prisma](https://planetscale.com/docs/vitess/tutorials/using-planetscale-with-prisma)
- Vitess offers horizontal sharding as a first-class platform capability if
  GND eventually reaches that scale.
  [PlanetScale plans](https://planetscale.com/docs/planetscale-plans)

### Disadvantages of staying

- Standard branches solve schema isolation, not realistic-data hydration.
- Full production-data branches duplicate the whole latest backup, initially
  consume production-class compute/replicas, and expose a complete additional
  copy of production-sensitive data.
- There is no free PlanetScale tier. Extra production branches are separately
  billed.
- Vitess imposes operational semantics and limits that do not exist in plain
  MySQL, including transaction-pool limits, query/transaction timeouts, and
  special behavior around large/online schema changes.
  [PlanetScale Vitess system limits](https://planetscale.com/docs/vitess/scaling/planetscale-system-limits)

### Backup and restore posture

The Base plan performs automated backups every 12 hours. Manual/scheduled
additional backups are available and additional scheduled backup storage is
listed at $0.023/GB-month. A restore creates a new branch from a selected
backup. The cited Vitess documentation does not describe continuous PITR;
PlanetScale's separate PITR documentation applies to its Postgres product.
[PlanetScale Vitess backups](https://planetscale.com/docs/vitess/backups)

## Neon Postgres: current offering

### Pricing and production posture

The current Free plan includes 100 projects, 10 branches per project, 100
CU-hours per project per month, a maximum compute size of 2 CU (8 GB RAM), 0.5
GB storage per project, 5 GB public network transfer per project, and mandatory
scale-to-zero after five minutes idle. The 0.5 GB limit applies to the project,
so a production dataset larger than that does not fit merely because child
branches are storage-efficient.

Launch has no monthly minimum and currently charges $0.106/CU-hour,
$0.35/GB-month storage, includes 10 branches/project and 500 GB egress/project,
and charges $1.50 per extra branch-month, prorated hourly. Scale charges
$0.222/CU-hour, includes 25 branches/project, and adds the uptime SLA, IP allow
rules, private networking, compliance features, and higher limits.
[Neon plans and pricing](https://neon.com/docs/introduction/plans)

The vendor positions Free for prototypes, side projects, and small teams;
Launch for startups/growing teams; and Scale for production-grade workloads.
For GND, a Free project is suitable for the compatibility pilot or a curated
developer dataset if it fits. Production sizing should be calculated from the
actual database size, active CU-hours, history retained, egress, and required
availability/security rather than from the $0 headline.
[Neon plans and pricing](https://neon.com/docs/introduction/plans)

### Branching and previews

A normal Neon branch contains all parent data at the branch point. It is
copy-on-write: existing storage is shared and branch writes become a delta;
branch creation does not add load to production. Each branch is independently
writable and has its own compute/connection endpoint. Child-branch storage on
paid plans is billed as the lesser of accumulated changes or logical data
size; short-lived branches should use expiration or explicit deletion.
[Neon branching](https://neon.com/docs/introduction/branching)
[Neon plans: storage](https://neon.com/docs/introduction/plans#storage)

Neon's Vercel-managed integration can create `preview/<git-branch>` for every
Preview Deployment, inject the pooled and unpooled connection strings, wait for
the branch, and run `prisma migrate deploy` in the build. Preview branches are
deleted when the corresponding Vercel deployment is removed; because Vercel's
default preview retention can be six months, GND should configure a shorter
retention or immediate PR-close cleanup instead of assuming prompt deletion.
[Neon Vercel integration](https://neon.com/docs/guides/vercel-managed-integration)

### Production data safety

Neon's convenient default is also its largest security caveat: a normal child
contains all production data. For ordinary preview deployments, the preferred
GND topology is a sanitized `preview-base` dataset that is refreshed under an
explicit masking policy, with per-PR children created from that base. Reserve
direct production children for tightly controlled investigations with all
external side effects disabled.

Neon also offers schema-only branches in beta. They copy structure without
rows, but are independent root branches: they share no history with a parent,
cannot reset from parent, consume a plan-specific root-branch allowance, and
must be populated separately. Free allows three root branches/project and all
branches share its 0.5 GB cap.
[Neon schema-only branches](https://neon.com/docs/guides/branching-schema-only)

Protected branches are paid-only. They cannot be deleted or reset, do not
archive for inactivity, and generate new passwords for roles copied to child
branches. Launch supports two protected branches; Scale supports five. IP
allow rules are a Scale feature.
[Neon protected branches](https://neon.com/docs/guides/protected-branches)

### Connections and Prisma

Neon uses PgBouncer in transaction mode and accepts up to 10,000 client
connections on pooled endpoints. This is well suited to Vercel/serverless
traffic, but session-level behavior is restricted: persistent `SET`, temporary
tables, `LISTEN/NOTIFY`, SQL-level prepared statements, and similar session
assumptions require care. Administrative operations such as `pg_dump`, logical
replication, and generally migrations should use a direct endpoint.
[Neon connection pooling](https://neon.com/docs/connect/connection-pooling)

Prisma's Neon guide recommends a pooled `DATABASE_URL` for application runtime
and a direct `DIRECT_URL` selected by `prisma.config.ts` for CLI operations. It
also documents Neon cold starts: after scale-to-zero, activation commonly adds
roughly 500 ms to a few seconds and can surface as connection timeouts. Prisma
supports Neon's HTTP/WebSocket serverless driver through
`@prisma/adapter-neon` if GND later wants that runtime model.
[Prisma with Neon](https://www.prisma.io/docs/orm/v6/overview/databases/neon)

### Backup and restore posture

Neon retains WAL history for point-in-time restore, time-travel queries, and
branching from past states. Free retains six hours with a 1 GB history cap;
Launch can retain up to seven days; Scale up to 30 days. Paid history is billed
at $0.20/GB-month. Neon also supports manual snapshots and standard
`pg_dump`/`pg_restore`; scheduled snapshots are paid-only.
[Neon history window](https://neon.com/docs/postgres/backup-restore/history-window)
[Neon backup strategies](https://neon.com/docs/postgres/backup-restore/backups)
[Neon plans and snapshots](https://neon.com/docs/introduction/plans#snapshots)

## Prisma and migration consequences

Prisma supports both providers, but Prisma Migrate cannot automatically switch
providers because migration SQL is engine-specific. The supported manual
provider-switch procedure is to change the datasource provider/config URL,
archive the MySQL migration history, and create a new initial PostgreSQL
migration. That produces an empty PostgreSQL database; it does not transfer
data or preserve hand-written SQL from old migrations.
[Prisma provider-switch limitation](https://www.prisma.io/docs/orm/v6/prisma-migrate/understanding-prisma-migrate/limitations-and-known-issues)

Neon's official PlanetScale migration guide uses `pgloader`. It converts common
MySQL schema and data types and streams rows to Postgres using `COPY`. It is a
point-in-time migration: writes must be paused during the final run or changes
after the copy starts will be lost. It requires a direct Neon connection, and
the guide calls out common mappings such as `AUTO_INCREMENT` to `SERIAL`,
`TINYINT` to `BOOLEAN`, and `DATETIME` to `TIMESTAMP`.
[Neon: migrate from PlanetScale](https://neon.com/docs/import/migrate-from-planetscale)

For a mature Prisma application, `pgloader` should first be treated as a
conversion and rehearsal tool, not as proof that the application is migrated.
The target schema must still be reconciled with the authoritative Prisma model
and a new PostgreSQL migration baseline.

Key migration workstreams are:

1. **Prisma schema conversion:** change `provider = "mysql"` to
   `provider = "postgresql"`; replace all MySQL-native `@db.*` types and
   defaults; decide timestamp/time-zone semantics; generate a new PostgreSQL
   migration history; preserve any custom migration SQL deliberately.
2. **Referential integrity:** GND currently uses `relationMode = "prisma"`.
   PostgreSQL defaults to real foreign keys, which Prisma recommends when the
   database supports them. Audit and repair orphaned rows before enabling the
   constraints; otherwise the import or baseline will fail. Prisma's emulated
   mode does not enforce foreign keys on creates or raw SQL and has additional
   query overhead.
   [Prisma relation modes](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/relation-mode)
3. **Query semantics:** audit every `$queryRaw`/`$executeRaw`, SQL file, trigger,
   stored expression, migration, and database utility. Placeholder syntax,
   identifier quoting, boolean results, functions, upserts, locking, JSON
   operators, and error codes differ. Prisma explicitly notes that raw booleans
   return `1/0` on MySQL and `true/false` on PostgreSQL.
   [Prisma raw-query caveats](https://www.prisma.io/docs/orm/v6/prisma-client/using-raw-sql/raw-queries)
4. **Text matching and indexes:** MySQL commonly uses a case-insensitive
   collation; PostgreSQL deterministic collation is case-sensitive by default.
   Existing customer/order/search behavior must be tested and intentionally
   moved to `mode: "insensitive"`, `citext`, or suitable expression/trigram
   indexes where needed.
   [Prisma case sensitivity](https://www.prisma.io/docs/orm/v6/prisma-client/queries/case-sensitivity)
5. **Data conversion:** define explicit casts for unsigned/narrow integers,
   zero dates, decimals, JSON, binary data, enum values, timestamps, and any
   MySQL-only defaults. Preserve application IDs, then reset PostgreSQL
   sequences above imported maxima.
6. **Operational code:** generalize MySQL/PlanetScale-only safety checks,
   hostname validation, dump/sync/preview seed scripts, local Docker defaults,
   CI variables, Trigger.dev configuration, Better Auth provider settings,
   monitoring, and runbooks. Application runtime gets the pooled Neon URL;
   Prisma CLI, migration, dump, and restore paths get the direct URL.
7. **Parity evidence:** compare per-table counts, primary-key sets, null/value
   distributions, referential integrity, money totals, production/inventory/
   payment state aggregates, representative business workflows, query plans,
   and latency under realistic concurrency.

## Recommended migration sequence

1. Measure the real production logical data size, write rate, peak connections,
   region/latency needs, and current PlanetScale monthly cost. This determines
   whether Neon Free can host only a pilot or any useful clone, and whether
   Launch or Scale is the production candidate.
2. Create an isolated Neon pilot. Convert the Prisma schema and new migration
   history without changing production. Run `pgloader` against a disposable
   target to produce a complete type/orphan/schema exception inventory.
3. Make application SQL and provider assumptions portable. Run the complete
   test suite on both MySQL and PostgreSQL during the transition.
4. Import a sanitized production snapshot into a Neon staging root, rehearse
   the application, background jobs, and Vercel branch-per-preview lifecycle,
   and verify connection/cold-start behavior. Disable payment, email/SMS,
   webhook, document-publication, and other production side effects.
5. Rehearse the exact full migration repeatedly. Record duration, rejected
   rows, sequence corrections, checksums, business aggregates, and the maximum
   acceptable maintenance window.
6. For cutover, stop all writes and workers, take the final point-in-time copy,
   run automated integrity/parity gates, switch runtime credentials, and smoke
   test while PlanetScale remains intact and read-only.
7. Resume writes only after the cutover gate passes. A rollback after Neon
   starts accepting writes requires an explicit reverse-data reconciliation;
   merely switching the connection string back would lose post-cutover writes.
8. Protect the Neon production branch on a paid plan, set a suitable history
   window, enable external `pg_dump` backups if the recovery policy requires
   provider-independent copies, and automate preview TTL/PR-close deletion.
9. Keep PlanetScale read-only for a defined observation window, then retire it
   only after restore testing, production metrics, and reconciliation evidence
   are accepted.

## Decision gates before approving Postgres

- Does the current production dataset fit 0.5 GB? If not, Neon Free cannot host
  a full pilot copy or production; price Launch/Scale using actual usage.
- Is a six-hour Free or seven-day Launch restore window adequate? If not, use
  Scale or add scheduled external backups.
- Do Vercel/Trigger workloads tolerate scale-to-zero cold starts, or must the
  production compute stay warm?
- Can all current data satisfy real PostgreSQL foreign keys, uniqueness, and
  type bounds after conversion?
- Have raw SQL, case-insensitive searches, MySQL error handling, and
  transaction/retry behavior passed parity tests?
- Is the business willing to schedule a write freeze for the supported
  `pgloader` cutover, or fund a separate heterogeneous CDC/dual-write design?
- Will previews contain real production data? If yes, are their access,
  masking, credential, audit, side-effect, retention, and deletion controls
  equivalent to the data's sensitivity?

## Bottom line

PlanetScale remains the lowest-change and strongest schema-deployment option.
Its existing curated preview branch can be made dependable, and occasional
Data Branching clones can cover rare full-fidelity investigations. It does not,
however, make a full-data branch per preview cheap or lightweight.

Neon materially improves the requested daily workflow: production-shaped
copy-on-write branches, Vercel preview automation, inexpensive branch deltas,
and a generous free development allowance. The trade is a real MySQL-to-
Postgres migration—not a connection-string change. With a new Prisma migration
baseline, explicit data/SQL compatibility work, repeated rehearsals, a final
write freeze, and strict parity gates, the migration is practical. The pilot
should prove those facts before GND commits to a production cutover.
