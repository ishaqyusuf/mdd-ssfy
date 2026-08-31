# AI Prompt Rules

## Purpose
Short prompt-level guardrails for future AI sessions working in this repository.

## Rules
- Treat `.brain/` as the durable source of project memory.
- Prefer updating existing Brain docs over creating duplicate planning files outside `.brain/`.
- Preserve current behavior notes and historical context when restructuring docs.
- Use `TODO:` markers for unknown implementation details instead of guessing.
- Keep Brain markdown concise, factual, and easy to diff.
- For Next.js work in `apps/dashboard`, `apps/dealership`, or shared React UI consumed by either app, always load and apply these skills before implementation or review:
  - `midday`
  - `vercel-react-best-practices`
  - `agency-engineering` using the Frontend Developer specialist unless the task clearly routes elsewhere
- When migrating or rebuilding an existing React/Next.js page, route, screen, or feature, also load `midday-migration-planner` in implementation mode and complete its migration contract and conformance audit.
- For Expo or React Native implementation and review, always load and apply `react-native-best-practices`, including its measure, optimize, re-measure, and validate workflow where performance is relevant.
- Apply this React/Next.js UI skill set especially to App Router pages/layouts, React components, data-fetching adapters, forms, shared package UI, and dealership quote/new-sales-form work.

## Non-Negotiable Architecture Rules
- Midday is the primary standard for production-grade dashboard, shell, table, sheet, and form architecture. Inspect `/Users/M1PRO/Documents/code/_kitchen_sink/midday` before changing equivalent areas.
- Use GND's existing `@gnd/ui` shadcn wrappers and primitives as the first choice for web UI composition, then style or compose them for the approved design. Do not introduce Chakra UI as a default or parallel component system.
- Use GND's existing apps and packages as the reference for domain behavior, naming, permissions, and shared package boundaries.
- Use Plot Keys as the real estate platform reference when planning property, parcel, or land-management workflows.
- Add `app/[...slug]/page.tsx` only when routes are intentionally slug-driven; keep route components thin and push reusable behavior into feature or package modules.
- For Prisma database updates, use the repository scripts and Prisma workflow; do not hand-write migration files.

<!-- personal-coding-rules:start -->
## Global Personal Coding Rules

Agents must treat these global coding rule references as non-negotiable:

- `/Users/M1PRO/.me/coding-standards/global.md`
- `/Users/M1PRO/.me/coding-standards/nextjs.md`
- `/Users/M1PRO/.me/coding-standards/expo.md`

Project-specific exceptions require an ADR in `.brain/decisions/` before agents may diverge.
<!-- personal-coding-rules:end -->
