# TryCompAI CRM: Best Use Case and GND Fit

Date: 2026-08-03  
Status: First-party source review  
Evaluated revision: [`6c3d724`](https://github.com/trycompai/crm/tree/6c3d7248dfa11559edd05746b72271428f9ed92d)  
Scope: Repository README, documentation, security policy, configuration, schema,
and source structure; no third-party reviews or marketing comparisons.

## Conclusion

The strongest use case is a **small, fully trusted, Google Workspace-based B2B
sales team that wants the CRM to build and refresh account intelligence from
email, meetings, signature blocks, and optional web sources with much less
manual data entry**. The product is deliberately centred on a durable research
agent: it works from a queue on its own schedule, researches contacts and
companies, records evidence-backed facts, proposes uncertain facts for human
review, and schedules follow-up research. It is not merely a conventional CRM
with a chat panel. ([README: product model](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/README.md#L33-L62),
[README: agent operation](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/README.md#L101-L154))

For **GND**, use it as an **account-intelligence sidecar or architectural
reference**, not as a replacement for GND's customer, sales-order, inventory,
payment, production, or fulfilment systems. A sensible pilot would mirror only
a bounded set of B2B companies, contacts, deal context, Gmail threads, and
meetings; let the agent produce contact briefs and evidence-backed enrichment;
then surface reviewed intelligence back to sales users. This is an inference
from its intentionally narrow domain model—companies, contacts, deals,
activities, email threads, calendar events, facts, briefs, and agent work—plus
its explicit single-tenant security design. ([Prisma schema](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/packages/db/prisma/schema.prisma#L88-L391),
[security assumptions](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/SECURITY.md#L14-L42))

## Why this is the best fit

- **It removes CRM data-entry work from relationship-driven sales.** The
  repository says most contacts are created by mailbox sync, while company
  logos, industry, and location can arrive through enrichment. The overview
  and list surfaces cover deals, contacts, companies, owner, stage, amount,
  close date, open pipeline, and overdue tasks. ([README screenshots and
  captions](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/README.md#L64-L99))
- **First-party relationship history remains useful without paid enrichment.**
  With optional vendor keys absent, the agent still reads internal email
  threads, meetings, and signature blocks. Perplexity, LinkedIn data via
  RapidAPI, Context.dev, and GitHub access extend that research rather than
  being required for the core loop. ([README: optional sources](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/README.md#L124-L136),
  [environment configuration](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/.env.example#L60-L80))
- **It is designed to avoid silently inventing customer facts.** Observations
  are converted into evidence bands; strong evidence may update the record,
  while weaker evidence becomes a proposal for a rep. The write path is
  documented to avoid overwriting human decisions and to require a primary
  source. ([README: evidence rule](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/README.md#L51-L57),
  [agent evidence design](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/docs/agent.md#L194-L210))
- **The agent is inspectable.** Each contact, company, and deal has a durable
  Agent conversation showing the steps taken, discarded leads, and ambiguity
  questions. This is useful for sales research where provenance matters more
  than an opaque enrichment score. ([README: agent panel](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/README.md#L148-L154),
  [agent record context](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/docs/agent.md#L344-L364))
- **It supports a modest self-hosted pilot.** Local setup needs Bun, Docker,
  Postgres, Google OAuth credentials, an auth secret, and a sign-in allow-list.
  The code is MIT licensed. ([quick start](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/README.md#L205-L218),
  [required configuration](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/README.md#L220-L248),
  [MIT license](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/LICENSE))

## Target user and company

Best fit:

- A founder-led, account-executive, partnerships, or customer-development team
  whose relationship history primarily lives in Gmail and Google Calendar.
- A small internal team where every admitted user is legitimately allowed to
  read and edit the entire pipeline.
- A technical company willing to operate a Next.js app, NestJS API, durable
  agent, Postgres database, Google sync scheduler, and model gateway.
- A workflow where better contact identity, company context, call preparation,
  and follow-up research are more valuable than heavyweight forecasting,
  territory controls, marketing automation, customer support, or ERP features.

The first two points follow directly from the mandatory Google sign-in/mail and
calendar design and the all-users-see-all-records authorization model. The last
two are adoption inferences from the published deployment topology and the
repository's bounded CRM schema. ([security policy](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/SECURITY.md#L14-L42),
[deployment topology](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/README.md#L158-L190),
[schema](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/packages/db/prisma/schema.prisma#L88-L391))

## Poor-fit cases

- **Teams requiring roles, record-level visibility, territories, or separate
  business units.** Any signed-in user can read and write every record; there
  are no organizations, roles, or per-record permissions. The maintainers
  explicitly say it is the wrong tool when users must see only part of the
  pipeline. ([security policy](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/SECURITY.md#L14-L24))
- **A public, customer-facing, or multi-tenant SaaS CRM.** The project says it
  is not a hardened public or multi-tenant service boundary. ([security
  policy](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/SECURITY.md#L14-L18))
- **Organizations unable to grant Gmail and Calendar access or act as data
  controller for mailbox-derived personal data.** Those permissions are a
  condition of sign-in, and the agent reads email bodies, attendees, and
  signature blocks. ([security policy](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/SECURITY.md#L32-L37))
- **A system of record for operational commerce.** The published schema covers
  a sales pipeline and relationship history, not orders, inventory, invoices,
  payments, production, delivery, or accounting. Treating it as a replacement
  for GND's operational domains would require substantial new product and
  authorization design; this is a source-based inference from the schema.
  ([Prisma schema](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/packages/db/prisma/schema.prisma#L88-L391))
- **Teams wanting a turnkey hosted CRM with minimal operations.** Production
  requires three coordinated deployments plus Postgres; Google sync also needs
  a protected scheduled call. ([deployment instructions](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/README.md#L250-L273),
  [sync-route security](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/SECURITY.md#L44-L50))

## Adoption caveats

1. **Permissions are the gating issue.** Do not connect real GND customer data
   until a bounded user cohort is approved for universal read/write access. If
   that is unacceptable, use the code only as a reference or add a real
   authorization model before piloting. ([security policy](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/SECURITY.md#L14-L30))
2. **Mailbox privacy needs explicit governance.** Define whose mailboxes may be
   connected, retention expectations, permitted research purposes, and who may
   inspect results. Operators can access the database, environment, and logs,
   while mailbox content includes people who never signed up for the CRM.
   ([security policy](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/SECURITY.md#L25-L37))
3. **Start with no optional enrichment keys.** The maintainers recommend adding
   vendors one at a time; vendor queries can send a name, email domain, and
   employer outside the deployment. ([security policy](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/SECURITY.md#L39-L42),
   [safe-deployment checklist](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/SECURITY.md#L52-L60))
4. **Budget for infrastructure and model operations.** Postgres is required;
   Vercel/Next.js, NestJS, and the agent are separate processes; AI Gateway is
   the model path; Redis and Blob storage are optional but affect shared cache
   and durable images. ([stack](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/README.md#L158-L190),
   [environment options](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/.env.example#L82-L108))
5. **Keep GND authoritative.** If a sidecar pilot proceeds, use stable external
   identifiers, an allow-listed projection, reviewed write-back, idempotent
   sync, and audit evidence. Do not allow the sidecar to mutate orders,
   financials, inventory, production, or fulfilment. This is the recommended
   GND integration boundary, inferred from the CRM's agent/API separation and
   its evidence-first write design. ([API boundary](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/docs/api.md#L36-L43),
   [evidence design](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/docs/agent.md#L194-L210))

## Recommended GND trial

Run a short, isolated pilot with one to three trusted B2B sales users and a
small set of non-sensitive accounts. Enable Google history first, leave all
external enrichment keys off, and measure:

- contacts and companies created or corrected without manual entry;
- briefs accepted versus rejected by sales users;
- preparation time saved before calls;
- false identity matches or incorrect proposed facts;
- mailbox/privacy incidents and operational burden;
- whether reviewed intelligence can be imported into GND without weakening
  GND's existing domain ownership.

Adopt it as a sidecar only if the intelligence quality and time saved outweigh
the permission model, mailbox governance, and three-service operating cost.
Otherwise, reuse its most valuable patterns inside GND: durable queued research,
evidence-priced facts, human settlement of ambiguity, explicit research
budgets, and a sandbox with neither database credentials nor outbound network
access. Those patterns are documented in the repository's agent design.
([durable task model](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/README.md#L101-L146),
[data and sandbox boundaries](https://github.com/trycompai/crm/blob/6c3d7248dfa11559edd05746b72271428f9ed92d/docs/agent.md#L286-L305))
