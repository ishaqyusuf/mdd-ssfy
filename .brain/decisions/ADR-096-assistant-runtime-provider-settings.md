# ADR-096: Dashboard-controlled Assistant runtime provider

## Status

Accepted — 2026-09-14

## Context

The Assistant supports several AI SDK providers, but changing provider/model only
through deployment environment variables made demos and controlled rollout slower.
The Sales Request settings already establish the expected Super Admin dashboard
pattern. API credentials must remain outside application data, and an administrator
change must not alter an in-flight run.

## Decision

Store one global, optimistic-versioned Assistant provider/model selection and an
immutable event for every saved version. Expose it only on the existing standard
`/settings/assistant` dashboard and through Super Admin tRPC procedures. The UI
shows only credential presence and disables saving a provider whose
`ASSISTANT_<PROVIDER>_API_KEY` is missing.

Resolve the global selection when the server creates a run and persist the exact
`provider:model` identity on that run. Execution reconstructs the runtime from the
persisted identity. Environment provider/model values remain the bootstrap and
safe fallback when no valid database selection exists.

## Consequences

- Super Admins can switch allowlisted providers and models without a deployment.
- API keys remain environment-only and never enter database rows, tRPC payloads,
  browser state, audit events, or chat history.
- Existing runs remain reproducible when the global selection changes.
- Provider/model catalog changes must preserve validation or surface an invalid
  persisted setting that falls back safely for new runs.
