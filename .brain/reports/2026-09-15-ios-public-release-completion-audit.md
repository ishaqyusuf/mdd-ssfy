# GND Millwork public iOS release completion audit

Date: 2026-09-15
Goal status: Active — local preparation substantially complete; external and
runtime acceptance gates remain

## Scope interpretation

The original task requested employee-only TestFlight distribution. The product
owner later explicitly replaced that distribution choice with a globally public
App Store binary. The employee request/audit workflow and company-account access
control remain in scope, but TestFlight groups and tester invitations are no
longer release requirements. Public acquisition does not create public accounts.

## Deliverable audit

| Requirement | Evidence | Status |
| --- | --- | --- |
| Audit Expo/EAS/iOS configuration, dependencies, permissions, authentication, updates, signing and docs | Public runbook plus privacy, origin, EAS inventory and Apple account reports; verified owner/project/team/bundle/update identifiers | Complete locally; effective final EAS environment must be rechecked on the new candidate |
| Explicit iOS build, submit and combined commands while preserving Android and EAS linkage | `apps/mobile/package.json`, `eas.json`, guarded build/upload scripts and readiness tests; production uses `distribution: store`; owner/project unchanged | Complete locally |
| Export-compliance declaration based on evidence | Source/config audit supports `ITSAppUsesNonExemptEncryption: false`; no app-owned custom crypto found; build 6 IPA metadata inspected | Complete for inspected source; repeat on final artifact |
| Focused iOS readiness checks and narrow validation | Release checker/preflight, route-source tests, upload/build acknowledgment tests, Expo config tests and focused auth/API/UI checks documented in task/runbook | Complete locally; current readiness intentionally fails on missing approved policy URL |
| Authenticated, auditable employee Android/iOS access request plus admin lifecycle | Prisma model/migration; protected tRPC procedures; employee/admin dashboard; Requested → Approved → Invited → Accepted → Installed events; internal fields withheld | Complete in source; current production named procedure returns `NOT_FOUND`, so deployed availability is incomplete |
| Company-member security and offboarding | Shared predicate requires active employee/manager or legacy staff type, active account, live role and live organization; Better Auth session revoked when no live role; customer denied | Complete in source with focused tests; production/installed-build acceptance incomplete |
| Manual invitation operations and clean future adapter boundary | Manual Android distribution and public-App-Store guidance adapter; no Apple password/OTP collection; no ASC automation needed for public employee acquisition | Complete locally |
| Activation-day/public release runbook and troubleshooting | Public runbook supersedes historical TestFlight direction and covers Apple record, signing, build, upload, processing, metadata, privacy, review, release and rollback | Complete locally |
| Brain updates and durable decisions | Feature/API/database/task/runbook docs plus ADR-091 historical, ADR-098 public distribution and ADR-103 live-company membership | Complete for current implementation |
| Preserve unrelated work and secrets | Scoped commits; unrelated Sales/Assistant worktree changes retained; no `.env*` or secret value modified or recorded | Complete for work performed |

## Acceptance criteria audit

| Criterion | Evidence judgment |
| --- | --- |
| Android workflows remain intact | Production/preview Android scripts were not replaced; iOS release guards are scoped to iOS. Focused tests support this. No new Android binary was built in this task. |
| iOS production commands are explicit and reproducible | Proven in package scripts/runbook and gated before EAS contact. |
| Public App Store build uses store distribution, not ad-hoc preview | Proven in `eas.json` and readiness output; preview remains internal. |
| Employee requests are authenticated, auditable, permission-gated and secret-free | Proven by protected routes, shared membership checks, event model, response projections and tests. Deployed endpoint is not yet present. |
| Relevant tests/checks pass with pre-existing failures distinguished | Focused suites pass. Auth typecheck has existing `packages/errors` NodeNext extension diagnostics; API typecheck has an unrelated nullable Sales source-number diagnostic; dashboard-wide typecheck previously exhausted its default heap. |
| Runbook and Brain documentation complete | Required local documentation exists and is linked. External facts are marked as gates/TODO rather than guessed. |

## Live external-state audit

- Apple membership is active for ZEROES AND ONE TECH HUB NIG LIMITED; Account
  Holder, Team `ZXC78SPCV4`, renewal September 13, 2027, and accepted agreement
  were verified.
- GND Millwork app `6811442922`, bundle `com.gnd.prodesk`, version 1.0 is
  **Prepare for Submission**. The visible version Build section has no attached
  build. The TestFlight tab did not render its inventory after a single reload,
  so the absence of every Apple-side build is **not proven** from that page.
- App Review contains no submitted items. App Accessibility and App Privacy
  have not been started/published.
- Listing copy, screenshots, support URL, review contact/account, category,
  age rating, content rights, starting price and app-country availability are
  unset in inspected views.
- Public distribution is selected. Automatic release after approval is selected
  and is a hard submission hold until a separately confirmed manual-release
  choice is saved. Mac/Vision Pro and School Manager options need review.
- EU Digital Services Act trader status is **Active** for 27 Countries or
  Regions, last updated September 15, 2026. The Account Holder completed the
  owner-controlled contact and verification flow; the Business Compliance
  table and disappearance of the prior warning are authoritative portal
  evidence. Public contact values and verification codes are intentionally not
  recorded. The app-specific App Information page independently says this
  developer is identified as a trader for GND Millwork. The Apps dashboard
  still renders a generic trader reminder, but it does not contradict those
  two specific status surfaces. Apple's current first-party checklist remains captured in
  [the DSA requirements report](2026-09-15-apple-eu-trader-requirements.md);
  it identifies the authorized role, public contact/address display, evidence,
  payment-details-if-absent, certification and verification-state gates.
  At the initial handoff the Account Holder tab was open at the first DSA modal
  with neither legal status selected and **Next** disabled, ready for an
  explicit owner decision.
  Following owner authorization to proceed as a trader, the workflow reached
  Contact Information Verification and was completed by the Account Holder.
- The configured apex backend redirects to `www`; generic auth is reachable,
  but the named mobile-access tRPC procedure returns JSON `NOT_FOUND`.
- The authoritative dashboard project was previously verified as `GND SERVER /
  gndprodesk` (`prj_BbeTM6D2N5TkqWW9SzaZvdXBPnsr`, root `apps/dashboard`). The
  repository-root `.vercel/project.json` points to the separate
  `gnd-storefront` project and is not a safe dashboard deployment target. The
  visible September 15 Hobby-team session does not expose the GND project, so
  the current production deployment ID/SHA, aliases and environment-variable
  presence remain unknown.

## Exact remaining gates

1. **Business/legal decision:** approve or replace the exact public privacy
   policy and support URLs; approve the data-retention/purge wording and App
   Privacy answers. Candidate URLs are not approvals. A source-backed
   [app-specific policy draft](2026-09-15-ios-app-specific-privacy-policy-draft.md)
   now reduces this gate to explicit controller/seller, vendor, telemetry,
   retention, deletion, regional-rights and public-contact decisions.
   The [controller identity matrix](2026-09-15-ios-controller-identity-evidence.md)
   confirms that source identifies GND Millwork Corp as the operational
   business and Zeroes and One as Apple seller, but cannot establish their
   legal/data-controller relationship.
   A [release-provider data-flow matrix](2026-09-15-ios-release-provider-data-flow-matrix.md)
   now identifies Vercel/Blob, database, Upstash, Logly, Sentry, Expo/EAS and
   Apple boundaries and the exact vendor evidence still missing.
2. **Deployment authority:** regain access to the known `gndprodesk` Vercel
   project, identify the deployed SHA/full proposed delta/rollback target, confirm
   required limiter variable presence without exposing values, and approve the
   exact deployment action.
3. **Runtime acceptance:** after deployment, verify the exact approved origin,
   redirect-safe custom mobile auth, employee/admin/customer/offboarding cases,
   login limiter behaviors, and installed release-build login using a synthetic
   least-privilege review account.
4. **Apple form decisions/saves:** approve listing copy, screenshots, category,
   age rating, content rights, free price, worldwide availability, DSA status
   declaration, platform availability, School Manager option, review contact,
   review credentials and manual release. Each save/legal/credential action is
   separately gated. DSA is currently Active; recheck it immediately before App
   Review without copying contact values, payment details, private evidence or
   credentials into repository documentation or chat.
5. **Fresh candidate:** set the approved privacy URL in EAS production only
   with confirmation, queue a clean store build with build acknowledgment, and
   inspect its source, Info.plist, privacy manifests, profile, entitlements,
   version/build and effective telemetry configuration. Existing build 6 is
   signing proof only.
6. **Upload:** create/use the required App Store Connect API key or interactive
   Apple credential only with action-time confirmation, then upload the reviewed
   build by its exact EAS ID. Do not auto-submit.
7. **Processing and review:** inspect Apple processing/compliance results,
   attach only the reviewed candidate, save approved metadata/credentials, and
   submit to App Review only with a separate confirmation.
8. **Release:** after approval and final smoke/rollback review, manually release
   only with a distinct action-time confirmation.

No goal-complete claim is valid until all applicable gates above have durable
evidence or the product owner explicitly removes them from scope.
