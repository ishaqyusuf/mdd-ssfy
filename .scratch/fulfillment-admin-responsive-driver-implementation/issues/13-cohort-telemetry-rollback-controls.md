# 13 — Add Cohort Rollout, Telemetry, And Rollback Controls

**Source:** [Fulfillment Admin And Responsive Driver Workflow](../../dispatch-admin-responsive-driver-workflow/spec.md)

**What to build:** Make the responsive driver experience pilotable for explicit
office, role, and driver cohorts while Expo and compatibility routes remain
available. Capture the evidence needed for a cutover decision and provide a
rollback that changes presentation without reversing operational truth.

**Blocked by:** 12 — Prove The Complete Admin-To-Driver Fulfillment Journey.

**Status:** ready-for-agent

- [ ] Cohort selection is explicit, permissioned, inspectable, and defaults existing users to the accepted Expo/compatibility behavior.
- [ ] Existing Expo, driver-task, Packing List, and supported deep links remain usable during the pilot.
- [ ] Telemetry covers manifest loading, action failures, packing duration, blocker acknowledgement/resolution, proof retry/completion, stale-revision denial, fallback use, and reconciliation.
- [ ] Telemetry excludes unnecessary customer content, signature/photo bodies, and continuous driver surveillance.
- [ ] Rollback disables the cohort or restores prior routing without changing completed dispatch, proof, allocation, inventory, notification, or audit records.
- [ ] Any additive schema or metadata remains readable by both new and compatibility paths throughout the rollback window.
- [ ] Cohort isolation, telemetry deduplication, route compatibility, rollback rehearsal, and operational-record preservation tests pass.

