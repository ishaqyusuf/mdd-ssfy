# MySQL Staging With Production-Like Data

Date: 2026-08-23
Status: Research and architecture recommendation
Scope: A MySQL staging database for GND that can be reached by Vercel Preview
and Trigger.dev Staging, with enough production-like data to validate the
`getOrders` projection rollout

## Executive recommendation

Do **not** use the ordinary local development database as a persistent Vercel
Preview or Trigger.dev Staging database. A local MySQL instance exposed through
an ngrok TCP endpoint is technically possible, but it should be treated as a
short-lived, attended integration-test fixture only. Its availability depends
on the Mac, Docker, the local network, and the ngrok agent all remaining online;
it also puts a copy of sensitive production data behind a public TCP address.

Use this order of preference:

1. **For the current one-time `getOrders` rollout:** use an isolated local
   Docker MySQL clone with a separate volume and credentials, seed it from the
   existing local production snapshot, mask unnecessary personal data, and
   expose it through ngrok only during an attended Trigger Staging test. Allow
   only Trigger's paid-plan static egress IP, require native MySQL TLS with CA
   verification, and close the tunnel immediately afterward. Do not point a
   generally accessible Vercel Preview deployment at this endpoint.
2. **For repeatable staging:** restore a masked logical dump into a small hosted
   MySQL service. Aiven Developer is the strongest low-cost candidate if the
   dataset fits its current 8 GB storage allowance; DigitalOcean Managed MySQL
   is a more conventional managed option starting at about $15.15/month.
3. **When exact PlanetScale/Vitess behavior is essential:** create a
   PlanetScale seeded data branch briefly, immediately downsize it after
   initialization, run the test, and delete it. PlanetScale bills a branch
   seeded from production as a production branch at the source size initially,
   but billing is prorated and PlanetScale explicitly permits downsizing after
   initialization. This is operationally safer and more faithful than exposing
   a laptop even if its short-lived cost is higher.

The testing goal does not normally require customers' literal names, emails,
addresses, phone numbers, payment references, or employee details. The
`getOrders` legacy and projection paths can be compared against the **same
masked clone**. Preserving table cardinality, relationships, null patterns,
status distributions, timestamps, text lengths, and indexes gives meaningful
correctness and performance evidence without duplicating every real-world
identity.

## Why an ordinary PlanetScale development branch is empty

For PlanetScale Vitess, a normal branch copies the schema, not the production
rows. PlanetScale's quickstart explicitly states that a development branch
created from production receives the same schema but no production data.
[PlanetScale Vitess quickstart](https://planetscale.com/docs/vitess/tutorials/planetscale-quick-start-guide)

PlanetScale's Data Branching feature can seed a new isolated branch from the
latest backup with the full schema and data. It cannot select a subset of
tables, does not keep the new branch synchronized with its base branch, and
does not merge data changes back. A branch seeded from production starts as a
production branch at the same resource size with the normal production
replicas and storage charges. PlanetScale says that the branch can be downsized
after initialization, billing is prorated, and it should be deleted when the
test is complete.
[PlanetScale Data Branching](https://planetscale.com/docs/vitess/schema-changes/data-branching)

This means the PlanetScale option is expensive as a continuously running
staging environment, but it can still be rational as a disposable test branch
for a few hours because it has the lowest engine-compatibility and networking
risk.

## Option 1: local Docker MySQL through ngrok TCP

### What works

ngrok supports raw TCP endpoints for non-HTTP services. Its agent establishes
long-lived TLS connections to ngrok's cloud gateway and forwards traffic to the
local upstream. Fixed TCP addresses are available by plan; free TCP addresses
can be randomly assigned after card verification, while Hobbyist includes one
and Pay-as-you-go supports more.
[ngrok agent](https://ngrok.com/docs/agent)
[ngrok pricing and limits](https://ngrok.com/docs/pricing-limits)

ngrok Traffic Policy can restrict a TCP connection to explicit source CIDRs.
Trigger.dev exposes static task egress IPs on its Regions page for paid plans,
so a Trigger Staging task can be allowlisted at the tunnel boundary.
[ngrok IP restriction](https://ngrok.com/docs/k8s/guides/how-to/restrict-ips)
[Trigger.dev task regions and static IPs](https://trigger.dev/docs/triggering#region)

Vercel is different by default: its outbound addresses are dynamic. Pro teams
can enable the Static IPs add-on and route Function/build egress through known
addresses; Enterprise Secure Compute provides a dedicated private-network
model. Without one of those products, a Vercel Preview deployment cannot be
safely represented by a narrow IP allowlist.
[Vercel fixed outbound IP guidance](https://vercel.com/kb/guide/can-i-get-a-fixed-ip-address)
[Vercel static IP announcement](https://vercel.com/changelog/static-ips-are-now-available-for-more-secure-connectivity)

### Required security controls

If this option is used, all of the following are requirements, not optional
hardening:

- Use a **separate Docker container or at least a separate named volume and
  schema**, not the developer's normal local database. A destructive staging
  migration or test must be unable to damage the daily development dataset.
- Create a dedicated database account scoped only to the staging schema. Never
  expose `root`. Grant only the reads and writes the rollout needs.
- Use a fixed ngrok TCP address for the test window so credentials are not
  repeatedly rewritten. Do not publish the connection string in logs or chat.
- Restrict the endpoint to Trigger's selected-region static IPs. If Vercel must
  connect, enable Vercel Static IPs and allowlist those addresses too; otherwise
  keep Vercel out of this test topology.
- Use MySQL's own TLS across the raw TCP endpoint and verify the server CA and
  hostname. MySQL documents that an unencrypted network connection exposes all
  traffic to an observer, supports TLS per connection, and can mandate secure
  transport. Prisma's MySQL connection options support `sslcert` and strict
  certificate acceptance.
  [MySQL encrypted connections](https://dev.mysql.com/doc/refman/8.4/en/encrypted-connections.html)
  [Prisma MySQL connection options](https://docs.prisma.io/docs/orm/v6/overview/databases/mysql)
- Disable every production side effect in the staging application: payment and
  Square writes, customer email/SMS, webhooks, document publication, and any
  production queue or storage credentials. A production-data clone must never
  imply production integration credentials.
- Put the ngrok process, Docker health, disk space, and machine power/network
  state under active observation. Close the endpoint immediately after the
  backfill and parity run.
- Rotate the staging database password when the test ends and remove the
  endpoint from both providers' environment variables.

### Reliability and performance consequences

The following is an inference from the providers' documented architecture:
the tunnel remains usable only while the local MySQL container, Mac, network,
and ngrok agent are all healthy. ngrok can reconnect when the network changes,
but a sleeping/restarting Mac or stopped Docker service still makes the
database unavailable. This is unsuitable for webhook-driven preview
deployments, unattended CI, scheduled Trigger tasks, or multi-day shadow
measurement.

The route also adds two public-network legs and a selected ngrok TCP point of
presence. It is therefore poor evidence for production database latency. It
can validate schema, task packaging, backfill correctness, retries, and parity;
it should not be used to decide whether production latency or Vercel Function
Duration has improved.

Serverless connection pressure remains important. Vercel recommends pooling
for relational databases because serverless instances can create enough
connections to exhaust a conventional database. Prisma likewise documents that
each concurrent function instance can own a pool and recommends small pool
sizes, reusing a client outside the handler, and limiting concurrency. For a
small staging MySQL server, keep the Prisma connection limit small and cap
Trigger task concurrency rather than allowing a backfill fan-out.
[Vercel connection pooling guidance](https://vercel.com/kb/guide/connection-pooling-with-functions)
[Prisma serverless connection management](https://docs.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections)

**Verdict:** acceptable for a one-time, attended Trigger staging validation;
not recommended as the standing Vercel Preview database.

## Option 2: small hosted MySQL restored from a logical dump

### Aiven for MySQL

Aiven is a fully managed MySQL service. Its current pricing lists Free with
1 GB storage, Developer at $5/month with 8 GB, and Hobbyist starting at
$19/month with 8 GB. The Developer tier is explicitly positioned for
non-production use. Aiven supports public MySQL access, CIDR IP filters, static
public IPs, CA-backed TLS connections, daily full backups plus binlog-based
point-in-time recovery, and powering a service off when it is not needed.
[Aiven MySQL pricing](https://aiven.io/pricing/mysql)
[Aiven MySQL network parameters](https://aiven.io/docs/products/mysql/reference/advanced-params)
[Aiven MySQL TLS connection](https://aiven.io/docs/products/mysql/howto/connect-from-mysql-workbench)
[Aiven MySQL backups](https://aiven.io/docs/products/mysql/concepts/mysql-backups)
[Aiven service power cycling](https://aiven.io/docs/products/mysql/howto/power-cycle-service)

This is the best low-cost managed candidate if the logical dataset fits. The
Free and Developer plans' published feature table says they do not include
connection pooling, so Vercel/Trigger still need conservative application pool
and concurrency limits. Use provider IP filtering with Trigger/Vercel static
egress; do not leave the documented default `0.0.0.0/0, ::/0` filter in place.

### DigitalOcean Managed MySQL

DigitalOcean provides fully managed MySQL. Its current smallest Basic Regular
plan is approximately $15.15/month for 1 GiB RAM, 1 vCPU, and 10–30 GiB disk.
Managed MySQL takes daily backups retained for seven days and can restore a new
cluster to the latest transaction or a selected point in time.
[DigitalOcean Managed Database pricing](https://www.digitalocean.com/pricing/managed-databases)
[DigitalOcean MySQL connection and TLS](https://docs.digitalocean.com/products/databases/mysql/how-to/connect/)
[DigitalOcean MySQL restore](https://docs.digitalocean.com/products/databases/mysql/how-to/restore-from-backups/)

This is a better standing staging database than a laptop tunnel: it is managed,
always reachable, TLS-capable, and sized more comfortably than Aiven Developer.
It costs more than the smallest Aiven tier but remains predictable. IP trusted
sources should contain only Trigger/Vercel static egress addresses.

### Railway MySQL

Railway can provision MySQL from the official MySQL Docker image. It is private
by default; enabling public access creates a TCP proxy and incurs network
egress charges. Railway supports volumes and scheduled volume backups, but its
own documentation classifies the database templates as **unmanaged**, leaving
backup strategy, tuning, security, monitoring, and maintenance to the user.
[Railway MySQL](https://docs.railway.com/databases/mysql)
[Railway database responsibility](https://docs.railway.com/databases)
[Railway volume backups](https://docs.railway.com/volumes/backups)

This is operationally cleaner than a home tunnel but weaker than managed Aiven
or DigitalOcean for sensitive production-like data. Its TCP proxy is publicly
reachable, and the official docs do not establish an inbound TCP source-IP
allowlist equivalent in the cited MySQL workflow. Prefer it only if the team is
comfortable owning MySQL security and recovery.

### Render MySQL

Render does not offer managed MySQL. Its official pattern runs MySQL as a
private service with a persistent disk. Private services are reachable only by
other Render services on the same private network, so Vercel and Trigger cannot
connect directly. Render also warns that disk snapshots should not be used to
restore a custom database because corruption can result; it recommends logical
`mysqldump` backups instead.
[Render MySQL](https://render.com/docs/deploy-mysql)
[Render private services](https://render.com/docs/private-services)
[Render persistent disk limitations](https://render.com/docs/disks)

Making Render work would require an additional public TCP proxy or relocating
the callers into Render, which defeats the objective. It is not recommended
for this GND staging path.

## Option 3: dump, mask, subset, and restore

MySQL Shell provides parallel, compressed `dumpInstance`, `dumpSchemas`, and
`dumpTables` utilities and a corresponding `loadDump`. It supports selecting
schemas or tables, dry runs, and consistent InnoDB dumps. Traditional
`mysqldump --single-transaction` can also make an online consistent InnoDB
backup without locking tables.
[MySQL Shell dump utilities](https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-utilities-dump-instance-schema.html)
[MySQL backup methods](https://dev.mysql.com/doc/refman/8.4/en/backup-methods.html)

For GND, prefer a **full-schema, masked-data clone** over an arbitrary table
subset. `getOrders` traverses related customer, address, production, dispatch,
payment, notification, and status structures; hand-selecting tables risks
missing relations and invalidating query behavior. A safe pipeline is:

1. Take a consistent logical snapshot from production into encrypted temporary
   storage with restrictive filesystem permissions.
2. Restore into an isolated local/hosted MySQL target that exactly matches the
   repository schema and relevant MySQL version/settings.
3. Deterministically pseudonymize direct identifiers while retaining row
   counts, foreign keys, nullability, lengths, timestamps, status values, and
   search-shape diversity. Remove tokens, secrets, raw payment payloads,
   document bodies, and provider credentials entirely.
4. Validate table counts, required relationship counts, indexes, and a fixed
   set of checksums/aggregates that do not expose personal values.
5. Give the Vercel/Trigger staging applications new environment-scoped
   credentials and non-production integration keys.
6. Set a deletion date. Destroy the target and temporary dump after the rollout
   evidence is captured.

The European Commission's official GDPR guidance is useful even where local
law is the primary regime: it states that personal data should be limited to
what is necessary, retained for the shortest practical period, protected for
integrity/confidentiality, and anonymized where possible. OWASP's API Security
guidance likewise says to avoid production data in non-production API
deployments.
[European Commission data-protection principles](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en)
[OWASP API Security Top 10, API9](https://owasp.org/API-Security/editions/2019/en/dist/owasp-api-security-top-10.pdf)

**Exact production rows should be the exception, not the default.** If an
unmasked copy is temporarily unavoidable, classify the staging environment as
production-sensitivity: equivalent access control, encryption, auditability,
retention, incident response, and vendor/data-processing review.

## Decision matrix

| Option | Production-data fidelity | Reliability | Network control | Operational burden | Cost shape | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| Ordinary local DB + ngrok | High but unsafe coupling | Low | Good only with paid static egress + ngrok allowlist + MySQL TLS | High and attended | Low direct cost | **Do not use** |
| Isolated local Docker clone + ngrok | High | Low | Good for Trigger paid static IP; Vercel needs Static IPs add-on | Moderate/high | Low direct cost | **One-time attended test only** |
| PlanetScale seeded data branch | Exact Vitess behavior | High | PlanetScale-managed | Low | Potentially high, but prorated and can downsize/delete | **Best for brief highest-fidelity test** |
| Aiven Developer/Hobbyist | Standard MySQL, dump-based | High | CIDR filter + TLS; no pooler on smallest tiers | Low | $5/$19 monthly if capacity fits | **Best low-cost standing candidate** |
| DigitalOcean Managed MySQL | Standard MySQL, dump-based | High | Trusted-source model + TLS | Low | Starts about $15.15 monthly | **Best conventional managed candidate** |
| Railway MySQL | Standard MySQL, dump-based | Medium | Public TCP proxy; provider labels template unmanaged | Medium/high | Usage + egress | Secondary option |
| Render custom MySQL | Standard MySQL, dump-based | Medium | Private to Render; not directly reachable from Vercel/Trigger | High | Service + disk | Not recommended |

## Proposed rollout for the current `getOrders` work

1. Keep Vercel production and preview read-model mode `off`.
2. Create a separate local Docker MySQL clone and volume from the existing
   synchronized local snapshot; do not use the daily development schema.
3. Apply deterministic masking/removal to data irrelevant to `getOrders`
   parity and disable external side effects.
4. Deploy Trigger tasks to its independent staging environment. Trigger's
   official CLI supports `deploy --env staging`; staging has its own current
   version and API key on Hobby and Pro plans.
   [Trigger.dev staging deployments](https://trigger.dev/docs/deployment/overview#staging-deploys)
5. Pin Trigger to a region, retrieve its static egress IPs, and expose the
   clone only through a fixed ngrok TCP endpoint restricted to those IPs.
6. Run migration reconciliation, projection backfill, retries, idempotency,
   and legacy-versus-projection parity. Cap database and task concurrency.
7. Tear down the tunnel, rotate credentials, and delete the copy or retain it
   offline with a fixed expiry date.
8. For Vercel Function Duration and real latency proof, use controlled
   production shadow mode against PlanetScale with reads still served by the
   legacy path. A laptop-tunnel result is not representative of production.
9. If GND wants ongoing Preview integration tests, provision Aiven or
   DigitalOcean and automate a periodic masked refresh. Do not turn the local
   tunnel into permanent infrastructure.

## Bottom line

The user's local-ngrok proposal is workable for the immediate Trigger staging
packaging/backfill test **only after isolation, masking, TLS, static-IP
allowlisting, concurrency caps, and side-effect shutdown**. It should not become
the database behind ordinary Vercel preview deployments.

For a repeatable environment, a small managed MySQL restored from a masked dump
is the best balance. For the one test where exact PlanetScale/Vitess semantics
matter, a short-lived seeded PlanetScale branch—downsized and deleted promptly—
is safer and likely cheaper in engineering time than operating a public tunnel
to a laptop.
