# AI Prompt Rules

## Purpose
Short prompt-level guardrails for future AI sessions working in this repository.

## Rules
- Treat `brain/` as the durable source of project memory.
- Prefer updating existing Brain docs over creating duplicate planning files outside `brain/`.
- Preserve current behavior notes and historical context when restructuring docs.
- Use `TODO:` markers for unknown implementation details instead of guessing.
- Keep Brain markdown concise, factual, and easy to diff.
- For Next.js work in `apps/www`, `apps/dealership`, or shared React UI consumed by either app, always load and apply these skills before implementation or review:
  - `vercel-react-best-practices`
  - `agency-engineering` using the Frontend Developer specialist unless the task clearly routes elsewhere
  - `agency-design` using the UI Designer specialist for interface work unless the task clearly routes elsewhere
  - `shadcn` for component-system usage, installed component checks, composition rules, and CLI/docs workflow
- Apply the Next.js skill set especially to App Router pages/layouts, React components, data-fetching adapters, forms, shared package UI, and dealership quote/new-sales-form work.
