# Stable Vercel Preview Branch and Domain

Date: 2026-08-23
Status: Planned; awaiting execution approval

## Objective

Create a permanent remote Git branch named `preview` for the `gndprodesk`
Vercel project, deploy it with the Preview environment and PlanetScale Preview
database, and bind its latest successful deployment to
`preview.grdproducts.com`. Day-to-day work remains on the repository's actual
production branch, `master`.

## Verified starting state

- Local branch: `master`; it is three commits ahead of `gnd-prodesk/master` and
  has a large dirty/untracked worktree.
- Remote branches: `master` exists; `main` and `preview` do not.
- Correct Vercel project: `GND SERVER / gndprodesk`, root `apps/dashboard`,
  project id `prj_BbeTM6D2N5TkqWW9SzaZvdXBPnsr`.
- The repository-local `.vercel/project.json` points to the separate
  `gnd-storefront` project, so it must not be used or rewritten for this task.
- `preview.grdproducts.com` is not assigned in Vercel and currently has no A or
  CNAME record. `grdproducts.com` uses external EasyDNS nameservers.
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

1. Add `preview.grdproducts.com` to the `gndprodesk` project.
2. Edit the domain assignment: environment `Preview`, Git branch `preview`.
3. Read the project-specific CNAME target Vercel provides after the domain is
   added; do not assume the generic CNAME value.
4. In EasyDNS, add host `preview` as a CNAME to that exact Vercel target. Keep
   the existing EasyDNS nameservers and all unrelated DNS records unchanged.
5. Wait for DNS verification and Vercel TLS certificate issuance.

### 6. Acceptance and rollback checks

1. Confirm `https://preview.grdproducts.com` resolves with a valid certificate
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

After execution, update the PlanetScale Preview decision/research notes, this
plan's status, `.brain/progress.md`, and the deployment runbook with the stable
domain, branch update command, protection posture, and validation evidence.
