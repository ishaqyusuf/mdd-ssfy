# Public iOS backend rollout review packet

Date: 2026-09-15
Status: Prepared locally; no deployment or account setting changed

## Source and observed production boundary

- The shared `master` worktree is 187 commits ahead of tracked
  `gnd-prodesk/master` (`18ccd42bd705ed44b7646f0ecd42454a56321b9d`) and has
  extensive unrelated Sales/Assistant edits. It is not an acceptable Vercel
  CLI deployment source.
- A clean local candidate now exists at branch
  `codex/ios-public-backend-release`, worktree
  `/private/tmp/gnd-ios-backend-release.XpTC6S`, immutable ref
  `31b97374d75eb2caad7d2ccbc75fe5c0372d3433`. It is exactly two commits ahead
  of tracked remote master: the foundational employee-access implementation
  (`3fabfd74d`, replayed from `4d85c67fc`) and one consolidated public-guidance,
  membership, session-revocation and login-abuse hardening commit
  (`31b97374d`). The worktree is clean and has not been pushed or deployed.
- This isolated branch is a backend rollout review candidate, not the public
  IPA source. It intentionally excludes the broad 187-commit local-master
  delta. Its dashboard-root build still includes the mobile-access migration,
  API/router, dashboard UI, Better Auth membership/session hardening, public
  iOS guidance and Android manual-distribution behavior.
- The employee workflow was registered in `apps/api/src/trpc/routers/_app.ts`
  by `4d85c67fc`. Subsequent committed hardening includes `514601201`
  (session role grants), `0d16310bc` (public-login attempt guard),
  `11770fe15` (employee type), and `9cffe5fe3` (live organization role).
  `98fed14de` adds a passing source-to-dashboard-handler wiring test.
- Dashboard's `/api/trpc/[...trpc]` re-exports `@api/internal-api`, whose
  handler uses the API app and its `appRouter`. Source wiring alone does not
  attest the deployed build.
- Credential-free production observation: the configured apex Base redirects
  to `www.gndprodesk.com`, where generic Better Auth session GET is 200 but
  `mobileAccess.myRequests` returns JSON `NOT_FOUND` (404). The separately
  selected local dashboard-web `oss.gndprodesk.com` hostname returns 404 for
  generic auth. See the [origin audit](2026-09-15-ios-production-origin-consistency.md).

## Information required before a production deployment decision

1. Re-open the previously verified Vercel project `GND SERVER / gndprodesk`
   (`prj_BbeTM6D2N5TkqWW9SzaZvdXBPnsr`, root `apps/dashboard`) and identify its
   exact current production deployment, aliases, source commit and build
   artifact. This project identity was verified read-only on September 4 and
   September 5 and is preserved in `.brain/progress.md`; the repository-root
   `.vercel/project.json` is instead linked to `gnd-storefront` and must not be
   used for a dashboard deployment. The observed HTTP responses do not provide
   the current deployment Git SHA. The current browser remains at Vercel login,
   and the CLI produced no authenticated project result. Public GitHub deployment
   records exist only through November 2025 and therefore cannot prove the
   current Vercel production deployment. **TODO:** regain current read-only
   access to the known project and record the deployment ID/SHA without printing
   credentials.
2. Compare that deployment against the proposed immutable source ref, including
   every committed change that would ship, not only mobile-access files.
   The full delta is presently unknown; recent router history also includes
   unrelated Sales Request/Assistant work. Do not treat `98fed14de` as a
   mobile-only deploy by implication.
3. Review the existing production Upstash REST variable **presence only** and
   trusted Vercel client-IP header behavior required by the fail-closed login
   limiter. Do not expose values or call the live Redis store during prep.
4. Reconcile the approved mobile API/auth origin with dashboard Better Auth's
   configured server base URL. The local production-profile Base, dashboard-web
   URL, and observed `www` redirect are different hostnames; no host change is
   authorized from a generic auth 200 alone.
5. Preserve a verified prior deployment/rollback target and obtain explicit
   action-time approval for the exact deployment target and source diff before
   changing production. Preview or production promotion is also an external
   deployment action; none is performed by this packet.

## Isolated candidate validation

- `40` focused tests pass across workflow transitions, manual/public
  distribution guidance, Super Admin authority, router/handler wiring, Android
  download authorization, active-company membership, web/mobile session
  revocation, distributed login throttling and Better Auth behavior.
- `git diff --check` passes and the isolated worktree is clean.
- `@gnd/auth` typecheck reaches only the already documented
  `packages/errors` NodeNext extension diagnostics; it reports no diagnostic in
  the changed auth files.
- Broad Biome against the tracked remote baseline reports pre-existing
  formatting and shared-file lint debt. No bulk formatting was applied because
  that would expand the release delta.
- Production database migration execution, Vercel project linking, pushing the
  branch, preview/production deployment, alias changes and runtime tests remain
  separate action-time gates. None occurred while preparing this candidate.

## Post-deployment acceptance, before a fresh public iOS candidate

- On the exact approved mobile Base origin, prove the custom mobile sign-in,
  session and sign-out endpoints survive any redirect, including POST method,
  body, cookies and return-host behavior. Use a least-privilege company review
  account under owner control; never record its password or OTP.
- Prove `mobileAccess.myRequests` is recognized by the deployed tRPC router.
  A bare `/api/trpc` 404 is not a health test. An unauthenticated response may
  be an auth or dependency error, but JSON `NOT_FOUND` for the named path still
  means the required workflow is absent. Then verify employee self-service,
  customer denial, admin denial/allowance, and revoked/deleted-organization
  denial in the appropriate non-production or approved production context.
- Exercise the production login limiter's allowed, quota-exceeded 429 and
  dependency-unavailable 503 paths without affecting real employee accounts.
  These runtime checks require an explicit approved test context.
- Only after these checks, the legal policy URL, and effective EAS production
  configuration are approved should a fresh privacy-complete store build be
  queued at its separate action-time gate. Build `6` remains signing proof, not
  the submission candidate.
