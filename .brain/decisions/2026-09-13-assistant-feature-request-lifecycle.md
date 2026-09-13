# ADR: Durable Assistant feature request lifecycle

## Status
Accepted — 2026-09-13

## Context
The Assistant must distinguish a genuinely missing capability from access denial, missing prerequisites, ambiguity, outages, and partial rollout. A user may ask developers to add a missing feature and may separately opt into a release notice. Developers need one deduplicated queue, bounded AI planning evidence, review controls, and a verified path from accepted request to available capability.

## Decision
Store one canonical `AssistantFeatureRequest` per actor scope and normalized need. Keep every user action as an idempotent `AssistantFeatureRequestSubmission`, optional explicit `AssistantFeatureSubscription`, and append-only sequenced event. Create analysis and notification work through durable deduplicated queue rows in the same serializable transaction.

AI analysis receives only the request summary, category, and a versioned curated registry/schema/Brain snapshot. Its typed result is bounded by time and output size, and every citation must match the saved snapshot. Provider errors remain generic retry metadata.

Only active Super Admins may triage, merge, assign, review analysis, or publish a release. Publication requires an accepted canonical request and nonfuture rollout verification. A release also resolves merged requests. Subscriber delivery rechecks active consent, active actor access, required grants, verified rollout, and publication state immediately before using the existing notification system.

The Assistant UI stays inside the normal dashboard shell. `Not now` performs no mutation. Release consent starts unchecked on every open and remains independent from notifying developers.

## Consequences
- Repeated users strengthen one request while retaining individual evidence and consent.
- Queue leases recover abandoned work without duplicate logical jobs or notices.
- Unreviewed AI output cannot publish a capability or notify subscribers.
- The later admin center can build implementation history from the immutable request events and linked release versions.
