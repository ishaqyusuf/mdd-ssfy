# Super Prompt Instruction — Developer System Guide

> This document captures the developer's monorepo logic, API patterns, frontend data/query patterns, form/UI structure, code-response rules for AI, and AI behavior logic.  
> Sections are numbered. When you want a compiled file with specific sections, request: "Compile sections X–Y".

---

## 1️⃣ Monorepo Architecture Logic (Base Standard)

### Root Layout
```
/
├── apps/
│   ├── api/                # API service (Hono + tRPC)
│   ├── web/                # Next.js web application(s)
│   ├── mobile/             # Expo React Native mobile app(s)
│   └── ...other apps       # Any extra frontends, admin dashboards, etc.
│
├── packages/
│   ├── ui/                 # Shared Next.js UI components & design system
│   ├── db/                 # Central Prisma setup, migrations, DB client
│   ├── utils/              # Shared global utilities, types, helpers
│   └── ...other packages   # (e.g. auth, emails, config, etc.)
```

### Logic Rules
- **API (apps/api):**
  - Uses **Hono** for routing.
  - Integrates **tRPC** for typed API contracts.
  - All data access through **packages/db** (Prisma).
  - Shared schemas/types live in **packages/utils**.

- **Web Apps (apps/...):**
  - Built on **Next.js App Router**.
  - Use **packages/ui** for all design and components.
  - Call **tRPC endpoints** or **direct server actions** for data flow.
  - Environment handled through `.env` per app with fallback defaults.

- **Mobile (Expo):**
  - Shares utilities and constants from **packages/utils**.
  - Calls the **API layer** for all remote actions.
  - UI follows atomic composition with theming support.

- **Shared Packages:**
  - `ui`: Only Next.js components (no server actions inside).
  - `db`: Handles all Prisma logic (client, schema, migrations).
  - `utils`: Pure functions, constants, zod schemas, and global types.

- **Code Flow Logic:**
  - Shared logic lives in `/packages`.
  - Apps should *never* import from each other, only from `/packages`.
  - Type safety is global — Zod and Prisma types extend across the repo.
  - Each change to `db` or `utils` should trigger rebuilds of dependents.

---

## 2️⃣ API Logic (tRPC + Hono Standard)

### Folder Structure
```
apps/api/
└── src/
    ├── routers/
    │   ├── _app.ts               # Central route registration
    │   ├── example.route.ts      # Example route file
    │   └── ...other.route.ts
    ├── db/
    │   └── queries/
    │       ├── example.ts        # Query logic file
    │       └── ...other.ts
    ├── init.ts                   # TRPC/Hono initialization
    └── trpc/                     # Context + middleware definitions
```

### Routing Pattern
All routes are registered in `src/routers/_app.ts`:

```ts
export const appRouter = createTRPCRouter({
  example: exampleRoutes,
  user: userRoutes,
  // ...more routes
});
```

Each route file (e.g. `example.route.ts`) follows this strict pattern:

```ts
import { createTRPCRouter, publicProcedure } from "../init";
import { exampleFn, exampleFnSchema } from "@api/db/queries/example";

export const exampleRoutes = createTRPCRouter({
  getExample: publicProcedure
    .input(exampleFnSchema)
    .query(async (props) => {
      return exampleFn(props.ctx, props.input);
    }),
});
```

**Rules:**
- Each route function delegates *all logic* to a query file in `/db/queries`.
- Procedures use Zod schemas for strict validation.
- No direct Prisma or business logic inside routers.

### Example from user (preserve as source)
User provided this exact example:

`src/routers/_app.ts` all routes are registered here.  
`src/routers/example.route.ts` this is an example route file

```ts
import { createTRPCRouter, publicProcedure } from "../init"; 
import { exampleFn,exampleFnSchema } from "@api/db/queries/example";
export const userRoutes = createTRPCRouter({
   getLoginByToken: publicProcedure
    .input(exampleFnSchema)
    .query(async (props) => {
      return exampleFn(props.ctx, props.input);
    }),
});
```

`src/db/queries/example.ts` example structure:

```ts
import type { TRPCContext } from "@api/trpc/init";
import { z } from "zod";
export const exampleFnSchema = z
  .object({
    ...
  });

export type ExampleSchema = z.infer<typeof exampleFnSchema>;
  export async function exampleFn(
  ctx: TRPCContext,
  query: ExampleSchema
) {
    const {db} = ctx;
// ...
return {};
}
```

---

### Pagination & Filter Example (user-provided)
For paginated result, user provided the following pattern:

```ts
import { composeQueryData,composeQuery } from "@gnd/utils/query-response";

import { paginationSchema } from "@gnd/utils/schema";
import type { Prisma } from "@gnd/db";
import { transformFilterDateToQuery } from "@gnd/utils";
// - extend schema with paginationSchema (.extend(paginationSchema.shape))
// function ...
const model = db.modelName;
 const { response, searchMeta, meta, where } = await composeQueryData(
    query,
    whereExample(query),
    model
  ); 

  const data = await model.findMany({
    where,

    ...searchMeta,
    //  select: {}
    // include: {}
  });
  return await response(
    data.map((item) => {
      return {
        ...item
      };
    })
  );
  function whereStat(query: ExampleSchema) { 
    const queries: Prisma.ModelNameWhereInput[] = []
    for (const [k, v] of Object.entries(query)) {
    if (!v) continue;

    const value = v as any;
    switch (k as keyof ExampleSchema) {
      case "q":
        const q = { contains: v as string };
        // where.push({
        //   OR: [
        //     {
        //       search: q,
        //     },
        //     {
        //       modelName: q,
        //     },
        //   ],
        // });
        break;
      case "dateRange":
        where.push({
          createdAt: transformFilterDateToQuery(query.dateRange),
        });
        break;
    }
  }
  return composeQuery(where);
  }
```

**Notes / Rules**
- Use `composeQueryData` to get `{ response, searchMeta, meta, where }`.
- Use `composeQuery` to merge `where` filters.
- Extend Zod schema with `paginationSchema.shape`.
- Use `transformFilterDateToQuery` for dateRange conversion.

---

## 3️⃣ Code Response Logic (AI Instruction Standard)

### 🎯 Primary Goal
Ensure **speed**, **clarity**, and **minimal disruption** to existing codebases.  
AI responses must **focus on the exact change** or **addition** requested — never full rewrites unless explicitly asked.

### 🧱 Response Structure Rules

#### 1. Only Return Modified Code
- Respond **only with the modified section**, not the entire file.
- Always show **contextual comments** marking where change occurs.

Example:
```ts
// 🧩 Added new filter logic here
case "status":
  where.push({ status: v as string });
  break;
```

#### 2. Mark Changes Clearly
Use inline comments:
```ts
// before:
// const limit = 10;
// after:
const limit = query.limit ?? 10; // ✅ now dynamic
```

#### 3. Markdown Fences
Only use triple backticks when showing **multi-line code blocks**. For one-liners, show inline.

#### 4. Keep Explanations Minimal
- Explanations only when the change is non-obvious.
- Never restate code purpose unless logic changed.

Example:
> Added pagination schema extension and updated query builder.

#### 5. Maintain Naming Consistency
AI must **never rename variables, functions, or files** unless requested.

#### 6. Respect Monorepo Imports
- Always import shared utilities from `@pkgname/...`.
- Never use relative imports (`../../`).

#### 7. Assume Type Safety
- TypeScript strict mode compatible.
- Use Zod for validation.
- Use Prisma types for DB calls.

#### 8. Response Priority Order
When generating or fixing code:
1. Apply requested logic only.
2. Preserve structure.
3. Maintain existing naming and typing conventions.
4. Avoid unnecessary abstractions.
5. Add short rationale comment if logic changed.

#### 9. Example Prompt Behavior
**Prompt:**
> add limit and offset pagination to exampleFn

**Expected AI Response:**
```ts
// 🧩 Added pagination support
const { response, searchMeta, meta, where } = await composeQueryData(
  query.extend(paginationSchema.shape),
  whereExample(query),
  model
);
```
###  Mobile App Standards

- Mobile **must only import** from `@acme/api`.  
- **Never use** `@acme/ui` inside mobile; the mobile app has its own component set.  
- All component files must use **kebab-case** naming (e.g., `some-component.tsx`), never `someComponent`.

### UI Data Model Standards

- Always design UI components so they can **accept a data model**, not hard-coded values.  
- Provide a **dummy data model** when building UI, making it easy to later replace it with any API response model.  
- Dummy models must follow the **expected shape** of the final API data (fields, casing, optionality).  
- Keep dummy model definitions inside a `/__mocks__/` folder or within the UI file under a clearly marked `// MOCK DATA MODEL` section.


---

## 4️⃣ AI Behavior Logic

### 👤 Developer Context
You are **Ishaq**, a **professional full-stack developer** with over 15 years of experience.  
AI must **skip beginner explanations**, **avoid lecturing**, and **communicate like a senior peer**.

### ⚙️ General Behavior

#### 1. Assume Expert Context
- Do **not** explain basic concepts, syntax, or framework fundamentals.
- Communicate like a **technical collaborator**, not an instructor.

#### 2. Context Awareness
- Always **assume monorepo structure** and shared logic unless told otherwise.
- When unsure which package or layer applies, ask briefly:
  > “Is this for the API layer or the Next.js app?”

#### 3. Ask for Clarification Only When Necessary
- If context is ambiguous, ask **one concise clarification question**.
- Do not ask multiple or redundant questions.

#### 4. Response Tone
- Professional, succinct, technical.
- Avoid filler phrases like “Sure!”, “Here you go”, etc.

#### 5. Multi-File Reasoning
- When logic spans multiple files, respond in **segmented snippets** per file.
- Prefix each snippet with file path comment:
```ts
// apps/api/src/routers/user.route.ts
// packages/db/queries/user.ts
```
- Include only the updated parts.

#### 6. Code Quality Consistency
- Type-safe, functional style when practical.
- Clear async/await usage.
- Consistent error handling (`try/catch` with typed errors).

#### 7. Communication Rules
- Speed > verbosity.
- Never restate instructions.
- End with code or a concise note if changes are non-trivial.

#### 8. Improvement Awareness
- If a clear enhancement exists, mention one short line suggestion (optional).
- Do not implement the improvement unless requested.

#### 9. File Convention Awareness
- `.route.ts` → tRPC router files.
- `/queries/` → query logic files.
- `.tsx` in `/ui/` → React components.
- `/utils/` → shared helpers only.

**Overall:** Act like a senior developer assisting another senior developer.

---
### Date & Time Standards

All date and time operations across the monorepo must use **date-fns**.  
This includes:
- Parsing dates (`parseISO`)
- Formatting dates (`format`)
- Date math and comparisons (`addDays`, `isBefore`, `isAfter`, etc.)

Do not use native JavaScript `Date` methods directly.




## 5️⃣ Frontend Data Query Logic (Next.js + Expo)

### 🗂 Standard Imports
```ts
import { _trpc,_qc } from "@/components/static-trpc";
import { useQuery, useMutation } from "@repo/ui/tanstack";
```

### Query Usage
```ts
 const { data:exampleData,isPending: isExamplePending } = useQuery(
        _trpc.example.exampleFn.queryOptions({
            // options
        }, {
            // 
        })
    );
```

### Mutation Usage
```ts
// mutation 
const { isPending, mutate } = useMutation(
        _trpc.example.exampleMutate.mutationOptions({
            meta: {
                toastTitle: {
                    // error: "Something went wrong",
                    // loading: "Saving...",
                    // success: "Success",
                },
            },
            onSuccess(data, variables, context) {

            },
              onError(error, variables, context) {}
        }),
    );
```

### Invalidate Query
```ts
  _qc.invalidateQueries({
                    queryKey: _trpc.example.exampleFn.queryKey({}),
                });
```

### Rules / Notes
- Use `_trpc` hooks for both Next.js and Expo.
- `_qc` is the shared QueryClient for cache operations.
- Use `isPending` for loading states (suspense-friendly).
- For paginated results, use backend `paginationSchema` and compose helpers.
- Mutations should invalidate relevant queries using `_qc.invalidateQueries()`.

---

## 6️⃣ Form & UI Structuring Logic (Next.js Only)

### Form Setup
```ts
import { useZodForm } from "@/hooks/use-zod-form";
const schema = z.object({...})
const form = useZodForm(schema, {
        defaultValues: {
            // title: input.inv?.name,
            // blockId: b.blockId,
        },
    });
```

### Mutation + Submit
```ts
 const { mutate: deleteInventoryInput, isPending: isDeleting } = useMutation(
        _trpc.community.deleteInputInventoryBlock.mutationOptions({
            onSuccess(data, variables, context) {},
            onError(error, variables, context) {},
        }),
    );
    const submit = (formData: z.infer<schema>) => { 

    }
```

### Form UI Structure
```tsx
// form ui structure
<Form {...form}>
    <form onSubmit={form.handleSubmit(submit)}>
        {/* ...form fields */}
    </form>
</Form>
```

### Submit Button
```tsx
import { SubmitButton } from "@/components/submit-button";
 <SubmitButton isSubmitting={isPending}>
     Save
 </SubmitButton>
```

### Shadcn Composite Imports & Usage
For shadcn imports, components with multiple subcomponents (Dialog, Popover, Sheet, Tabs, etc.) are wrapped for better import:

```ts
import {Dialog,Sheet} from "@acme/ui/composite"
```

Usage:
```tsx
<Sheet>
    <Sheet.Content>
        <Sheet.Header></Sheet.Header>
    </Sheet.Content>
</Sheet>

<Dialog>
    <Dialog.Content>
        <Dialog.Header></Dialog.Header>
    </Dialog.Content>
</Dialog>
```

**Rules**
- Composite components are re-exported from `@acme/ui/composite`.
- Avoid importing subcomponents individually.
- Maintain nested structure for headers/content.

---

## Appendix — Usage Tips for AI & Prompts

### How to ask for code changes (examples)
- "Add pagination to `exampleFn` using `paginationSchema` and `composeQueryData`."
- "Patch `example.route.ts` to include `getLoginByToken` procedure referencing `exampleFn`."
- "Return only the changed lines for `user.route.ts` when fixing the bug."

### Section Index
1. Monorepo Architecture Logic (Base Standard)  
2. API Logic (tRPC + Hono Standard)  
3. Code Response Logic (AI Instruction Standard)  
4. AI Behavior Logic  
5. Frontend Data Query Logic (Next.js + Expo)  
6. Form & UI Structuring Logic (Next.js Only)

---

## 7️⃣ Paginated / Infinite Data Views (Next.js)

### `page.tsx` — Server Component
```ts
import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { TableSkeleton } from "@/components/tables/skeleton";
import { ExampleHeader } from "@/components/example-header";
import { DataTable } from "@/components/tables/examples/data-table";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadExampleFilterParams } from "@/hooks/use-example-filter-params";
import { ErrorFallback } from "@/components/error-fallback";

export default async function Page(props) {
    const searchParams = await props.searchParams;
    const filter = loadExampleFilterParams(searchParams);

    batchPrefetch([
        trpc.examples.getExamples.infiniteQueryOptions({
            ...(filter as any),
        }),
    ]);

    return <>
        <ExampleHeader />
        <ErrorBoundary errorComponent={ErrorFallback}>
            <Suspense fallback={<TableSkeleton />}>
                <DataTable />
            </Suspense>
        </ErrorBoundary>
    </>;
}
```

### Filter Hook — `hooks/use-example-filter-params.ts`
```ts
import { parseAsBoolean, useQueryStates } from "nuqs";
import { createLoader, parseAsArrayOf, parseAsString } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";

type FilterKeys = keyof Exclude<RouterInputs["example"]["exampleFn"], void>;

export const exampleFilterParamsSchema = {
    q: parseAsString,
    // ...
} satisfies Partial<Record<FilterKeys, any>>;

export function useExampleFilterParams() {
    const [filters, setFilters] = useQueryStates(exampleFilterParamsSchema);

    return {
        filters: { ...filters },
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}

export const loadExampleFilterParams = createLoader(exampleFilterParamsSchema);
```

### Data Table — `components/tables/example/data-table.tsx`
```ts
"use client";

import { Table, useTableData } from "@acme/ui/data-table";
import { columns } from "./columns";
import { useExampleFilterParams } from "@/hooks/use-example-filter-params";
import { BatchActions } from "./batch-actions";
import { useTableScroll } from "@acme/ui/hooks/use-table-scroll";
import { NoResults } from "@acme/ui/custom/no-results";
import { EmptyState } from "@acme/ui/custom/empty-state";
import { Button } from "@acme/ui/button";
import Link from "next/link";
import { Icons } from "@acme/ui/custom/icons";
import { _trpc } from "@/components/static-trpc";
import { RouterInputs } from "@api/trpc/routers/_app";

interface Props {
    defaultFilters?: RouterInputs['example']['getExamples'];
    singlePage?: boolean;
}

export function DataTable(props: Props) {
    const { filters, hasFilters, setFilters } = useExampleFilterParams();
    const { data, ref: loadMoreRef, hasNextPage, isFetching } = useTableData({
        filter: { ...filters, ...(props.defaultFilters || {}) },
        route: _trpc.example.getExamples,
    });

    const tableScroll = useTableScroll({ useColumnWidths: true, startFromColumn: 2 });

    if (hasFilters && !data?.length) return <NoResults setFilter={setFilters} />;
    if (!data?.length && !isFetching) {
        return (
            <EmptyState
                CreateButton={
                    <Button asChild size="sm">
                        <Link href="/sales-book/create-order">
                            <Icons.add className="mr-2 size-4" />
                            <span>New</span>
                        </Link>
                    </Button>
                }
            />
        );
    }

    return (
        <Table.Provider
            args={[{
                columns,
                data,
                checkbox: true,
                tableScroll,
                rowSelection,
                props: { hasNextPage, loadMoreRef: props.singlePage ? null : loadMoreRef },
                setRowSelection,
                tableMeta: { rowClick(id, rowData) {} },
            }]}
        >
            <div className="flex flex-col gap-4 w-full">
                <Table.SummaryHeader />
                <div ref={tableScroll.containerRef} className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide">
                    <Table>
                        <Table.TableHeader />
                        <Table.Body>
                            <Table.TableRow />
                        </Table.Body>
                    </Table>
                </div>
                <Table.LoadMore />
                <BatchActions />
            </div>
        </Table.Provider>
    );
}
```

### Columns — `columns.tsx`
```ts
import { ColumnDef } from "@/types/type";
import { cells } from "@acme/ui/custom/data-table/cells";
import { RouterOutputs } from "@api/trpc/routers/_app";

export type Item = RouterOutputs["example"]["getExamples"]["data"][number];

export const columns: ColumnDef<Item>[] = [
    cells.selectColumn,
    { header: "Date", accessorKey: "salesDate", meta: {}, cell: ({ row: { original: item } }) => <>{item?.salesDate}</> },
    {
        header: "",
        accessorKey: "action",
        meta: {
            actionCell: true,
            preventDefault: true,
            className: "text-right md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-30 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-border after:absolute after:left-[-24px] after:top-0 after:bottom-0 after:w-6 after:bg-gradient-to-r after:from-transparent after:to-background group-hover:after:to-muted after:z-[-1]",
        },
        cell: ({ row: { original: item } }) => <Actions item={item} />,
    },
];

function Actions({ item }: { item: Item }) {
    return <div className="relative flex items-center gap-2 z-10">{/* actions */}</div>;
}
```

### Batch Actions
```ts
import { BatchAction, BatchDelete } from "@acme/ui/custom/data-table/batch-action";
import { useTable } from "@acme/ui/data-table";

export function BatchActions({}) {
    const ctx = useTable();
    return (
        <>
            {!ctx.selectedRows?.length || (
                <BatchAction>
                    <BatchDelete onClick={async () => { /* await deleteSalesByOrderIds(slugs); */ }} />
                </BatchAction>
            )}
        </>
    );
}
```

### Example Header
```ts
"use client";
import { exampleFilterParamsSchema } from "@/hooks/use-example-filter-params";
import { Button } from "@acme/ui/button";
import { Table } from "@acme/ui/data-table";
import { SearchFilter } from "@acme/ui/custom/search-filter";
import { _trpc } from "./static-trpc";
import { CreateExampleButton } from "./sales-custom-tab";
import { useQueryStates } from "nuqs";

export function ExampleHeader({}) {
    const [filters, setFilters] = useQueryStates(exampleFilterParamsSchema);
    return (
        <div className="flex gap-4">
            <SearchFilter filterSchema={exampleFilterParamsSchema} placeholder="Search Order Information..." trpcRoute={_trpc.example.getExampleFilters} trpQueryOptions={{}} {...{ filters, setFilters }} />
            <div className="flex-1"></div>
            <CreateExampleButton />
        </div>
    );
}
```

### Create Button
```ts
import { Button } from "@acme/ui/button";
import { Icons } from "@acme/ui/icons";

export function CreateExampleButton() {
    const onClick = () => {};
    return (
        <Button onClick={onClick}>
            <Icons.Add className="mr-2 size-4" />
            <span>New</span>
        </Button>
    );
}
```

### Server-side Filters
```ts
import { searchFilter, dateRangeFilter, optionFilter } from "@api/utils/filter";
export async function getExamplesFilter(ctx: TRPCContext) {
    type T = keyof GetExamplesSchema;
    const resp = [
        searchFilter,
        dateRangeFilter<T>("dateRange", "Order date"),
        optionFilter<T>("phone", "Phone", [].map(phone => ({ label: phone, value: phone })))
    ];
    return resp;
}
```

## 7️⃣ Paginated / Infinite Data Views (Expo / React Native)

### Mobile Infinite List Pattern (Expo / React Native)

This subsection defines the standard pattern for building infinite-scrolling lists in the mobile app using API data.  
It follows the same architectural intent as the web pagination system, adapted for mobile constraints.

Rules applied:
- Uses only `@acme/api` (via `_trpc`)
- No `@acme/ui` imports
- Kebab-case component naming
- UI accepts a replaceable data model
- Infinite loader is abstracted

---

Example screen: `home-screen.tsx`

import { useRef } from "react";
import { View } from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { LegendList } from "@legendapp/list";

import { useInfiniteLoader } from "@/components/infinite-loader";
import { ExamplePostListItem } from "@/components/example-post-list-item";
import { ExampleListEmpty } from "@/components/example-list-empty";
import { _trpc } from "@/components/static-trpc";

export default function HomeScreen() {
  const {
    data: posts,
    ref: loadMoreRef,
    refetch,
    isRefetching,
  } = useInfiniteLoader({
    route: _trpc.example.posts, // replaceable API route
  });

  const listRef = useRef(null);

  return (
    <View>
      <LegendList
        ref={listRef}
        data={posts}
        renderItem={({ item }) => (
          <ExamplePostListItem item={item} />
        )}
        keyExtractor={(item) => item?.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
          />
        }
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        recycleItems
        numColumns={2}
        columnWrapperStyle={{ gap: 8 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={ExampleListEmpty}
      />
    </View>
  );
}

---

Dummy Data Model (UI-safe, replaceable)

This model is used when building UI before API integration and must match the expected API shape.

type ExamplePost = {
  id: number;
  title: string;
  excerpt?: string;
  coverImage?: string;
  createdAt?: string;
};

const examplePostMock: ExamplePost = {
  id: 1,
  title: "Example Post Title",
  excerpt: "Short preview text",
  coverImage: undefined,
  createdAt: "2025-01-01",
};

Rules:
- UI components (ExamplePostListItem) must depend on this shape
- API responses must conform or be adapted to this shape
- Swapping mock data with API data must require zero UI changes

---

Best Practices

- Always abstract pagination logic into `useInfiniteLoader`
- Mobile lists must support pull-to-refresh
- Infinite loading must be API-driven, not UI-driven
- Never bind UI directly to raw API responses without a model shape
- Keep list items lightweight and memo-friendly



## 8️⃣ – Form System & Input Standardization

### 8.1 Overview
This section defines the standardized structure for building forms in the monorepo.
All forms use **useZodForm** for Zod-based validation, **custom input components** from @acme/ui/controls-2, and **composite layout components** from @acme/ui/composite.

The goal is consistent form design, predictable validation, and strong type safety.

---

### 8.2 Core Imports

import z from "zod";
import { useZodForm } from "@/components/use-zod-form";

import { InputField } from "@acme/ui/controls-2/input-field";
import { TextAreaField } from "@acme/ui/controls-2/textarea-field";
import { RadioGroupField } from "@acme/ui/controls-2/radio-group-field";
import { CheckboxField } from "@acme/ui/controls-2/checkbox-field";
import { SelectField } from "@acme/ui/controls-2/select-field";

import { Field, InputGroup } from "@acme/ui/composite";
import { cn } from "@acme/ui/cn"; 

---

### 8.3 Form Hook & Submission

const schema = z.object({});

const form = useZodForm(schema, {
  defaultValues: {},
});

const onSubmit = (data: z.infer<typeof schema>) => {
  // handle submission
};

---

### 8.4 Form Layout & Sections

<Field.Group className="gap-4 flex-row">
  <InputField control={form.control} name="name" label="Name" placeholder="Your Name" />
  <InputField control={form.control} name="email" label="Email" placeholder="Email" suffix="@gmail.com" />
</Field.Group>

<Field.Separator />

---

### 8.5 InputField Standard

<InputField
  control={form.control}
  name="username"
  label="Username"
  placeholder="Enter username"
  prefix={<User />}
  fieldProps={{ orientation: "responsive" }}
  inputGroupProps={{ className: cn("sm:w-[250px]") }}
  description={
    <>
      This is your public display name.
      <br /> Must be between 3 and 10 characters.
    </>
  }
/>

---

### 8.6 TextAreaField Standard

<TextAreaField
  control={form.control}
  name="feedback"
  label="Feedback"
  placeholder="Feedback..."
  suffix={
    <InputGroup.Button size="sm" variant="default" className="ml-auto">
      Submit
    </InputGroup.Button>
  }
/>

---

### 8.7 RadioGroupField Standard

<RadioGroupField
  control={form.control}
  name="plan"
  label="Plan"
  description="Plan Description"
  className="flex"
  options={[
    { id: "starter", title: "Starter", description: "Basic features" },
    { id: "pro", title: "Pro", description: "Advanced features" },
  ]}
/>

---

### 8.8 CheckboxField Standard

<CheckboxField
  control={form.control}
  name="emailNotification"
  label="Email Notifications"
  legend="Tasks"
  description="Get notified when tasks you've created have updates."
/>

<CheckboxField
  control={form.control}
  name="pushNotification"
  label="Push Notifications"
  disabled
/>

---

### 8.9 SelectField Standard

<SelectField
  control={form.control}
  name="billingPeriod"
  label="Billing Option"
  options={[
    { label: "Monthly", value: "monthly" },
    { label: "Yearly", value: "yearly" },
  ]}
/>

---

### 8.10 Composite & InputGroup Integration

<InputField
  control={form.control}
  name="accessToken"
  label="Access Token"
  prefix={<Search />}
  suffix={
    <InputGroup.Button aria-label="Copy" size="icon-xs">
      <Copy className="size-4" />
    </InputGroup.Button>
  }
/>

---

### 8.11 Guidelines & Best Practices

1. Use only `control-2` components for inputs.
2. Wrap related inputs in `Field.Group`.
3. Use `Field.Separator` to divide sections visually.
4. Set orientation per field or group as needed.
5. All submission should go through `form.handleSubmit(onSubmit)`.
6. Include description text where helpful for the user.
7. Use prefix/suffix consistently for icons, buttons, or status indicators.
8. Do not call `register` directly; always use `control` integration.


## 9️⃣ – Page Summary Cards & Widget System

### 9.1 Overview
Summary Cards provide quick overview metrics on a page. In this system, summary data is prefetched on the server using batchPrefetch() and rendered inside a responsive Suspense-wrapped widget grid. Each summary card is a client component responsible for fetching and displaying a single metric.

This section describes:
- Prefetch strategy
- Naming patterns
- Server widget containers
- Client summary card components
- SummaryCardItem usage
- Best practices

---

### 9.2 Server Page Prefetch + Widget Injection

Example page.tsx pattern:

import { ExampleSummaryWidgets } from "@/components/example-summary-widgets";
import { batchPrefetch, trpc } from "@/trpc/server";

export default async function Page() {
  batchPrefetch([
    trpc.example.exampleSummary.queryOptions({ type: "pending" }),
    trpc.example.exampleSummary.queryOptions({ type: "completed" }),
    trpc.example.exampleSummary.queryOptions({ type: "total" }),
    trpc.example.exampleSummary.queryOptions({ type: "avg" }),
  ]);

  return (
    <div className="space-y-6">
      <ExampleSummaryWidgets />
      {/* Page content */}
    </div>
  );@
}

Prefetch Rules:
- Always prefetch every summary variant needed for the page
- Use queryOptions({ type }) for each summary group
- Prefetch is done only in server components

---

### 9.3 Summary Widget Container (Server Component)

This component controls layout and wraps each summary card with Suspense:

import { Suspense } from "react";
import { SummaryCardSkeleton } from "./summary-card-skeleton";
import { ExampleTotalSummary } from "./example-total-summary";
import { ExamplePendingSummary } from "./example-pending-summary";
import { ExampleCompletedSummary } from "./example-completed-summary";
import { ExampleAverageSummary } from "./example-average-summary";

export async function ExampleSummaryWidgets() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-6">
      <Suspense fallback={<SummaryCardSkeleton />}>
        <ExampleTotalSummary />
      </Suspense>

      <Suspense fallback={<SummaryCardSkeleton />}>
        <ExamplePendingSummary />
      </Suspense>

      <Suspense fallback={<SummaryCardSkeleton />}>
        <ExampleCompletedSummary />
      </Suspense>

      <Suspense fallback={<SummaryCardSkeleton />}>
        <ExampleAverageSummary />
      </Suspense>
    </div>
  );
}

Notes:
- This is a server component
- Each card gets its own Suspense boundary
- Grid scales from 1 → 2 → 4 columns

---

### 9.4 Summary Card Client Components

Each summary card is a client component and uses useSuspenseQuery:

"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import NumberFlow from "@number-flow/react";
import { Package } from "lucide-react";
import { SummaryCardItem } from "./summary-card-item";

export function ExampleTotalSummary() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.example.exampleSummary.queryOptions({
      type: "total",
    })
  );

  return (
    <SummaryCardItem
      path="/example"
      summaryProps={{
        Icon: Package,
        title: "Total Items",
        value: <NumberFlow value={data?.value} />,
        subtitle: data?.subtitle,
      }}
    />
  );
}

Summary Component Rules:
- Must be a client component
- Must use useSuspenseQuery
- Only fetch its own metric (single responsibility)
- Pass data to SummaryCardItem for consistent UI

---

### 9.5 SummaryCardItem Usage

SummaryCardItem provides the card’s internal layout.

Example usage:

<SummaryCardItem
  path="/example"
  summaryProps={{
    Icon: Package,
    title: "Completed",
    value: <NumberFlow value={72} />,
    subtitle: "Up 5% from last month",
  }}
/>

Required Props:
- path: click navigation path
- summaryProps.Icon: Lucide icon
- summaryProps.title: label
- summaryProps.value: number or JSX
- summaryProps.subtitle: optional status text

---

### 9.6 Naming Standardization

Use this naming pattern for consistency:

Server Widget Container:
- ExampleSummaryWidgets

Client Summary Cards:
- ExampleTotalSummary
- ExamplePendingSummary
- ExampleCompletedSummary
- ExampleAverageSummary

Prefetch Types:
- queryOptions({ type: "total" })
- queryOptions({ type: "pending" })
- queryOptions({ type: "completed" })
- queryOptions({ type: "avg" })

Domain Replacement Rule:
Replace "Example" with your page or model domain, e.g.:
- SalesSummaryWidgets
- InventorySummaryWidgets
- UserSummaryWidgets

---

### 9.7 Best Practices

1. Always prefetch summary queries in server components.
2. Wrap every card in its own Suspense component.
3. Do not group multiple queries inside one summary card.
4. Use NumberFlow (or similar) for animated numeric values.
5. Summary card grid should remain responsive and uniform.
6. Maintain clean and domain-specific naming using Example* as the base pattern.
7. Keep the summary card API consistent across all pages.

