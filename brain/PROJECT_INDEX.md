# Project Index

## Purpose
Concise map of the repository so contributors can quickly find the main runtime surfaces and shared modules.

## Applications
- `apps/www`: primary web application
- `apps/api`: API service and server-side query/mutation layer
- `apps/expo-app`: mobile application
- `apps/site`: additional web surface
- `apps/gnd-backlog`: backlog-focused application surface

## Shared Packages
- `packages/db`: database schema, migrations, and generated client support
- `packages/sales`: sales-domain modules including control, payment-system, resolution-system, and pdf-system work
- `packages/documents`: shared document metadata and lifecycle helpers
- `packages/ui`: shared UI components
- `packages/auth`: shared auth utilities
- `packages/notifications`: notification adapters and shared flows
- `packages/jobs`: background and task-oriented logic
- `packages/utils`: shared utilities
- `packages/email`, `packages/pdf`, `packages/printer`, `packages/square`, `packages/settings`, `packages/community`, `packages/events`, `packages/logger`, `packages/dev-logger`, `packages/site-nav`, `packages/app-store`: domain and platform support packages

## Supporting Directories
- `brain`: project memory and execution documentation
- `ai`: design references, evidence capture, and planning artifacts
- `scripts`: operational and reporting scripts
- `types`: shared type declarations
- `skills`: local skill helpers and support material

## Delivery Tooling
- Workspace/package manager: Bun
- Task orchestration: Turborepo
- Formatting: Biome
- Dependency consistency: `check-dependency-version-consistency`
