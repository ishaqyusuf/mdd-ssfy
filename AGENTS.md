# GND Agent Instructions

## Brain Protocol

`brain/` is the persistent project memory. Use it before, during, and after every task so work is discoverable across sessions.

Before starting work:

- Read the relevant Brain files for the task. Start with `brain/BRAIN.md`, `brain/SYSTEM_OVERVIEW.md`, `brain/system/overview.md`, `brain/system/architecture.md`, `brain/engineering/ai-rules.md`, `brain/engineering/coding-standards.md`, `brain/tasks/in-progress.md`, and `brain/progress.md` when present.
- For sales, inventory, payments, production, customer, employee, or dashboard work, read the matching file under `brain/features/`, `brain/plans/`, `brain/handoffs/`, or `brain/decisions/`.
- For API, permission, database, migration, or sync work, read the matching files under `brain/api/` and `brain/database/`.

After code changes:

- Run a Brain documentation impact check before finishing.
- Update `brain/database/schema.md`, `brain/database/relationships.md`, or `brain/database/migrations.md` for database changes.
- Update `brain/api/endpoints.md`, `brain/api/contracts.md`, or `brain/api/permissions.md` for API, contract, auth, or permission changes.
- Update or create `brain/features/<feature>.md` for feature behavior changes.
- Add an ADR under `brain/decisions/` for durable architecture, product, integration, or implementation decisions.
- Update `brain/tasks/backlog.md`, `brain/tasks/in-progress.md`, `brain/tasks/done.md`, `brain/tasks/roadmap.md`, or `brain/progress.md` when task state changes.
- If no Brain update is needed, state that explicitly in the final response with the reason.

Final responses must include the Brain files updated, or `No Brain documentation updates required` with a short rationale.

## Project Commands

- Package manager: `bun`.
- Start the full dev stack with `bun run dev`.
- Start the main web app with `bun run www`.
- Start dealership work with `bun run dealership`.
- Start jobs with `bun run jobs` or `bun run www:jobs`.
- Start mobile work with `bun run mobile`.
- Run database generation with `bun run db:generate`.
- Run database migrations with `bun run db:migrate`.
- Sync production data locally only when asked, using the dry run first: `bun run db:sync:dry-run`.
- Validate broad changes with `bun run typecheck` and the narrowest relevant build, lint, or script-level test.

## Engineering Rules

- Preserve the existing Turborepo layout under `apps/`, `packages/`, and `tooling/`.
- Prefer existing shared packages, query helpers, document-generation utilities, and UI patterns before adding new abstractions.
- Do not edit secrets in `.env*` files unless the user explicitly asks.
- Be especially careful around sales, payment, inventory, production, and customer workflows; document behavior changes in Brain before closing the task.
- Keep changes scoped to the requested task and avoid unrelated formatting churn.
