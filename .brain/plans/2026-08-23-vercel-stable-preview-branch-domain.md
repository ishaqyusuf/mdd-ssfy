# Stable Vercel Preview Branch and Domain

Date: 2026-08-23
Status: Infrastructure complete; authenticated application workflow smoke tests pending

## Objective

Create a permanent remote Git branch named `preview` for the `gndprodesk`
Vercel project, deploy it with the Preview environment and PlanetScale Preview
database, and bind its latest successful deployment to
`preview.gndprodesk.com`. Day-to-day work remains on the repository's actual
production branch, `master`.

## Verified starting state

- Local branch: `master`; it is three commits ahead of `gnd-prodesk/master` and
  has a large dirty/untracked worktree.
- Remote branches: `master` exists; `main` and `preview` do not.
- Correct Vercel project: `GND SERVER / gndprodesk`, root `apps/dashboard`,
  project id `prj_BbeTM6D2N5TkqWW9SzaZvdXBPnsr`.
- The repository-local `.vercel/project.json` points to the separate
  `gnd-storefront` project, so it must not be used or rewritten for this task.
- `gndprodesk.com` uses Vercel DNS (`ns1.vercel-dns.com` and
  `ns2.vercel-dns.com`), so the stable Preview hostname requires no external DNS
  provider change.
- `preview.gndprodesk.com` was already assigned to project `gndprodesk`, but it
  tracked the obsolete Git branch `codex/shadcn-upgrade`.
- Vercel Preview already has the branch-scoped PlanetScale Preview
  `DATABASE_URL`.

## Execution plan

### 1. Freeze the deployable commit

1. Inventory the dirty worktree and group the intended Preview changes into
   coherent commits on local `master`; do not blindly commit unrelated files.
2. Run the relevant focused tests, package typechecks, build, Biome, and diff
   checks for the selected commit.
3. Record the exact commit SHA. Do not push `master`, because that would create a
   production deployment.

### 2. Create the permanent remote Preview branch

1. Push the selected local commit directly to `refs/heads/preview` without
   switching the local checkout away from `master`.
2. Confirm GitHub shows `preview` at the intended SHA and that `master` is
   unchanged.
3. Wait for Vercel's Git integration to create a Preview deployment for branch
   `preview`; do not use a CLI-only deployment because Vercel branch-domain
   tracking requires the Git integration.

Future releases use the same pattern: validate on local `master`, then
fast-forward the remote `preview` branch to an explicitly selected commit. The
local day-to-day branch remains `master`.

### 3. Validate the first Preview deployment

1. Confirm project `gndprodesk`, target environment `Preview`, Git ref
   `preview`, and the recorded commit SHA.
2. Confirm the deployment uses the Preview-scoped PlanetScale credential and
   cannot fall back to Production.
3. Inspect the build and runtime logs. A failed deployment stops the workflow;
   the stable domain is not attached to an unhealthy build.

### 4. Protect Preview access

1. Inspect the project's current Deployment Protection setting.
2. Default to Standard Protection with Vercel Authentication before publishing
   the custom domain, because Preview contains internal user emails and password
   hashes even though customer data is sanitized.
3. If non-team testers need access, use Vercel shareable links. Making the clean
   domain public is a separate explicit decision.

### 5. Attach the stable branch domain

1. Inspect the existing `preview.gndprodesk.com` project-domain assignment.
2. Edit only its Git branch mapping from `codex/shadcn-upgrade` to `preview`.
3. Confirm Vercel reports the domain as verified and DNS as correctly
   configured. Do not add an EasyDNS record because Vercel DNS is authoritative
   for `gndprodesk.com`.
4. Wait for Vercel TLS certificate issuance if the hostname does not already
   have a valid certificate.

### 6. Acceptance and rollback checks

1. Confirm `https://preview.gndprodesk.com` resolves with a valid certificate
   and points to the `preview` branch's latest successful deployment.
2. Sign in with a retained local employee login and smoke-test Sales Orders,
   `getOrders`, production, dispatch, payment, and the seeded 150-order dataset.
3. Confirm production domains and the production database were untouched.
4. Push a harmless follow-up Preview commit only if needed to prove the stable
   domain advances automatically; otherwise verify branch-domain metadata in
   Vercel.
5. On failure, remove or disable the Preview domain assignment while preserving
   the prior Vercel deployment and PlanetScale branch for diagnosis.

## Completion record

### 2026-08-23 execution checkpoint

- Created remote Git branch `preview` at commit `e2c0fa84a` without pushing or
  changing remote `master`.
- Vercel Git integration created Preview deployment
  `dpl_6DuuMa5422E2Z8tqWYstKrqFAyqt` for the correct project, branch, and commit.
- The first build compiled successfully, then remained in Next.js page-data
  collection with three isolated workers until Vercel ended the deployment.
- PlanetScale Insights showed no application query activity during that build,
  ruling out the Preview database and `getOrders` as the wait source.
- Reduced Next.js build page-analysis concurrency to one worker to constrain
  peak memory while each worker loads the complete dashboard server graph. The
  corrective commit `9071abe35` completed on Vercel in four minutes and the
  Preview deployment is Ready.
- Enabled Vercel Authentication for all Preview deployments.
- Corrected the requested stable hostname to `preview.gndprodesk.com`. It was
  already owned by project `gndprodesk`; changed its branch mapping from
  `codex/shadcn-upgrade` to `preview`.
- Verified the corrected domain is verified, reports `misconfigured: false`,
  resolves through Vercel DNS, and returns the expected Vercel Authentication
  redirect over HTTPS.
- Removed the accidental `preview.grdproducts.com` project-domain assignment and
  the unused `grdproducts.com` ownership entry from the Vercel team. No EasyDNS
  DNS record was created or changed.
- Production branch `master`, production domains, and the production database
  were not changed.

After authenticated application smoke tests, update the PlanetScale Preview
decision/research notes and deployment runbook with the stable domain, branch
update command, protection posture, and validation evidence.
