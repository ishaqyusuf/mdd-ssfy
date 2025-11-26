
# FULL FUNCTIONAL CODE BLOCKS
## backlog-table-page: `snip-data-table-page`

```typescript
import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton"; 
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { DataTable } from "@/components/tables/backlog/data-table";
import { BacklogHeader } from "@/components/backlog-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadBacklogFilterParams } from "@/hooks/use-backlog-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Backlog | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props) {
    const searchParams = await props.searchParams;
    const filter = loadBacklogFilterParams(searchParams);
    batchPrefetch([
        trpc.backlog-route.getBacklog.infiniteQueryOptions({
            ...filter,
        }),
    ]);
    return (
        <div>
        <PageTitle>Backlog</PageTitle>
            <BacklogHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<TableSkeleton />}>
                    <DataTable />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
```
## backlog-header `components/backlog-header.tsx`
```typescript
import { BacklogSearchFilter } from "./backlog-search-filter";
import { OpenBacklogSheet } from "./open-backlog-sheet";

export function BacklogHeader({}) {
    return (
        <div className="flex justify-between">
            <BacklogSearchFilter />
            <div className="flex-1"></div>
            <OpenBacklogSheet/>
        </div>
    );
}
```
## `components/open-backlog-sheet`
```typescript
import { useBacklogParams } from "@/hooks/use-backlog-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenBacklogSheet() {
  const { setParams } = useBacklogParams();

  return (
    <div>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setParams({ 

        })}
      >
        <Icons.Add />
      </Button>
    </div>
  );
}

```
## `components/backlog-search-filter.tsx`
```typescript
"use client";
import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";
import { backlogFilterParams } from "@/hooks/use-backlog-filter-params";

export function BacklogSearchFilter() {
    return (
        <SearchFilterProvider
            args={[
                {
                    filterSchema: backlogFilterParams,
                },
            ]}
        >
            <Content />
        </SearchFilterProvider>
    );
}

function Content({}) {
    const trpc = useTRPC();
    const { data: trpcFilterData } = useQuery({
        ...trpc.filters.backlog.queryOptions(),
    });

    return (
        <>
            <SearchFilterTRPC
                placeholder={"Search Backlogs..."}
                filterList={trpcFilterData}
            />
        </>
    );
}
```
## `trpc/routers/filters.route.ts`
```typescript
backlog: publicProcedure.query(async (props) => {
     return backlogFilters(props.ctx)
  })
```
## `db/queries/filters.ts`
```typescript
export async function backlogFilters(ctx: TRPCContext) {
  type T = keyof GetBacklogsSchema;
  type FilterData = PageFilterData<T>;
  // const steps = labelValueOptions(
  //   await ctx.db.Backlogs.findMany({
  //     where: {},
  //     select: {
  //       id: true,
  //       title: true,
  //     },
  //   }),
  //   "title",
  //   "id"
  // );
  const resp = [
    searchFilter,
    // optionFilter<T>("categoryId", "Category", steps),
    // dateRangeFilter<T>("dateRange", "Filter by date"),
  ] satisfies FilterData[];

  return resp;
}
```
## `hooks/use-backlog-filter-params.ts`
```typescript
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["backlog-route"]['getBacklog'], void>;

export const backlogFilterParams = {
    q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useBacklogFilterParams() {
    const [filters, setFilters] = useQueryStates(backlogFilterParams);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadBacklogFilterParams = createLoader(
    backlogFilterParams,
);
```
## router `routers/backlog.routes.ts`
```typescript
  getBacklogs: publicProcedure.input(getBacklogsSchema)
  .query(async (props) => {
    return getBacklogs(props.ctx,props.input)
  }), 
```
## `db/queries/backlog.ts`
```typescript
export const getBacklogsSchema = z
  .object({
    q: z.string().optional().nullable(),
  })
  .merge(paginationSchema);
export type GetBacklogsSchema = z.infer<typeof getBacklogsSchema>;

export async function getBacklogs(
  ctx: TRPCContext,
  query: GetBacklogsSchema
) {
  const {db} = ctx;
  // const query = {};
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereBacklogs(query),
    db.backlogs
  );

  const data = await db.backlogs.findMany({
    where,
    ...searchMeta,
    select: {
      id: true,
       
    },
  });

  return await response(
    data.map((d) => ({
      ...d
    }))
  );
}
function whereBacklogs(query: GetBacklogsSchema) {
  const where: Prisma.BacklogsWhereInput[] = [
     
  ];
  if (query.q) {
    where.push({
    
    });
  }
  return composeQuery(where);
}
```
## `components/tables/example/data-table.tsx`
```typescript
"use client";

import { useTRPC } from "@/trpc/client";
import { TableProvider, useTableData } from "..";
import { columns, mobileColumn } from "./columns";
import { Table, TableBody } from "@gnd/ui/table";
import { TableHeaderComponent } from "../table-header";
import { TableRow } from "../table-row";
import { LoadMoreTRPC } from "../load-more";

import { useOrderFilterParams } from "@/hooks/use-sales-filter-params";
import { BatchActions } from "./batch-actions";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesOrdersStore } from "@/store/sales-orders";

export function DataTable() {
    const trpc = useTRPC();
    const { rowSelection, setRowSelection } = useSalesOrdersStore();
    const { filters } = useOrderFilterParams();
    const { data, ref, hasNextPage } = useTableData({
        filter: filters,
        route: trpc.sales.index,
    });
    const tableScroll = useTableScroll({
        useColumnWidths: true,
        startFromColumn: 2,
    });
    const overviewQuery = useSalesOverviewQuery();
    return (
        <TableProvider
            args={[
                {
                    columns,
                    mobileColumn: mobileColumn,
                    data,
                    checkbox: true,
                    tableScroll,
                    rowSelection,
                    setRowSelection,
                    tableMeta: {
                        rowClick(id, rowData) {
                            overviewQuery.open2(rowData.uuid, "sales");
                        },
                    },
                },
            ]}
        >
            <div className="flex flex-col gap-4 w-full">
                <div
                    ref={tableScroll.containerRef}
                    className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide"
                >
                    <Table>
                        <TableHeaderComponent />
                        <TableBody>
                            <TableRow />
                        </TableBody>
                    </Table>
                </div>
                {hasNextPage && (
                    <LoadMoreTRPC ref={ref} hasNextPage={hasNextPage} />
                )}
                <BatchActions />
            </div>
        </TableProvider>
    );
}
```
## `components/forms/backlog-form`
```typescript
import { Form } from "@gnd/ui/form";
import { SubmitButton } from "@/components/submit-button";

interface Props  {
  defaultValues: typeof backlogFormSchema.type
}
export function BacklogForm({
  defaultValues = {}
}: Props) {
  const form = useZodForm(backlogFormSchema), {
    defaultValues: {
      ...defaultValues
    }
  })
  const trpc = useTRPC();
  const qc = useQueryClient();
  const {isPending,mutate} = useMutation(
    trpc.backlog-route.saveBacklog.mutationOptions({
      meta: {
              toastTitle: {
                error: "Something went wrong",
                loading: "Saving...",
                success: "Success",
              },
            },
      onSuccess() {
        form.reset();
        qc.invalidateQueriest({
          queryKey: trpc.backlog-route.getBacklog.queryKey()
        })
      },
    })
  )
  const onSubmit = (data: typeof backlogFormSchema.type) => {
    mutate(data)
  }
  return <div>
    <Form {...form}>
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
        
        <SubmitButton isSubmitting={isPending}>Save</SubmitButton>
        <FormDebugBtn />
      </form>
    </Form>
  </div>
}
```
## `backlog-form-trpc-routes`
```typescript
  import {saveBacklog,backlogFormSchema,getBacklogForm,getBacklogFormSchema} from "@api/db/queries/backlog-route";

  saveBacklog: publicProcedure
    .input(backlogFormSchema)
    .mutation(async (props) => {
      return saveBacklog(props.ctx, props.input);
    }),
  getBacklogForm: publicProcedure
    .input(getBacklogFormSchema)
    .mutation(async (props) => {
      return getBacklogForm(props.ctx, props.input);
    }),

```
## `backlog-form-queries`
```typescript

  export const backlogFormSchema = z
  .object({
     param: z.string()
  });
export type BacklogFormSchema = z.infer<typeof backlogFormSchema>;

export async function saveBacklog(
  ctx: TRPCContext,
  query: BacklogFormSchema
) {
  const {db} = ctx;
  
}
  export const getBacklogFormSchema = z
  .object({
     
  });
export type GetBacklogFormSchema = z.infer<typeof backlogFormSchema>;
export async function getBacklogForm(
  ctx: TRPCContext,
  query: GetBacklogFormSchema
) {
  const {db} = ctx;
  
}
```

# form-context sheet
## `hooks/use-backlog-params.ts`
```typescript
import { parseAsBoolean, parseAsString, useQueryStates,parseAsInteger } from "nuqs";
 
export function useBacklogParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      openBacklogId: parseAsInteger
    },
    options
  );
  const opened = !!params.openBacklogId
  return {
    ...params,
    setParams,opened
  };
}
```
## `query/backlog.ts`
```typescript
export const saveGetBacklogsSchema = z.object({
  name: z.string().min(1),
});
export type SaveBacklog = z.infer<typeof saveGetBacklogsSchema>;

```