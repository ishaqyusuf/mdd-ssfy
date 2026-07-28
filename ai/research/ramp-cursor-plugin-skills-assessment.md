# Ramp Cursor Plugin Skills: Usefulness for GND

Date: 2026-07-28

Source snapshot: [`ramp-public/cursor-plugin` commit `d3f9e16`](https://github.com/ramp-public/cursor-plugin/tree/d3f9e168889cbd540602c66a958e97c0d4514052)

## Verdict

This is a useful pattern for GND, provided it is treated as an **agent execution
playbook layer**, not as a replacement for `.brain` and not as a security
boundary.

The strongest version for GND would start as an internal operator/developer
feature: a small set of repo-owned skills that teach an agent how to complete
high-frequency, high-risk workflows through typed APIs or a purpose-built CLI.
A customer-facing autonomous agent would require substantially more product,
security, support, and audit work.

## What the Ramp feature actually is

Ramp packages four complementary pieces:

1. **On-demand workflow skills.** Fourteen `SKILL.md` files describe when a
   workflow should trigger, commands to run, ordering, output shape,
   non-negotiable rules, handoffs, and known API/CLI quirks. The collection
   covers analysis, approvals, transaction cleanup, bills, procurement, cards,
   reimbursements, travel, and purchases
   ([plugin README](https://github.com/ramp-public/cursor-plugin/blob/d3f9e168889cbd540602c66a958e97c0d4514052/README.md)).
2. **An execution channel.** Skills can drive the authenticated Ramp CLI, while
   the plugin also configures Ramp's remote MCP endpoint
   ([`mcp.json`](https://github.com/ramp-public/cursor-plugin/blob/d3f9e168889cbd540602c66a958e97c0d4514052/mcp.json)).
   The skills are instructions; the CLI/MCP tools are what read or mutate data.
3. **An always-on safety policy.** `ramp-safety` requires detail review and
   confirmation before writes, role-aware failure handling, full pagination,
   stable-ID deduplication, and careful money conversion
   ([`ramp-safety.mdc`](https://github.com/ramp-public/cursor-plugin/blob/d3f9e168889cbd540602c66a958e97c0d4514052/rules/ramp-safety.mdc)).
4. **Distribution and maintenance.** A shortcut command composes the approval
   skill with the safety rule
   ([`/ramp-approvals`](https://github.com/ramp-public/cursor-plugin/blob/d3f9e168889cbd540602c66a958e97c0d4514052/commands/ramp-approvals.md)),
   while a daily workflow mirrors canonical skills from `ramp-cli` and opens a
   reviewable PR on drift
   ([sync workflow](https://github.com/ramp-public/cursor-plugin/blob/d3f9e168889cbd540602c66a958e97c0d4514052/.github/workflows/sync-skills.yml)).

The pattern is therefore:

> discoverable workflow recipe + authenticated tools + global guardrails +
> reviewable lifecycle

It is not merely a folder of reusable prompts.

## Representative skills and why they are valuable

- [`spend-analysis`](https://github.com/ramp-public/cursor-plugin/blob/d3f9e168889cbd540602c66a958e97c0d4514052/skills/spend-analysis/SKILL.md)
  encodes domain knowledge that a generic agent would easily miss: card
  transactions and bill payments must both be queried, results must be fully
  paginated, refunds need special parsing, and vendor variants need stable-ID
  deduplication.
- [`approval-dashboard`](https://github.com/ramp-public/cursor-plugin/blob/d3f9e168889cbd540602c66a958e97c0d4514052/skills/approval-dashboard/SKILL.md)
  turns several separate queues into one review workflow. It specifies
  parallel reads, detail-before-action, explicit confirmation, rejection
  reasons, partial-failure reporting, and deep-link handoff where the CLI
  cannot complete an operation.
- [`transaction-cleanup`](https://github.com/ramp-public/cursor-plugin/blob/d3f9e168889cbd540602c66a958e97c0d4514052/skills/transaction-cleanup/SKILL.md)
  scopes to the current user's records by default, distinguishes user-provided
  from agent-inferred fields, documents awkward payload shapes, and requires a
  proposed bulk-edit plan before execution.
- [`agentic-purchase`](https://github.com/ramp-public/cursor-plugin/blob/d3f9e168889cbd540602c66a958e97c0d4514052/skills/agentic-purchase/SKILL.md)
  is the fullest example of a stateful procedure: purpose-fit fund selection,
  preauthorization, single-use credentials, visible browser checkout,
  stop-and-handoff conditions, and post-purchase compliance work.

Their main usefulness is **reliability through procedural memory**. They turn a
raw tool catalog into repeatable business workflows and retain details that
would otherwise be rediscovered on every task.

## Relationship to GND's `.brain`

The two layers solve different problems:

| Layer | Primary question | Best content |
| --- | --- | --- |
| `.brain` | What is the system, why is it this way, and what is currently true? | Architecture, feature contracts, ADRs, task state, progress, handoffs |
| Workflow skill | How should an agent safely perform this operation right now? | Trigger conditions, preflight, exact tools, sequencing, confirmations, validation, failure/handoff behavior |

GND should keep `.brain` canonical. A skill should link to relevant Brain
contracts and execute them; it should not copy feature history, task ledgers,
or architecture prose. Otherwise both layers will drift.

This pattern is particularly relevant because GND already has correctness-
critical sales, payments, inventory, production, customer, migration, and
deployment workflows. Candidate pilots are:

1. **Inventory reconciliation:** read-only evidence first, exact candidate
   review, explicit apply confirmation, bounded repair, and post-apply proof.
2. **Sales order status transition:** permission and inventory preflight,
   affected-order preview, explicit write confirmation, task monitoring, and
   audit evidence.
3. **Release health verification:** narrow build/typecheck gates, deployment
   status, public health check, and a clear operator handoff when privileged
   production access is required.

## Tradeoffs and risks

- **Instructions are not enforcement.** A model can misunderstand or skip text.
  Permissions, validation, idempotency, transaction safety, audit logs, and
  destructive-action controls must remain server-side.
- **Procedural knowledge can contradict itself.** In this snapshot, the global
  safety rule describes bill amounts as numeric dollars, while
  `approval-dashboard` and `manage-bills` say bill amounts are cents and should
  be divided by 100
  ([safety rule](https://github.com/ramp-public/cursor-plugin/blob/d3f9e168889cbd540602c66a958e97c0d4514052/rules/ramp-safety.mdc),
  [approval skill](https://github.com/ramp-public/cursor-plugin/blob/d3f9e168889cbd540602c66a958e97c0d4514052/skills/approval-dashboard/SKILL.md),
  [bill skill](https://github.com/ramp-public/cursor-plugin/blob/d3f9e168889cbd540602c66a958e97c0d4514052/skills/manage-bills/SKILL.md)).
  That apparent inconsistency may be endpoint-specific, but it still shows why
  executable contract tests and typed money units are safer than prose alone.
- **Maintenance is real.** Every API, flag, permission, route, and output-shape
  change can stale a skill. Ramp's automated PR sync reduces distribution
  drift, but review and behavioral tests are still necessary.
- **Large skills consume attention.** Overly broad or verbose recipes can make
  the agent slower and less reliable. Prefer narrow workflows with progressive
  references.
- **Sensitive operations enlarge the threat surface.** Payment credentials,
  customer data, browser sessions, logs, and prompt/tool output need least-
  privilege access, redaction, short lifetimes, and clear human handoff.
- **Tool dependency limits portability.** A skill is only useful when its
  expected CLI/MCP commands exist and are authenticated in the current agent
  environment.

## Recommended GND shape

Pilot three to five high-frequency workflows. For each:

- Keep the durable feature/architecture truth in `.brain`.
- Give the skill a narrow trigger and explicit “do not use for” boundaries.
- Use typed, machine-readable tools with stable identifiers and bounded
  pagination.
- Separate read/plan from write/apply; require an exact preview and explicit
  confirmation for consequential mutations.
- Enforce permissions, invariants, idempotency, and audit evidence in code.
- Define validation and human-handoff behavior, including partial failures.
- Add fixture-based contract tests or dry-run snapshots for commands and
  response units.
- Keep one canonical skill source and publish changes through reviewable diffs.

If the pilot measurably reduces repeated investigation, operator errors, and
time-to-completion, it is worth expanding. If it mainly restates Brain docs or
UI instructions without dependable execution tools, it will add maintenance
cost without much leverage.
