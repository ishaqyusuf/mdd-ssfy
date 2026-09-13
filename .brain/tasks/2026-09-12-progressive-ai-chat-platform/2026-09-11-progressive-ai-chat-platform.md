# Task: Progressive AI Chat Platform

## Status
In Progress

## Priority
Medium

## Created Date
2026-09-11

## Last Updated
2026-09-13

## Plan Status
In Progress

## Plan File
[Plan](../../plans/2026-09-11-feature-progressive-ai-chat-platform.md)

## Source Context
User requested a detailed Brain plan, full checklist and broader suggestions for Midday-style progressive AI chat across GND, with schema-aware queries, user permissions, PDFs, order creation, personal reusable actions, and consented developer feature requests with release notifications.

## Implementation Progress
- Completion: UI-first slice 5/5 (100%); roadmap ticketization 4/4 (100%); platform tickets 10/19 complete
- Current Checklist: T11 production, inventory, fulfillment, and Community reads is in progress
- Blockers: None for T11 implementation; pilot activation remains gated by T17.

## Roadmap Ticketization Checklist (2026-09-12)
- [x] Audit the current local Midday assistant implementation and separate verified parity from GND extensions.
- [x] Create the Midday parity matrix and dependency-ordered six-wave roadmap.
- [x] Create the initial 18 dedicated implementation tickets and register each once in the Backlog ledger.
- [x] Add T19 for individual access, usage metering/limits, and super-admin request governance.

## UI-first Checklist (2026-09-12)
- [x] Build assistant shell, composer and preview scenarios.
- [x] Build chart, order and document result components.
- [x] Add favorites, tool browsing, history and feature-request preview dialogs.
- [x] Verify in browser and capture screenshots.
- [x] Complete documentation and UI scope review.

## Implementation Checklist
- [ ] P1 — Foundation, authorization, registry, persistence and streaming chat.
- [ ] P2 — Operational reads and schema-aware query compilation.
- [ ] P3 — Canonical PDF and artifact workflows.
- [ ] P4 — Native text order drafts, reviewed save, then evaluated images.
- [ ] P5 — Preferences and versioned favorite actions.
- [ ] P6 — Feature intake, engineering analysis and release subscriptions.
- [ ] P7 — Broader workflows, analytics, watches and audience expansion.

The linked plan owns detailed implementation and validation checklists.

## Dedicated Ticket Queue

- T01–T09: Midday parity foundation and interaction behavior; complete.
- T10: Sales and customer read tools complete. T11–T14: operations reads, PDFs, order drafts, schema-aware analytics, and charts.
- T15–T19: favorites/preferences, missing-feature lifecycle, approval/security, individual access/usage governance, evaluations, and rollout.

See the linked plan's **Ticket Roadmap** and the [Midday parity contract](../../features/progressive-ai-chat-midday-parity.md) for exact file links and dependencies.

## Validation Evidence
- Planning inspected local Midday runtime/catalog/MCP/UI, GND schema and permission boundaries, Sales Request AI, and relevant domain Brain documentation.
- Follow-up verified Midday AI SDK UI and Recharts usage; plan explicitly includes typed chart/table/KPI rendering, selected compatible AI Elements primitives, and custom domain cards. AI Elements provenance in Midday is unverified.
- No application code, database data, schema, provider configuration or external notifications changed.
- Implementation tests and release gates are defined in the plan; none are claimed complete.

## UI validation — 2026-09-12
- In-app browser verified synthetic `/assistant-preview`: welcome, sales chart, order card, invoice dialog, save favorite/list, feature request checkbox and local-only submission.
- Compact 390px viewport has document scrollWidth 390px; no horizontal overflow. Browser error log returned no errors.
- Protected `/assistant` redirects unauthenticated visitors to login. Employee quick-login was rejected by automatic approval review; no employee session was entered. The development-only synthetic preview does not access operational records and returns notFound outside development.
- Screenshots: `assistant-welcome.png`, `assistant-chart.png`, `assistant-order.png`, `assistant-feature-request.png`, `assistant-mobile.png` in `/Users/M1PRO/.codex/visualizations/2026/09/11/01a090ad-ec38-7953-8f2c-9748ad6220a0/`.
- No live AI adapter, notification, PDF generation, saved recipe persistence, or business mutation is connected. No typecheck/build run for this isolated UI slice.
- Roadmap ticketization created planning documents only. All 18 implementation tickets remain Backlog and no application/database behavior is claimed complete.

## Dashboard navigation correction — 2026-09-12
- [x] Remove the separate assistant header; existing dashboard layout owns header/sidebar.
- [x] Keep favorites, history, preferences and New chat beside the composer.
- [x] Add Assistant preview to normal Sales navigation using existing Sales read/edit grants. This grants only the synthetic UI route, not business tool access.
- [x] Verify corrected preview in browser: separate header absent; chat actions remain beside composer. Authenticated shell verification remains pending.
