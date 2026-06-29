# New Sales Form Phase 27 Browser QA

Date: 2026-05-23
Status: Authenticated browser QA partial pass; fixture/mobile coverage pending
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
6. 2026-06-29 follow-up corrected the database assumption: dealership uses the
   same local database context as `www` through root `.env.local` plus
   `apps/dealership/.env.local`. The loaded `DATABASE_URL` points at local MySQL
   on `127.0.0.1:3307`, and a masked count probe found active dealer records,
   Better Auth users, sessions, and dealer quotes.
7. 2026-06-29 follow-up added a development-only dealership quick-login control
   to `/login`. The login page now lists active linked dealer accounts in dev
   mode and signs in through a non-production-only Better Auth endpoint. A route
   render check confirmed the `Dev Quick Login` control appears, and an endpoint
   smoke returned a redirect/session response.
8. 2026-06-29 authenticated in-app browser QA used the logged-in Cipron Concept
   dealer session at `http://gnd-dealership.localhost/`. The dealer dashboard
   loaded, `/quotes/new` opened the package-backed quote composer, customer
   selection worked for customer `3154`, shelf product search returned catalog
   rows, and a shelf quote saved to `SalesOrders` as quote `00002DPP`.
9. Reopen/edit passed for the saved quote. `/quotes/23562/edit` restored the
   package-authored shelf line, PO, dealer customer, and dealer summary. Changing
   shelf quantity from 1 to 2 and updating the quote persisted the dealer
   summary total from `$6.94` to `$13.88`.
10. Dealer request-to-order passed at the dealer-facing list level. Clicking
    `Request order` changed the quote list row to `Order requested`, disabled
    the duplicate action as `Requested`, and persisted a pending
    `DealerSalesRequest` row with `request = make_order` for quote `23562`.
11. QA found a create/save UX bug: after customer selection added
    `selectedCustomerId=3154` to the URL, the composer reset and lost unsaved
    shelf/service/door/moulding work. The quote save itself persisted, but the
    post-save browser state returned to a blank unsaved quote instead of staying
    on the saved quote or navigating to a stable saved/edit route.
12. QA found dealer-facing pricing inconsistencies. The reopened quote displayed
    the shelf row as `$6.94 x 2 = $13.88` and the summary as `$13.88`, but the
    item header showed `$25.66`. The persisted `meta.newSalesForm.lineItems[0]`
    also carried `lineTotal: 25.66` while the persisted summary/grand total was
    `$13.88`.
13. Door/HPT and moulding browser coverage remains fixture-blocked. Interior
    pre-hung Door and Moulding components opened size-selection dialogs, but the
    visible size tables were empty, so the browser could not create priced Door,
    HPT, or Moulding rows from the current local fixture data.
14. 2026-06-29 follow-up fixed the create/update post-save reset and
    dealer-visible total mismatch for structured quote lines. Quote edit routes
    now use the order number slug (`/quotes/00002DPP/edit`) while legacy numeric
    urls redirect to the slug. Authenticated browser verification showed
    `/quotes/23562/edit` returning a `307` redirect to `/quotes/00002DPP/edit`,
    quote `00002DPP` rendering item header, shelf row, subtotal, and grand total
    as `$13.88`, and the stale `$25.66` item header no longer appearing. The
    quote was updated once after the fix; database verification confirmed
    `meta.newSalesForm.lineItems[0].lineTotal`, shelf total, subtotal, and
    grand total are all `13.88`.

## Evidence

- Initial route probe: `https://gnd-dealership.localhost:1355/quotes/new`
- Initial unauthenticated final browser URL:
  `https://gnd-dealership.localhost:1355/login`
- Authenticated browser URL: `http://gnd-dealership.localhost/`
- Saved QA quote: `00002DPP` / `SalesOrders.id = 23562`
- Saved QA quote PO: `PH27-QA-20260629-EDIT`
- Saved dealer total after edit: `$13.88`
- Pending request evidence: `DealerSalesRequest.request = make_order`,
  `status = pending`, `salesId = 23562`
- Browser console errors during create/reopen/edit/request pass: none observed
- Screenshots captured locally at:
  `/private/tmp/gnd-dealership-phase27-quote-new.png`
  `/private/tmp/gnd-dealership-phase27-quotes-requested.png`
  `/private/tmp/gnd-dealership-phase27-quote-edit-reopen.png`

## Remaining Blockers

- Seed or repair local Door/HPT and Moulding size fixtures so authenticated
  browser QA can create priced rows for those line families.
- Complete responsive/mobile screenshot evidence after the desktop flow is clean.

If quick login is unavailable in a future environment, the fallback unblock is a
verified local dealer session/cookie, valid dealer login credentials, or an
approved seeded dealership auth fixture.

## Next Action

Repair the Door/HPT and Moulding fixtures, then rerun the authenticated desktop
flow for those structured line families before capturing the final responsive
screenshot package.
