# ADR: Server-owned proposals for consequential Assistant actions

- Status: Accepted
- Date: 2026-09-13

## Context

The Assistant must support artifacts and later business mutations without allowing model output, stale browser state, retries, or forged confirmations to become execution authority.

## Decision

Consequential actions use a server-owned proposal state machine. The proposal stores the registered tool/version, validated payload, server-derived review, target revision, hashed nonce, exact request fingerprint, expiry, execution lease, and durable outcome. The browser receives the one-time confirmation token outside the model/transcript path. Confirmation reauthorizes and atomically advances both the proposal and its parent run before execution.

The model-facing MCP catalog excludes non-direct effects. Trusted read results may emit a strict typed UI action that creates a proposal through the authenticated API. The action carries only reviewed tool input and never carries an approval token.

## Consequences

- Double clicks and UI retries cannot repeat a claimed effect.
- Unknown outcomes require status/reconciliation instead of automatic replay.
- Current permission and row visibility control terminal-result retrieval.
- Every newly activated write, send, destructive, or artifact tool must define a proposal preflight and use this boundary.
- The schema change is additive and requires migration `20260913220000_assistant_proposal_execution` in each environment.
