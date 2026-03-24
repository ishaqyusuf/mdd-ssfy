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
- Web contractor job submission blocks when insurance is missing, pending, rejected, or expired.

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
