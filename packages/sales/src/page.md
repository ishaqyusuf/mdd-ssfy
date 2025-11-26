# data-page
# data-page
## `db/queries/salesProductions.ts`
```typescript
export const getSalesProductionsSchema = z
  .object({
    q: z.string().optional().nullable(),
  })
  .merge(paginationSchema);
export type GetSalesProductionsSchema = z.infer<typeof getSalesProductionsSchema>;

export async function getSalesProductions(
  ctx: TRPCContext,
  query: GetSalesProductionsSchema
) {
  const {db} = ctx;
  // const query = {};
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereSalesProductions(query),
    db.orderItemProductionAssignments
  );

  const data = await db.orderItemProductionAssignments.findMany({
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
function whereSalesProductions(query: GetSalesProductionsSchema) {
  const where: Prisma.OrderItemProductionAssignmentsWhereInput[] = [
     
  ];
    for (const [k, v] of Object.entries(query)) {
      if (!v) continue;
      switch (k as keyof GetSalesProductionsSchema) {
        case "q":
          break;
      }
    }
  return composeQuery(where);
}
```
## `routers/salesProduction.routes.ts`
```typescript
  getSalesProductions: publicProcedure.input(getSalesProductionsSchema)
  .query(async (props) => {
    return getSalesProductions(props.ctx,props.input)
  }), 
```
## `db/queries/filters.ts`
```typescript
export async function salesProductionFilters(ctx: TRPCContext) {
  type T = keyof GetSalesProductionsSchema;
  type FilterData = PageFilterData<T>;
  // const steps = labelValueOptions(
  //   await ctx.db.OrderItemProductionAssignments.findMany({
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
## `trpc/routers/filters.route.ts`
```typescript
salesProduction: publicProcedure.query(async (props) => {
     return salesProductionFilters(props.ctx)
  })
```
## `hooks/use-salesProduction-filter-params.ts`
```typescript
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["sales"]['getSalesProductions'], void>;

export const salesProductionFilterParams = {
    q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useSalesProductionFilterParams() {
    const [filters, setFilters] = useQueryStates(salesProductionFilterParams);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadSalesProductionFilterParams = createLoader(
    salesProductionFilterParams,
);
```
## `hooks/use-salesProduction-params.ts`
```typescript
import { parseAsBoolean, parseAsString, useQueryStates,parseAsInteger } from "nuqs";
 
export function useSalesProductionParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      openSalesProductionId: parseAsInteger
    },
    options
  );
  const opened = !!params.openSalesProductionId
  return {
    ...params,
    setParams,opened
  };
}
```
## `components/open-salesProduction-sheet`
```typescript
import { useSalesProductionParams } from "@/hooks/use-salesProduction-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenSalesProductionSheet() {
  const { setParams } = useSalesProductionParams();

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
## `components/salesProduction-header.tsx`
```typescript
"use client";
import { SearchFilter } from "@gnd/ui/custom/search-filter/index"; 
import { OpenSalesProductionSheet } from "./open-salesProduction-sheet";
import { salesProductionFilterParams } from "@/hooks/use-salesProduction-filter-params";
import { useTRPC } from "@/trpc/client";

export function SalesProductionHeader({}) {
  const trpc = useTRPC();
    return (
        <div className="flex justify-between">
            
             <SearchFilter
        filterSchema={salesProductionFilterParams}
        placeholder="Search SalesProductions..."
        trpcRoute={trpc.filters.salesProduction}
      />
            <div className="flex-1"></div>
            <OpenSalesProductionSheet/>
        </div>
    );
}
```
## `components/tables/salesProduction/columns.tsx`
```typescript
import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Menu } from "@gnd/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@gnd/ui/cn";
import { useSalesProductionParams } from "@/hooks/use-salesProduction-params";

export type Item = RouterOutputs["sales"]["getSalesProductions"]["data"][number];
interface ItemProps {
  item: Item;
}
type Column = ColumnDef<Item>;
const column1: Column = {
  header: "header",
  accessorKey: "header",
  meta: {},
  cell: ({ row: { original: item } }) => <></>,
};

export const columns: Column[] = [
  column1,
  {
    header: "",
    accessorKey: "action",
    meta: {
      actionCell: true,
      preventDefault: true,
      className: "w-[100px]",
    },
    cell: ({ row: { original: item } }) => (
      <>
        <Actions item={item} />
      </>
    ),
  },
];

function Actions({ item }: ItemProps) {
  const isMobile = useIsMobile();
  return (
    <div className="relative flex justify-end z-10">
      <Menu
        triggerSize={isMobile ? "default" : "xs"}
        Trigger={
          <Button className={cn(isMobile || "size-4 p-0")} variant="ghost">
            <Icons.MoreHoriz className="" />
          </Button>
        }
      >
        <Menu.Item SubMenu={<></>}>Mark as</Menu.Item>
      </Menu>
    </div>
  );
}
export const mobileColumn: ColumnDef<Item>[] = [
  {
    header: "",
    accessorKey: "row",
    meta: {
      className: "flex-1 p-0",
      // preventDefault: true,
    },
    cell: ({ row: { original: item } }) => {
      return <ItemCard item={item} />;
    },
  },
];
function ItemCard({ item }: ItemProps) {
  // design a mobile version of the columns here
  const { setParams } = useSalesProductionParams();
  return <></>;
}
```
## `components/tables/salesProduction/data-table.tsx`
```typescript
"use client";

import { useTRPC } from "@/trpc/client";
import { TableProvider,Table, useTableData } from "@gnd/ui/data-table";
import { columns, mobileColumn } from "./columns"; 
import { TableHeader } from "@gnd/ui/data-table/table-header"; 
import { useSalesProductionFilterParams } from "@/hooks/use-salesProduction-filter-params";
import { useSalesProductionParams } from "@/hooks/use-salesProduction-params";
import { LoadMoreTRPC } from "@gnd/ui/data-table/load-more";

export function DataTable() {
  const trpc = useTRPC();
  // const { rowSelection, setRowSelection } = useSalesProductionStore();
  const { filters } = useSalesProductionFilterParams();
  const { data, ref, hasNextPage } = useTableData({
    filter: filters,
    route: trpc.sales.getSalesProductions,
  });
  // const tableScroll = useTableScroll({
  //     useColumnWidths: true,
  //     startFromColumn: 2,
  // });
  const { setParams } = useSalesProductionParams();
  return (
    <TableProvider
      args={[
        {
          columns,
          mobileColumn,
          data,
          props: {
            loadMoreRef:ref,
            hasNextPage,
          },
          // tableScroll,
          // rowSelection,
          // setRowSelection,
          tableMeta: {
            // rowClick(id, rowData) {
            //   //   overviewQuery.open2(rowData.uuid, "sales");
            //   setParams({
            //     //
            //   });
            // },
          },
        },
      ]}
    >
      <div className="flex flex-col gap-4 w-full">
        <div
          // ref={tableScroll.containerRef}
          className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide"
        >
          <Table>
            <TableHeader />
            <Table.Body>
              <Table.Row />
            </Table.Body>
          </Table>
        </div>
             {hasNextPage && <Table.LoadMore />}
        {/* <BatchActions /> */}
      </div>
    </TableProvider>
  );
}
```
## `salesProduction/page.tsx`
```typescript
import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton"; 
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { DataTable } from "@/components/tables/salesProduction/data-table";
import { SalesProductionHeader } from "@/components/salesProduction-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadSalesProductionFilterParams } from "@/hooks/use-salesProduction-filter-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "SalesProduction | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props:Props) {
    const searchParams = await props.searchParams;
    const filter = loadSalesProductionFilterParams(searchParams);
    batchPrefetch([
        trpc.sales.getSalesProductions.infiniteQueryOptions({
            ...filter,
        }),
    ]);
    return (
        <div className="flex flex-col gap-6">
        <PageTitle>SalesProduction</PageTitle>
            <SalesProductionHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<TableSkeleton />}>
                    <DataTable />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
```
## `salesProduction-form-queries`
```typescript

  export const salesProductionFormSchema = z
  .object({
     param: z.string()
  });
export type SalesProductionFormSchema = z.infer<typeof salesProductionFormSchema>;

export async function saveSalesProduction(
  ctx: TRPCContext,
  query: SalesProductionFormSchema
) {
  const {db} = ctx;
  
}
  export const getSalesProductionFormSchema = z
  .object({
     
  });
export type GetSalesProductionFormSchema = z.infer<typeof salesProductionFormSchema>;
export async function getSalesProductionForm(
  ctx: TRPCContext,
  query: GetSalesProductionFormSchema
) {
  const {db} = ctx;
  
}
```
## `salesProduction-form-trpc-routes`
```typescript
  import {saveSalesProduction,salesProductionFormSchema,getSalesProductionForm,getSalesProductionFormSchema} from "@api/db/queries/route";

  saveSalesProduction: publicProcedure
    .input(salesProductionFormSchema)
    .mutation(async (props) => {
      return saveSalesProduction(props.ctx, props.input);
    }),
  getSalesProductionForm: publicProcedure
    .input(getSalesProductionFormSchema)
    .mutation(async (props) => {
      return getSalesProductionForm(props.ctx, props.input);
    }),

```
## `components/forms/salesProduction-form`
```typescript
import { Form } from "@gnd/ui/form";
import { SubmitButton } from "@/components/submit-button";

interface Props  {
  defaultValues: typeof salesProductionFormSchema.type
}
export function SalesProductionForm({
  defaultValues = {}
}: Props) {
  const form = useZodForm(salesProductionFormSchema), {
    defaultValues: {
      ...defaultValues
    }
  })
  const trpc = useTRPC();
  const qc = useQueryClient();
  const {isPending,mutate} = useMutation(
    trpc.sales.saveSalesProduction.mutationOptions({
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
          queryKey: trpc.sales.getSalesProductions.queryKey()
        })
      },
    })
  )
  const onSubmit = (data: typeof salesProductionFormSchema.type) => {
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