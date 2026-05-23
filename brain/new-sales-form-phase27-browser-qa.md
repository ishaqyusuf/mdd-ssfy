# New Sales Form Phase 27 Browser QA

Date: 2026-05-23
Status: Blocked
Owner: Sales Form Rebuild Team

## Scope

Phase 27 covers authenticated dealership browser QA for the package-backed quote
surface:

- create quote
- edit saved quote
- save and reopen package-authored workflow payload
- convert quote to order
- capture browser evidence and notes

## Attempted Environment

- App: `@gnd/dealership`
- Dev URL: `https://gnd-dealership.localhost:1355`
- App port: `3006`
- Browser runner: Puppeteer from the workspace dependency set

## Findings

1. Initial browser probe found a real Turbopack compile failure in
   `packages/sales/src/sales-form/ui/workflow/sales-form-workflow-panel.tsx`
   around the root component notice slot.
2. The JSX was simplified by lifting the notice element into a local variable.
3. `bun run test:new-sales-form-migration` passed after the fix:
   - sales package workflow/domain tests: 76 pass / 246 expects
   - dealer persistence/query tests: 15 pass / 49 expects
   - `@gnd/dealership typecheck`: pass
   - `www` watched migration files: no typecheck errors in tolerated baseline output
4. After restarting dealership dev, `/quotes/new` no longer returns the compile
   failure and redirects to `/login` as expected for an unauthenticated session.
5. Browser-rendered login page loads successfully with no application page
   errors observed.
6. Authenticated quote QA is blocked because local MySQL is unavailable:
   Prisma reports it cannot reach `localhost:3306`, so dealer records and
   Better Auth sessions cannot be queried or created.

## Evidence

- Route probe: `https://gnd-dealership.localhost:1355/quotes/new`
- Final browser URL: `https://gnd-dealership.localhost:1355/login`
- Rendered page title: `GND Dealership`
- Screenshot captured locally at:
  `/private/tmp/gnd-dealership-phase27-quote-new.png`

## Blocker

Phase 27 cannot complete until a local dealership auth/database session is
available. The required unblock is one of:

- start the local MySQL database expected by `.env.local`, then use an active
  dealer account to log in; or
- provide a verified local dealer session/cookie for the browser runner; or
- provide an approved seeded dealership auth fixture for browser QA.

## Next Action After Unblock

Resume Phase 27 at the authenticated quote surface and run:

1. create a package-authored quote with flat, Door/HPT, shelf, moulding, and
   service lines;
2. save the quote and confirm dealer-facing totals;
3. reopen the quote and verify workflow payload recovery;
4. edit and resave;
5. convert to order;
6. capture desktop and mobile screenshots for the final signoff package.
