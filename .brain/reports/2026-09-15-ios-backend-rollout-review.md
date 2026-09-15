# Public iOS backend rollout review packet

Date: 2026-09-15
Status: Prepared locally; no deployment or account setting changed

## Source and observed production boundary

- Immutable local source checkpoint: `98fed14defdc35381ef198113dad208f03c41294`.
  This is a review input, not automatically the deployable production diff or
  an approved public IPA source. The shared worktree has extensive unrelated
  Sales/Assistant edits; do not deploy its current uncommitted contents.
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
   the current deployment Git SHA. A September 15 Chrome inventory exposed only
   the unrelated `ishaqyusufs-projects` Hobby team, and no Google identity or
   Vercel login was selected. **TODO:** regain current read-only access to the
   known project and record the deployment ID/SHA without printing credentials.
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
