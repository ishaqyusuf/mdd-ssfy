# Employee Management V2

## Goal

Enhance the employee section from a flat list into a full management system with per-employee overview dashboards, role-specific analytics, document/record management with approval workflow, and a job-creation gate for contractors with expired or missing insurance.

---

## Scope

**Zero new dependencies on existing legacy code except:**
- `employee-header.tsx` — search filter (reused)
- `employee-form-modal.tsx` — create/edit form (reused)
- Role assignment form (reused)
- Employee data table (reused, extended)

Everything else is standalone.

---

## 2026-07-08 Bug Reporting Access Toggle

- Super Admin employee row actions now include `Enable Bug Reports` / `Disable Bug Reports`.
- The action writes the employee-specific `submit bug report` permission through `hrm.setEmployeeBugReportingAccess`.
- Super Admin employees are treated as enabled by role; the row action is disabled for them and the API rejects attempts to disable their bug reporting access.
- Employee list rows expose `bugReportingEnabled` so the table/mobile card can display the current access state.
- Toggling access clears the target employee's `session` and `webAuthSession` records so the header bug-report button reflects the updated `can.submitBugReport` snapshot after login/session refresh.
- The employee-management permission picker also initializes `submit bug report` alongside the existing `submit custom job` employee-specific permission.

## 2026-07-13 Job Submission Project Gate And Source

- Website job submission uses the existing `NewJobModal` path for contractor submit and admin assign flows.
- Website and Expo contractors/admins must choose an existing project and unit before a job can be saved unless `jobs-settings.meta.allowCustomProject` is enabled.
- Website Job Settings and Expo mobile Settings > Job Configuration expose `Allow custom project` / `Custom projects` controls for `jobs-settings.meta.allowCustomProject`.
- `jobs-settings.meta.allowCustomProject` exposes a top-level `Custom Project` choice in website and Expo project selection. That path skips project/unit/model selection and submits a projectless custom job with manual pricing.
- Projectless `Custom Project` submissions require a non-blank `Project Name` in the final job details step before the description field. The value is saved as `Jobs.title` and is used as the visible project label in job overview/detail screens instead of a generic custom label.
- `jobs-settings.meta.allowCustomJobs` remains scoped to `Custom Task` after a project is selected, and custom-task saves preserve the selected project/unit/model context.
- `community.saveJobForm` rejects payloads without `unit.id` and `unit.projectId` unless the payload is a custom job and `jobs-settings.meta.allowCustomProject` is enabled.
- Job submission source is stored in `Jobs.meta.submittedFrom` as `"web"` or `"mobile"`. No extra submitted-at timestamp is stored; `Jobs.createdAt` remains the submission time source.
- Admin job overview displays `Website`, `Mobile app`, or `Unknown source` from `job.meta.submittedFrom`.

## 2026-07-16 Employees Table-Core Migration

- `/hrm/employees` now uses `apps/www/src/components/tables-2/employees/*` instead of the legacy `components/tables/employees` / `@gnd/ui/data-table` stack.
- `/hrm/employees/v2` list route now uses the same restarted employees table through `features/employee-management/components/employee-list-page.tsx`; the v2 detail route remains the row-click destination.
- The route follows the Sales Orders/Midday shell directly: `ScrollableContent`, `PageTitle`, `EmployeeHeader`, `ErrorBoundary`, `Suspense`, and `DataTable`, with no shared `PageStickyHeader` wrapper.
- Server hydration uses `batchPrefetch` for `hrm.getEmployees` plus `orgs.getOrganizationProfile`; table settings hydrate from `getInitialTableSettings("employees")`.
- The Employees table now consumes the shared `tables-2/core` primitives: table-owned `useScrollHeader(parentRef)`, `VirtualRow`, `useTableDnd`, `DndContext`, `SortableContext`, `DraggableHeader`, `ResizeHandle`, sticky Employee/action columns, persisted column sizing/order/visibility/dividers, and the header-offset spacer.
- `TABLE_CONFIGS.employees` owns the 64px row height and compact table style. Employee sorting is intentionally not wired yet because `employeesQueryParamsSchema` does not currently expose a `sort` contract.
- The header exposes the Employees column-visibility/divider control beside the existing create/roles actions.
- Row behavior is preserved: clicking normal cells opens `/hrm/employees/v2/:id`; role/profile/office/action cells remain non-clickable table cells; row actions preserve edit, reset password, bug-report enable/disable, revoke, and restore access workflows.
- Validation: Employees migration parity test passed for both list routes, the combined restarted table migration parity suite passed, targeted Biome passed, `git diff --check` passed, filtered `@gnd/www` typecheck showed no touched-file diagnostics for the touched list/shell files, HEAD smoke for `/hrm/employees/v2` returned `200`, and the earlier SSR smoke for `/hrm/employees` returned `200` with Employee markers and no sampled app-error/login markers.

## 2026-07-17 Roles/Profile Sheet Table-Core Migration

- The roles/profile management sheet tabs now use `apps/www/src/components/tables-2/roles/*` and `apps/www/src/components/tables-2/employee-profiles/*` instead of the legacy `components/tables/roles` and `components/tables/employee-profiles` `@gnd/ui/data-table` surfaces.
- Both sheet tables consume the same table-core mechanics as Sales Orders: table-owned scroll, `VirtualRow`, `useScrollHeader(parentRef)`, `useTableDnd`, `DndContext`, draggable headers, resize handles, sticky primary/action columns, persisted column visibility/sizing/order/divider settings, and header-offset spacer.
- The sheet keeps the existing `#tabActions` portal pattern, now rendering Create plus column-visibility/divider controls for the active Roles or Profiles tab.
- `TABLE_CONFIGS.roles` and `TABLE_CONFIGS["employee-profiles"]` use compact 56px rows. Role widths are tailored to Role `180/320/220`, Employees `108/160/120`, Permissions `120/180/136`, and Actions `72/104/84`. Profile widths are Profile `190/340/230`, Employees `108/160/120`, Commission `126/190/144`, Paycut `112/170/128`, and Actions `92/122/104`.
- Profile row actions now write `profileForm` / `profileEditId` and delete through `deleteProfileAction`; the old crossed `roleForm` / `roleEditId` and `deleteRoleAction` path is no longer used by the profile tab.
- Validation: focused roles/profile sheet parity tests passed with 9 tests / 80 assertions; full restarted table parity suite passed with 136 tests / 1285 assertions; targeted Biome passed; filtered `@gnd/www` typecheck grep reported no touched-file diagnostics; static import scans found no live sheet imports of the old roles/profile table paths; `git diff --check` passed; `components/tables-2/core` remained unchanged; HTTP smoke returned `307` from `/hrm/employees` to `/hrm/employees/v2` and `200` for `/hrm/employees/v2`.

## 2026-07-17 Role Form Permissions Table-Core Migration

- The role create/edit form now renders `apps/www/src/components/tables-2/role-form-permissions/*` instead of inline `@gnd/ui/table` permission markup.
- The embedded permissions grid preserves the existing role form contract: one row per permission subject, `Create` bound to `permissions.view <subject>.checked`, `Edit` bound to `permissions.edit <subject>.checked`, the existing title field, submit/cancel flow, loading skeleton behavior, and `createRoleAction` payload shape.
- `TABLE_CONFIGS["role-form-permissions"]` uses compact 48px rows, sticky Permission column, content-fit Permission `240/420/300`, Create `84/112/92`, and Edit `84/112/92` widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, and persisted settings.
- `get-role-form` now uses the current two-argument `revalidateTag("permissions", "max")` signature, and `role-form-context` keeps a local typed resolver adapter for the installed Zod/resolver package-version boundary.
- Validation: focused role/profile parity tests passed with 13 tests / 80 assertions; full restarted table parity suite passed with 245 tests / 2337 assertions; targeted Biome passed; touched-file filtered `@gnd/www` typecheck output showed no diagnostics; static scan found no old table primitives in `role-form.tsx`; `git diff --check` passed; `components/tables-2/core` remained unchanged; HTTPS route smoke for `/hrm/employees/v2` returned `200`.

## 2026-07-17 Employee Form Permissions Table-Core Migration

- The employee create/edit modal now renders `apps/www/src/components/tables-2/employee-form-permissions/*` instead of inline `@gnd/ui/table` permission markup.
- The embedded permissions grid preserves the existing employee override contract: one row per permission subject, `Create` toggles the subject `viewPermissionId`, `Edit` toggles the subject `editPermissionId`, selected ids remain stored in `permissionIds`, and the existing employee save mutation/list invalidation flow is unchanged.
- `TABLE_CONFIGS["employee-form-permissions"]` uses compact 48px rows, sticky Permission column, content-fit Permission `240/420/300`, Create `84/112/92`, and Edit `84/112/92` widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, and persisted settings.
- Validation: focused employee form permissions plus role/employees parity tests passed with 14 tests / 44 assertions; full restarted table parity suite passed with 249 tests / 2337 assertions; targeted Biome passed; touched-file filtered `@gnd/www` typecheck output showed no diagnostics while broad `@gnd/www` typecheck remains blocked by unrelated baseline API/UI errors; static scan found no old table primitives in `employee-form-modal.tsx`; `git diff --check` passed; `components/tables-2/core` remained unchanged; HTTPS route smoke for `/hrm/employees/v2` returned `200`.

---

## New DB Schema — `packages/db/src/schema/hrm.prisma`

```prisma
model EmployeeRecord {
  id               Int       @id @default(autoincrement())
  userId           Int
  type             String    // "insurance" | "background-check" | "certification" | "id" | "other"
  title            String
  storedDocumentId String?   // → StoredDocument.id (no raw url — file handled by StoredDocument)
  expiresAt        DateTime?
  status           String    @default("pending") // "pending" | "approved" | "rejected"
  approvedById     Int?
  approvedAt       DateTime?
  rejectedAt       DateTime?
  notes            String?
  meta             Json?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  user        Users     @relation(fields: [userId], references: [id])
  approvedBy  Users?    @relation(name: "recordApprovals", fields: [approvedById], references: [id])

  @@index([userId, type, status])
  @@index([storedDocumentId])
  @@index([expiresAt, status])
}
```

Add to `Users`:
```prisma
employeeRecords     EmployeeRecord[]
recordApprovals     EmployeeRecord[] @relation(name: "recordApprovals")
```

### StoredDocument conventions for employee records
- `ownerType` = `"employee-record"`
- `ownerId` = `userId` (string cast of Int)
- `ownerKey` = `EmployeeRecord.id` (string, set after record creation)
- `kind` = matches `EmployeeRecord.type` (e.g. `"insurance"`, `"certification"`)
- `visibility` = `"private"`
- `uploadedBy` = uploading user's id

**Flow:** upload file → create `StoredDocument` → create `EmployeeRecord` with `storedDocumentId`. File URL resolved from `StoredDocument.url` at read time.

---

## Feature Layout

### Routes

```
apps/www/src/app/(sidebar)/hrm/employees/
├── page.tsx                        # Enhanced list (reuses feature/employee-list-page)
└── [employeeId]/
    └── page.tsx                    # NEW: per-employee overview
```

### Feature Folder (standalone)

```
apps/www/src/features/employee-management/
├── index.ts                        # barrel
├── types.ts                        # EmployeeRecord, EmployeeOverview, RoleAnalytics types
├── components/
│   ├── employee-list-page.tsx      # Enhanced list shell (wraps existing table + adds stat header)
│   ├── employee-overview-page.tsx  # Per-employee dashboard shell
│   ├── analytics/
│   │   ├── sales-analytics.tsx     # Sales rep: order count, revenue, commission, top customers
│   │   ├── contractor-analytics.tsx # Contractor: job count, completion rate, payout summary
│   │   └── production-analytics.tsx # Production: assignments, completion rate, items produced
│   ├── records/
│   │   ├── employee-records-tab.tsx     # Records list with status badges + upload button
│   │   ├── record-upload-form.tsx       # Upload modal: type, title, url/file, expiry date
│   │   └── record-approval-actions.tsx  # Approve/Reject actions (manager-only)
│   └── shared/
│       ├── overview-stat-card.tsx   # Reusable stat card (label, value, sub-label, icon, trend)
│       └── employee-info-header.tsx # Avatar, name, role badge, status, quick actions
└── hooks/
    └── use-employee-overview.ts     # tRPC query hooks
```

### API Layer — `apps/api/src/trpc/routers/employees.route.ts` (NEW)

```
employeesRoutes
├── getOverview(employeeId)         # meta + all analytics + records
├── getSalesAnalytics(employeeId)   # sales rep data
├── getContractorAnalytics(employeeId) # jobs data
├── getProductionAnalytics(employeeId) # assignments data
├── getRecords(employeeId)          # employee records list
├── addRecord(input)                # upload record
├── approveRecord(recordId)         # manager: approve
├── rejectRecord(recordId, notes)   # manager: reject
└── hasValidInsurance(userId)       # used by job gate
```

---

## Data Contracts

### EmployeeOverview
```ts
interface EmployeeOverview {
  user: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    roles: string[];
    profile?: string;
    createdAt: string;
  };
  analytics: {
    sales?: SalesAnalytics;        // present if user has salesRep role
    contractor?: ContractorAnalytics; // present if user has contractor/installer role
    production?: ProductionAnalytics; // present if user has production role
  };
  records: EmployeeRecord[];
  insuranceStatus: "valid" | "expired" | "missing" | "pending";
}
```

### SalesAnalytics
```ts
interface SalesAnalytics {
  totalOrders: number;
  totalRevenue: string;
  totalCommission: string;
  pendingCommission: string;
  recentOrders: { id: number; salesNo: string; total: string; date: string }[];
}
```

### ContractorAnalytics
```ts
interface ContractorAnalytics {
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  totalEarnings: string;
  pendingPayout: string;
  recentJobs: { id: number; title: string; status: string; date: string }[];
}
```

### ProductionAnalytics
```ts
interface ProductionAnalytics {
  totalAssignments: number;
  completedAssignments: number;
  pendingAssignments: number;
  totalItemsProduced: number;
  recentAssignments: { id: number; item: string; qty: number; completedAt?: string }[];
}
```

### EmployeeRecord
```ts
interface EmployeeRecord {
  id: number;
  type: "insurance" | "background-check" | "certification" | "id" | "other";
  title: string;
  document?: {           // resolved from StoredDocument at read time
    id: string;
    url: string;
    filename?: string;
    mimeType?: string;
    size?: number;
  };
  expiresAt?: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
}
```

## Permissions

- The employee overview page only shows the admin upload modal to users with `auth.can.editEmployeeDocument`.
- The document approvals page is also guarded by `editEmployeeDocument`; the legacy `reviewEmployeeDocument` permission is no longer used.
- Regular employees continue to manage their own insurance uploads from their profile document flow.
- Employee records now include per-user permission overrides stored in `ModelHasPermissions`; those permissions are merged with the assigned role on login/session refresh.
- The employee list and overview surface the count of employee-specific permissions so admins can spot overrides quickly.
- `/hrm/document-approvals` now renders the insurance approval queue through `components/tables-2/document-approvals/*` with compact sticky Employee/Actions columns, table-owned scroll, DnD, resize, persisted visibility/sizing/order/divider settings, and preserved Open Review / Approve / Reject behavior.

---

## Insurance Gate Logic

Applied at job creation on both **web** and **expo app**:

```ts
// Before allowing job creation for a contractor:
// 1. Check EmployeeRecord where type = "insurance" AND userId = contractorId
// 2. Check: status = "approved" AND (expiresAt IS NULL OR expiresAt > now())
// 3. If no valid record → block with message: "Contractor has no valid insurance on file."
```

Gate implemented in:
- `apps/api/src/trpc/routers/employees.route.ts` → `hasValidInsurance()` helper
- Called from job creation procedure (existing jobs route) before insert
- Web job form shows inline warning if contractor selected has no valid insurance
- Expo app job form shows same warning

Current bridge implementation in legacy contractor flows:
- Insurance uploads save into `Users.documents` with approval metadata in `meta.status`.
- Super admins review those uploads from `/hrm/document-approvals`.
- Access to the approval queue is protected by the `reviewEmployeeDocument` permission.
- Admin and Super Admin users can upload a document directly from employee overview on behalf of the employee.
- Expo Documents screen supports employee self-upload for image-based insurance/workers comp documents using the mobile gallery flow.
- Web contractor job submission blocks when insurance is missing, pending, rejected, or expired.
- Contractor job deletion now supports mistake recovery for unlocked submissions: the assigned contractor or an `editJobs` admin may soft-delete a job before approval/payment, while approved, completed, paid, payment-cancelled, and payout-linked jobs are locked by the API and exposed to web/Expo through `deletionEligibility`.
- Contractor payout overview and printed payout reports show each job's `Jobs.description` and custom-job status so installer pay reports explain what was installed; new payout snapshots persist both fields for cancelled/reversed history, while older snapshots without them hydrate missing values as `null`.
- Contractor payout reports treat generic custom jobs specially: description/lot text is promoted into the visible job label, unlinked custom jobs no longer print misleading `No project / No unit` labels, and the PDF uses a branded GND cover page, address/contact block, logo watermark, and cancelled watermark where applicable.

---

## UI: Employee List Page (enhanced)

Adds above the existing table:
- **Stat bar**: Total employees | Active contractors | Expiring records (next 30 days) | Missing insurance
- Quick filter badges: All | Sales Reps | Contractors | Production
- Text search via `q` on employee name, email, username, phone number, and assigned profile
- Row click → navigates to `[employeeId]` overview

---

## UI: Employee Overview Page

```
┌─────────────────────────────────────────────────┐
│  Avatar  Name   Role badges   Status   Actions  │  ← employee-info-header
└─────────────────────────────────────────────────┘
┌──────────┬──────────┬──────────┬─────────────────┐
│ Stat     │ Stat     │ Stat     │ Stat             │  ← overview-stat-cards
└──────────┴──────────┴──────────┴─────────────────┘
┌─────────────────────────────────────────────────┐
│  [Analytics] [Records] [Activity]               │  ← tabs
│                                                 │
│  (role-specific analytics chart + recent items) │
└─────────────────────────────────────────────────┘
```

Admin affordances:
- Records tab includes an upload action for Admin and Super Admin users.
- Upload-on-behalf saves to the viewed employee, refreshes the overview query, and pushes insurance documents into the normal pending-review workflow.

Record interactions:
- Each employee record can be previewed directly from the overview tab.
- Preview opens an in-app document viewer for PDFs and images, with an external-open fallback for unsupported file types.

Mobile app notes:
- `/documents` now includes a mobile upload CTA and inline upload form.
- Current mobile upload scope is image-library based; PDF/document-picker support remains a follow-up enhancement.

---

## Execution Phases

| Phase | Scope | Deliverable |
|-------|-------|-------------|
| **1** | DB schema | `EmployeeRecord` migration + Prisma model |
| **2** | API layer | `employees.route.ts` — all procedures |
| **3** | Feature types + hooks | `types.ts`, `use-employee-overview.ts` |
| **4** | Shared components | `overview-stat-card.tsx`, `employee-info-header.tsx` |
| **5** | Analytics blocks | `sales-analytics.tsx`, `contractor-analytics.tsx`, `production-analytics.tsx` |
| **6** | Records tab | `employee-records-tab.tsx`, `record-upload-form.tsx`, `record-approval-actions.tsx` |
| **7** | Page shells | `employee-list-page.tsx`, `employee-overview-page.tsx` |
| **8** | Routes | `[employeeId]/page.tsx`, update `employees/page.tsx` |
| **9** | Insurance gate | Inject `hasValidInsurance` check into job creation flow |
| **10** | Expo app | Mirror insurance warning on mobile job form |

---

## What Stays Untouched

- `/components/employee-header.tsx` — only reused
- `/components/modals/employee-form-modal.tsx` — only reused
- `/components/tables/employees/` — only reused (extended via new columns prop)
- All existing HRM routes/actions (contractors, jobs, payments)
- All existing tRPC `hrmRoutes` procedures
