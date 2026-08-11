# Multi-Tenant SaaS Platform

## Status
Proposed on 2026-08-08. No SaaS tenant isolation, subscription billing, custom
domain automation, or tenant configuration implementation is authorized by this
document alone.

## Product Contract

GND will become one maintained SaaS product used by independent customer
companies. The top-level boundary is `Tenant`; an `Organization` is an
office/location inside a tenant. Dealers, staff, customers, storefront users,
and mobile workers are actors within a tenant and do not imply tenant ownership.

The initial operating model is guided B2B onboarding. Public self-service signup
is deferred until provisioning, imports, support, cost controls, abuse controls,
and tenant isolation are proven with multiple pilots.

## Delivery Target

The accelerated target is private-pilot readiness in 9-11 weeks and a guided
public commercial launch in 12-15 weeks. Delivery uses a structured,
AI-accelerated engineering workflow with approximately 32-35 focused development
hours per week, traceable work packages, automated QA, rapid decisions, reuse of
proven platform modules, and a tightly controlled launch scope. Architecture,
tenant isolation, data security, business correctness, provider integration,
and final release approval remain under experienced technical oversight.
Optional integrations and open self-service expansion remain post-launch unless
they fit without weakening the isolation and launch gates below.

## Tenant-Owned Data

Unless a future ADR explicitly classifies data as platform-global, tenant-owned
data includes:

- memberships, invitations, employees, roles, permission overrides, offices;
- customers, addresses, tax profiles, notes, communications;
- sales configuration overlays, custom components, price books, quotes/orders;
- inventory, suppliers, stock, inbounds, allocations, production, dispatch;
- payments, wallets, refunds, finance/accounting evidence;
- documents, PDFs, email attempts, public links, files, exports;
- settings, branding, domains, provider connections, webhooks, jobs, caches,
  usage, quotas, and audit.

Platform-global data is limited to reviewed product metadata such as the code
feature registry, sellable plan definitions, safe Sales Form template revisions,
platform support identities, and global operational configuration.

## Identity And Access

- A person may belong to more than one tenant through separate memberships.
- Sessions carry one verified active tenant and one permitted active office.
- Roles and permissions resolve inside the active membership, not from a global
  `roles[0]` assumption.
- Platform support access is explicit, time limited, reasoned, and audited.
- Hostnames and signed public tokens may resolve tenant context but never grant
  staff authorization by themselves.
- Tenant suspension, membership revocation, or domain removal invalidates
  relevant sessions/caches promptly.

## Feature Selection

Tenant capabilities are derived from versioned plan entitlements plus explicit,
audited overrides. Feature dependencies and disable behavior are declared in a
single registry. API, jobs, mobile, exports, public surfaces, and navigation all
enforce the same projection.

Recommended sellable modules:

- Core CRM/Admin
- Sales
- Inventory
- Production
- Dispatch/Mobile
- Community Projects/Units
- Customer Service/Work Orders
- HRM/Employees
- Contractor Jobs/Accounting
- Dealership
- Storefront
- Finance
- Communications/Documents

Final launch inclusion and packaging for these modules is intentionally pending
client completion of the scope questionnaire in the client-facing launch brief.

Disabling a module prevents new operations according to its contract while
retaining tenant data for approved read/export/retention. It is not deletion.

## Shared Sales Form Contract

All tenants use the package-owned canonical Sales Form engine and stable
component/step identities.

- Platform publishes immutable structural template revisions.
- Tenant pins a template revision and maintains draft/published overlays.
- Tenant may hide, rename, reorder, default, require, or expose allowed base
  components.
- Tenant may add tenant-only components. Inventory/production-impacting custom
  entries require explicit mappings; otherwise they remain sales-only.
- Tenant owns price books, profiles, coefficients, tax, currency, and effective
  dates. New tenant configuration contains no inherited GND price or cost.
- Saved sales snapshot the published configuration and price evidence.
- Platform upgrades are previewed and accepted; unresolved UID/compatibility
  conflicts block publish.
- Dashboard, dealership, storefront, mobile, PDF, inventory, and production
  resolve one shared contract with surface-specific capabilities.

## Billing And Payment Boundary

The platform subscription ledger bills tenants for the software. It is separate
from tenant operational payments collected from the tenant's customers.

- SaaS subscription: Stripe Billing candidate, versioned plans/add-ons/seats,
  checkout, portal, invoices, trials, webhook inbox, reconciliation, dunning,
  grace, suspension, cancellation, and entitlement projection.
- Operational commerce: existing Square behavior remains GND-scoped until a
  reviewed provider-connection model lets each tenant connect its own merchant.
- No subscription redirect or client flag directly grants features. Signed
  provider events update the local projection idempotently.
- No GND merchant credential, payout, sale payment, or customer payment is
  shared with another tenant.

## Domains And Branding

- Each tenant receives a platform subdomain.
- Eligible plans may verify one or more custom domains.
- Normalized hostname is globally unique and maps to one active tenant/purpose.
- DNS proof and provider/certificate state must pass before activation.
- Revocation and cache purge occur before reassignment.
- Tenant brand controls approved names, logos, colors, address, locale, time
  zone, currency, document template, and legal/footer content.

## Email And Documents

- Platform security/billing messages use the platform sender.
- Tenant operational messages use a verified tenant sender when available or a
  clearly identified platform sender plus tenant reply-to.
- Sender verification, bounce, complaint, attempt, quota, and suppression data
  is tenant scoped.
- Shared HTML/PDF renderers consume versioned tenant brand/configuration.
- Stored documents and snapshots are tenant owned; paths, signed links,
  retention, quotas, export, and purge include tenant context.

## Isolation Invariants

- Every tenant-owned write is stamped by trusted server context.
- Every read/detail/mutation includes tenant ownership or asserts it before use.
- Tenant identity is included in cache keys, job payloads, events, idempotency
  keys, webhooks, exports, analytics, object paths, and observability tags.
- Global unique constraints are reviewed and changed to tenant-scoped compound
  identity where business identity is tenant local.
- Tenant A must not observe Tenant B through search counts, errors, timings,
  IDs, autocomplete, public documents, logs, or provider metadata.
- PostgreSQL RLS is defense in depth, not a replacement for typed application
  scoping.

## Onboarding And Offboarding

Onboarding progresses through qualification, contract, provisioning,
configuration, dry-run data import, training, tenant UAT, final reconciliation,
go-live, and 30/60/90-day adoption review.

Offboarding defines subscription cancellation, access/grace state, export,
retention, legal hold, deletion approval, provider/domain disconnection, audit
retention, and final purge. Business data is never silently deleted merely
because a subscription is unpaid.

## Launch Gates

- GND successfully operates as tenant one after reconciled migration.
- At least two independent pilots pass cross-tenant positive/negative tests.
- Subscription, entitlement, domain, email, PDF, file, job, export, and merchant
  boundaries are production proven.
- Backup restore, RPO/RTO, incident, provider outage, suspension, export, and
  support-access runbooks are exercised.
- No open P0/P1 isolation, billing, payment, data-loss, or restore defect.
- Legal and support materials are approved for the chosen launch markets.

## Related Records

- `outputs/client-documents/GND-Millwork-SaaS-Launch-Brief.docx`
- `outputs/client-documents/GND-Millwork-SaaS-Launch-Brief.pdf`
- `.brain/plans/2026-08-08-feature-multi-tenant-saas-commercialization.md`
- `.brain/decisions/ADR-052-multi-tenant-company-boundary-and-shared-sales-configuration.md`
- `.brain/plans/2026-07-29-feature-office-organization-management-and-scoping.md`
- `.brain/plans/2026-08-04-planetscale-to-neon-postgres-migration.md`
- `.brain/decisions/ADR-017-storefront-shared-sales-configuration.md`
- `.brain/features/shared-document-platform.md`
- `.brain/features/sales-pdf-system.md`
- `.brain/features/sales-email-delivery-ledger.md`
