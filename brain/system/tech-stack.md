# Tech Stack

## Purpose
Snapshot of the main tooling and framework choices in the repository.

## Workspace and Tooling
- Package manager: Bun (`bun@1.3.9`)
- Monorepo orchestration: Turborepo (`turbo@2.5.8`)
- Type system: TypeScript
- Formatting: Biome
- Dependency consistency: `check-dependency-version-consistency`
- Unused/dead-code analysis: `knip`

## Frontend and Runtime Libraries
- React 19
- `react-dom` 19
- `zod` for schema validation
- `framer-motion` for motion/animation use cases

## Repository Conventions
- Workspaces are defined under `apps/*`, `packages/*`, and `tooling/*`.
- Common dev flows run through root scripts such as `bun run dev`, `bun run build`, `bun run lint`, and `bun run typecheck`.
- Turbo tasks expose workspace-specific build, dev, database, lint, and typecheck flows.
