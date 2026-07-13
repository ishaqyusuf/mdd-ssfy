# Dead Code & Dead Links Cleanup — 2026-04-10

## Summary

Ran `knip` on the `apps/www` workspace to identify and delete unused files. Also performed a comprehensive analysis of dead navigation links and versioned duplicate pages across the route groups.

---

## Part 1 — Knip Dead Code Cleanup

### Files Deleted: 180

Knip identified **277 unused files** in the existing `knip-report.txt`. Of those, **97 had already been deleted** in prior sessions. The remaining **180 were deleted** in this session.

### Categories Deleted

| Category | Count | Description |
|----------|-------|-------------|
| `_v2/` components/hooks/lib | 8 | Old v2 utility files |
| `(midday)/` everything | 10 | Entire dead midday experiment module |
| `actions/--fix/` | 2 | One-off fix scripts |
| `actions/cache/` | 4 | Unused cache action files |
| `actions/` (root) | 14 | Orphaned server action files |
| `app/(clean-code)/(sales)/_common/` | 14 | Unused clean-code sales common files |
| `app/(v1)/_actions/` | 14 | Dead v1 action files |
| `app/(v1)/(loggedIn)/sales/_actions/` | 3 | Dead v1 sales actions |
| `app/(v2)/(loggedIn)/sales-v2/` | 25 | Dead v2 sales-v2 internal files |
| `app/(v2)/(loggedIn)/sales/` | 6 | Dead v2 sales internal files |
| `app/(v2)/printer/` | 3 | Dead v2 printer files |
| `components/_v1/` | 7 | Dead v1 components |
| `components/(clean-code)/` | 5 | Dead clean-code components |
| `components/` misc | 16 | Various dead component files |
| `data-access/`, `data/` | 7 | Dead data access files |
| `hooks/` | 5 | Dead hooks |
| `lib/` | 8 | Dead lib utilities |
| `modules/` | 3 | Dead module files |
| `types/` | 2 | Dead type files |
| `use-cases/` | 3 | Dead use-case files |
| `utils/db.ts` | 1 | Dead utility |
| Root-level (`apps/www/`) | 2 | `middleware_.ts`, `renderEmailFix.js` |

### Notable Deletions

- **`middleware_.ts`** — Alternate middleware file (underscore prefix), the real one is `middleware.ts`
- **`renderEmailFix.js`** — One-off email rendering fix script
- **`(midday)/`** — Entire Midday-style filter experiment module, fully unused
- **`_v2/lib/routes.ts`** — Old v2 routes lib
- **`actions/queries.ts` + `actions/queries.sales.ts`** — Old global query files superseded by tRPC

---

## Part 2 — Dead Navigation Links in `sidebar/links.ts`

The active navigation system is **`components/sidebar/links.ts`**, used by `sidebar-content.tsx` → `SiteNav`. The old `lib/navs.ts` is only referenced by the legacy `_v1/tab-layouts/tabbed-layout.tsx`.

### Dead Links Found in `links.ts`

| Link | Status | Notes |
|------|--------|-------|
| `/sales-book/dealers` | **DEAD** | No page at this URL; actual page is `/sales-v2/dealers` |
| `/sales-books/quotes` | **DEAD (TYPO)** | Typo — `sales-books` instead of `sales-book` |
| `/sales/commissions` | **DEAD** | No page exists at this URL |
| `/sales-book/pickups` | **DEAD** | No page exists (commented out in nav but path registered) |
| `/jobs/installations` | **DEAD** | No page; v1 has `/tasks/installations` |
| `/jobs/punchouts` | **DEAD** | No page; v1 has `/tasks/punchouts` |
| `/tasks/unit-productions` | **DEAD** | No page; should be `/community/unit-productions` |

> **Action needed**: Fix these dead nav links before they confuse users. Most are either typos or URL migration leftovers.

---

## Part 3 — Versioned Duplicate Pages (Both Old & New Exist)

These pages have both an original version and a v2/newer version in the file system. The old ones may still be accessible via URL but are superseded.

| Old URL | New URL | Status |
|---------|---------|--------|
| `/sales-book/orders` | `/sales-book/orders/v2` | v2 linked in nav as sub-item "Orders V2" |
| `/sales-book/orders` | `/sales-book/orders/overview-v2` | New overview system (SalesOverviewSystem) |
| `/sales-book/dispatch` | `/sales-book/dispatch/v2` | v2 linked as "Delivery V2" |
| `/sales-book/customers` | `/sales-book/customers/v2` | v2 linked as sub-item "Customers v2" |
| `/sales-book/productions` | `/sales-book/productions/v2` | v2 linked as "Productions v2" |
| `/production/dashboard` | `/production/dashboard/v2` | v2 = `ProductionWorkerDashboardV2` |
| `/hrm/employees` | `/hrm/employees/v2` | v2 linked as "Employees - v2" |
| `/hrm/contractors/jobs` | `/contractor/jobs` | new is v2 sub-item "Jobs - v2" |
| `/login` | `/login/v2` | v2 = `LoginV2` component |
| `/community/community-template/[slug]` | `/community/community-template/[slug]/v1` | v1 preserved as old path |
| `/checkout/[token]/(v1)` | `/checkout/[token]/v2` | Both payment checkout forms exist |

> **Action needed**: Migrate remaining users off old routes. Once v2 is stable and default, delete old route.

---

## Part 4 — Orphaned Route Group Pages

### Orphaned `(v1)` Route Group Pages

These pages exist under the `(v1)` route group and produce accessible URLs, but are **not linked in the active `links.ts` navigation**. The `navs.ts` (old nav) references some of these, but that file is only used by the legacy tabbed-layout.

| URL Path | (v1) File | Replaced By |
|----------|-----------|-------------|
| `/community/units` | `(v1)/(loggedIn)/community/units/page.tsx` | `/community/project-units` |
| `/community/invoices` | `(v1)/(loggedIn)/community/invoices/page.tsx` | `/community/unit-invoices` |
| `/community/productions` | `(v1)/(loggedIn)/community/productions/page.tsx` | `/community/unit-productions` |
| `/community/project/[slug]` | `(v1)/(loggedIn)/community/project/[slug]/page.tsx` | `/community/projects/[slug]` |
| `/tasks/installations` | `(v1)/(loggedIn)/tasks/installations/page.tsx` | Unknown replacement |
| `/tasks/payments` | `(v1)/(loggedIn)/tasks/payments/page.tsx` | Unknown replacement |
| `/tasks/punchouts` | `(v1)/(loggedIn)/tasks/punchouts/page.tsx` | Unknown replacement |
| `/settings/community/*` | Many pages under `(v1)/(loggedIn)/settings/community/` | `/settings/*` in sidebar |
| `/contractor/assign-tasks` | `(v1)/(loggedIn)/contractor/assign-tasks/page.tsx` | Replaced by contractor overview |
| `/contractor/jobs` | `(v1)/(loggedIn)/contractor/jobs/page.tsx` | `/hrm/contractors/jobs` (v2) |
| `/contractor/jobs/payments` | `(v1)/(loggedIn)/contractor/jobs/payments/page.tsx` | `/contractors/jobs/payments` |
| `/customer-service/[slug]` | `(v1)/(loggedIn)/customer-service/[slug]/page.tsx` | `/community/customer-services` |

> **Action needed**: These pages can be deleted once confirmed no one uses old URLs directly.

### Orphaned `(v2)` Route Group Pages

Pages under `(v2)/(loggedIn)/` that are not linked from the active `links.ts`:

| URL Path | Notes |
|----------|-------|
| `/sales-v2/dimension-variants` | Feature page, not in nav — possibly admin-only |
| `/sales-v2/door-svgs` | Debug/tool page |
| `/sales-v2/doors-debug` | Debug page |
| `/sales/dashboard/(tabbed)/*` | Old tabbed dashboard — superseded by Overview V2 |
| `/sales/dispatch/[type]` | Old dispatch form — superseded by new dispatch |
| `/sales/edit/[type]/[slug]` | Old edit form — superseded by `(clean-code)` form |
| `/mail-grid/templates` | Mail grid templates page |
| `/community-settings/builders` | Old community settings |
| `/__sales-book/[type]` | **Disabled** — double underscore prefix = not in routing |
| `/v2/dyke` | Old Dyke debug page |
| `/v2/printer/customer-report` | Old customer report printer |
| `/v2/printer/sales` | Old sales printer (replaced by `/p/sales-invoice-v2`) |
| `/settings/email` | Accessible but may be replaced by sidebar settings |

> **Action needed**: Review and either wire these into the nav or delete them in a future cleanup pass.

---

## Part 5 — Route Group Overview

| Group | Transparent? | Status | Primary Use |
|-------|-------------|--------|-------------|
| `(v1)` | Yes | Legacy — pages exist, mostly unlinked | Old community, contractor, task, settings pages |
| `(v2)` | Yes | Mixed — some active, some dead | Sales dashboard, dispatch, edit, sales-v2 products |
| `(clean-code)` | Yes | Active | New sales book form (create/edit order/quote) |
| `(sidebar)` | Yes | **Primary active group** | All main app navigation |
| `(midday)` | Yes | **Fully dead** — all files deleted | Was a Midday-style filter experiment |
| `(public)` | Yes | Active | Login, auth, print pages |
| `(payment)` | Yes | Active | Checkout, Square payment |
| `(download)` | Yes | Active | File download |
| `(square-callback)` | Yes | Active | Square payment response |
| `(storefront)` | Yes | Dead | Storefront signup (action deleted) |

---

## Files Still Present But Not Deleted (97 from old knip report)

The 97 files reported missing from the old `knip-report.txt` had already been deleted in previous sessions. Notable deletions that happened earlier:
- All `components/ui/` shadcn components (moved to `@gnd/ui` package)
- Various `_v2/` lib files
- `lib/better-auth.ts`, `lib/links.ts`, `lib/use-nav-links.ts`
- Several clean-code layout/nav components

---

## Future Actions Required

### High Priority (broken UI)
1. Fix `/sales-book/dealers` → redirect or change to `/sales-v2/dealers` in `links.ts`
2. Fix `/sales-books/quotes` → TYPO fix in `links.ts` (remove the `s`)
3. Fix `/sales/commissions` → either create page or remove from nav

### Medium Priority (cleanup)
4. Delete orphaned `(v1)` community pages after confirming no users on old URLs
5. Delete orphaned `(v1)` tasks pages after confirming no users on old URLs
6. Wire or delete `(v2)` debug pages (door-svgs, doors-debug)
7. Remove `/sales/dashboard/(tabbed)/*` old dashboard tabs once Overview V2 is stable

### Low Priority (future)
8. Delete old versioned pages once v2 is fully promoted (orders, dispatch, customers, productions, employees)
9. Clean up `(storefront)` route group
10. Remove `(v2)/__sales-book` (disabled, double-underscore)

---

## Part 6 — Addendum: Additional Findings

### Dual Sales Form Routes (Active but Overlapping)

Two separate URL paths both serve sales order/quote form functionality:

| URL Pattern | Route Group | Component | Nav Status |
|-------------|-------------|-----------|------------|
| `/sales-book/create-order`, `/sales-book/edit-order/[slug]` | `(clean-code)/(sales)/sales-book/(form)/` | `FormClient` (clean-code form) | **Primary** — linked directly in nav |
| `/sales-form/create-order`, `/sales-form/edit-order/[slug]` | `(sidebar)/(sales)/sales-form/` | `NewSalesForm` (older form) | **Legacy** — only in `childPaths` for highlight detection |

Both sets are registered in `links.ts` `childPaths` so the sidebar highlights correctly for either URL. The `/sales-form/` routes are the old form; `/sales-book/` is the new clean-code form. The nav sub-links only expose `/sales-book/create-order`.

> **Action needed**: Once clean-code form is fully stable, remove `/sales-form/*` sidebar routes and drop them from `childPaths`.

### Auth Route Duplicates

| URL | Status |
|-----|--------|
| `/login` | Active (public group) |
| `/login/v2` | Alternate login UI (`LoginV2`) — not linked in nav |
| `/signin` | Separate signin page — purpose unclear, may be redundant with `/login` |

### v1 Dealer Auth Pages (Orphaned)

The `(v1)/(guest)/` group has dedicated dealer registration flows:
- `/dealer/signup` — dealer self-registration
- `/dealer/create-password/[token]` — password creation from invite token
- `/dealer/registration-submitted` — confirmation page

These are NOT in the main auth group (`(public)/login`). They may still be needed for dealer onboarding emails that link directly to these URLs. Do not delete without confirming dealer invite emails don't reference them.

### v1 Print-Model Page
- `/print-model` — lives under `(v1)/(guest)/print-model/page.tsx`; likely a legacy public print route superseded by `(public)/p/*` print routes
