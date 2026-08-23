# PlanetScale Preview Branch Verification

Date verified: 2026-08-23
Scope: PlanetScale Vitess (MySQL-compatible) only
Sources: current official PlanetScale documentation only

## Implementation status

- Created the schema-only `preview` development branch for the `gndprodesk`
  database in `us-east-1` on 2026-08-23.
- The branch was created from the production branch with **Seed data: None**;
  PlanetScale identified it as a development branch after provisioning.
- Created the permanent, branch-scoped `vercel-preview` read/write credential
  and configured it as the sensitive `DATABASE_URL` for Vercel Preview only.
  Production and Development retain their existing database configuration.
- Synchronized the complete current Prisma schema to `preview` with no reset or
  data-loss acceptance. The temporary schema-admin credential was revoked after
  the push.
- Imported exactly 150 representative sales orders and their referential graph,
  including 55 internal users, 562 order items, 582 status rows, 420 quantity
  controls, 184 production assignments, 57 submissions, 101 payments, 40
  deliveries, and the related inventory, inbound, authorization, and projection
  records.
- Customer, address, order-note, token, and external-payment data is sanitized;
  internal employee email addresses and existing local password hashes are
  retained intentionally so the same local test logins work in Preview. The
  one-time read/write seed credential was revoked immediately after the import.
- The Preview URL takes effect on new Vercel Preview deployments; an existing
  deployment must be redeployed before it will use the new credential.

## Bottom line

For a persistent Vercel preview database, the low-cost PlanetScale path is to
create a normal, schema-only Vitess development branch and load a deliberately
small, sanitized fixture set (for example, 100–200 representative sales orders
plus dedicated preview users). A PlanetScale Data Branching® clone from
production is materially different: PlanetScale copies the latest backup in
full, creates the branch as a production branch at the source production
cluster size with two replicas, and bills it accordingly until it is resized or
deleted.

The curated development branch can serve preview/testing traffic, but it is not
production-grade: it has reduced resources, a single MySQL node, no production
HA posture, and no automatic data synchronization with production. Those are
acceptable constraints for controlled preview use, not for customer-facing
production traffic.

## 1. Normal development branches are schema-only

- A Vitess branch is an isolated MySQL database instance. Changes to either
  schema or data in one branch do not affect another branch.
- Creating a normal development branch from a base branch copies the source
  branch's schema, not its data. The new branch starts with no application data.
- PlanetScale explicitly describes a development branch with safe migrations
  as a possible staging branch, while noting that it retains reduced development
  resources.

Source: [PlanetScale Vitess branching](https://planetscale.com/docs/vitess/schema-changes/branching)

### Implication for GND

Loading 100–200 selected sales orders after creating the branch is a GND-owned
seed/import operation; it is not PlanetScale Data Branching®. The resulting
database remains an isolated development environment. PlanetScale's docs do not
claim that manually inserting fixture data promotes a normal development branch
to production status.

## 2. Data Branching from production is a full, point-in-time clone

When Data Branching® is enabled, PlanetScale offers a “From most recent backup”
seed option. For a production source:

- PlanetScale chooses the latest backup; the user cannot choose another backup.
- PlanetScale copies all schema and all data. It cannot filter the clone to
  selected tables or selected rows.
- The copied data is only a point-in-time seed. PlanetScale does not keep the
  branch synchronized with production.
- Data changes in the seeded branch are not merged into the base branch through
  a deploy request; PlanetScale deploy requests concern schema, not data sync.
- A branch seeded from a production branch is created as a production branch at
  the same resource size as its source and includes the two default production
  replicas.

Source: [PlanetScale Data Branching®](https://planetscale.com/docs/vitess/schema-changes/data-branching)

### Implication for GND

PlanetScale's native production-data clone cannot directly produce a reduced
100–200-order preview dataset. GND would first pay to create a complete
production-sized clone and would still need a separate pruning/sanitization
process. It also creates a complete additional copy of production customer and
authentication data, which is a much larger security surface than a curated
fixture database.

## 3. Seeded production clones can be downsized, but initial billing still applies

PlanetScale says it initially uses the source production branch's resource size
so the full dataset can initialize reliably. After initialization, the branch
may be downgraded from the Clusters page.

- Compute and storage charges apply while the clone exists, including storage
  for the primary and two replicas.
- Billing is prorated, so the larger source size is charged for the time before
  the resize completes and the lower size applies afterward.
- PlanetScale recommends downsizing the seeded branch and deleting it when it is
  no longer needed.
- Only one production branch is included in the Base plan. Additional
  production branches are separately billed clusters.

Sources:

- [PlanetScale Data Branching® billing FAQ](https://planetscale.com/docs/vitess/schema-changes/data-branching)
- [PlanetScale plans and billing](https://planetscale.com/docs/planetscale-plans)
- [PlanetScale Vitess pricing](https://planetscale.com/docs/vitess/pricing)

### Important distinction

Downsizing a production-seeded clone reduces its ongoing cost; it does not turn
the operation into the same low-cost path as starting with an ordinary
schema-only development branch. The clone begins as an extra production branch,
with full data and production replicas.

## 4. Persistent development-branch cost and service constraints

For Vitess on the Base plan:

- Development branches run as `PS-DEV` and are billed for running time,
  prorated to the millisecond.
- Each database includes two times the number of hours in the current month as
  development-branch time: approximately 1,440 hours in a 30-day month. This is
  equivalent to two development branches running continuously for the month.
- Usage beyond that included pool is approximately `$0.014/hour` (PlanetScale
  expresses it as roughly `$10 / hours_in_current_month`).
- Development storage uses one primary rather than three production copies;
  PlanetScale documents development storage at `$0.50/GB`, subject to the
  plan's included storage terms.
- A Vitess development branch has one MySQL node and one VTGate. It is intended
  for development/testing, not production workloads, and does not have the
  production branch's primary-plus-two-replica HA layout.
- PlanetScale recommends deleting development branches when no longer needed;
  branch usage is billed only for the time they run.

Sources:

- [PlanetScale plans and billing](https://planetscale.com/docs/planetscale-plans)
- [PlanetScale Vitess pricing](https://planetscale.com/docs/vitess/pricing)
- [PlanetScale Vitess architecture](https://planetscale.com/docs/vitess/architecture)
- [PlanetScale Vitess branching](https://planetscale.com/docs/vitess/schema-changes/branching)

### Persistent preview interpretation

One always-on preview development branch consumes roughly half of the included
monthly development-branch-hour pool. One additional always-on development
branch would approximately consume the other half. Short-lived CI or developer
branches share the same pool, so GND should monitor branch hours if it keeps both
preview and development branches permanently running.

PlanetScale's public documentation does not state a simple numeric maximum
count of concurrently created development branches on the Base plan. It does
document a usage limit in its API and directs customers to the organization
billing page for current branch-hour consumption. Therefore, the account's live
limits should be confirmed in the PlanetScale dashboard/API rather than inferred
from the included-hour allowance.

## 5. Recommendation for GND preview

Use one persistent schema-only PlanetScale development branch for preview, then
seed it with a referentially complete, sanitized subset:

1. Apply the current Prisma schema/migrations to the branch.
2. Seed internal users from the local development database. Retaining their
   email addresses and password hashes is an explicit, reviewed requirement so
   existing local test logins work; clear remember/verification/session tokens
   and do not source users directly from production.
3. Seed 100–200 sales orders chosen to cover representative workflows: quote,
   paid/unpaid, assignment, submission, production, packing, dispatch, inbound,
   payment/refund, Special Order, and relevant legacy shapes.
4. Include every dependency needed by those orders—organization, customer,
   addresses, items/components, controls/stats, assignments, submissions,
   deliveries, payments, inventory/inbound links, notes, and projection rows—or
   rebuild derived records after importing canonical facts.
5. Point only Vercel Preview environment credentials at this branch. Never use
   the production credential as a fallback.
6. Refresh the dataset explicitly through a repeatable reset-and-seed process;
   do not expect PlanetScale to synchronize it with production.
7. Track `PS-DEV` branch hours and storage, and remove obsolete branches.

This recommendation is an engineering inference from the verified PlanetScale
behavior above. PlanetScale officially supports development branches as isolated
development/testing or staging environments, but GND owns the correctness,
sanitization, and repeatability of the selective seed.

## Decision comparison

| Option | Initial data | PlanetScale branch class | Ongoing fidelity | Cost posture | Fit for GND preview |
| --- | --- | --- | --- | --- | --- |
| Normal development branch + curated seed | Schema plus GND-selected rows | `PS-DEV` development | Explicit refresh only | Uses shared dev-hour pool; small storage footprint | Recommended |
| Data Branching® from production, then downsize | Complete latest production backup | Starts as production at source size with two replicas | Point-in-time only; no sync | Additional production compute and three-copy storage until resize/delete | Useful only for short-lived full-fidelity investigation |
| Empty branch with no seed | Schema only | `PS-DEV` development | None | Lowest data/storage burden | Insufficient for sales workflow preview |
