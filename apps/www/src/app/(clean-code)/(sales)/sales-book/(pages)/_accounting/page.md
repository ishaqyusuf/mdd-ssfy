# data-page
# data-page
## `db/queries/sales-accounting.ts`
```typescript
export const getSalesAccountingsSchema = z
  .object({
    
  })
  .merge(paginationSchema);
export type GetSalesAccountingsSchema = z.infer<typeof getSalesAccountingsSchema>;

export async function getSalesAccountings(
  ctx: TRPCContext,
  query: GetSalesAccountingsSchema
) {
  const {db} = ctx;
  const model = db.customerTransaction
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereSalesAccountings(query),
    model
  );

  const data = await model.findMany({
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
function whereSalesAccountings(query: GetSalesAccountingsSchema) {
  const where: Prisma.CustomerTransactionWhereInput[] = [
     
  ];
    for (const [k, v] of Object.entries(query)) {
      if (!v) continue;
      switch (k as keyof GetSalesAccountingsSchema) {
        case "q":
          const q = {contains: v as string};
          where.push({
            OR: [
                
            ]
        })
          break;
      }
    }
  return composeQuery(where);
}
```
## `routers/sales-accounting.routes.ts`
```typescript
  getSalesAccountings: publicProcedure.input(getSalesAccountingsSchema)
  .query(async (props) => {
    return getSalesAccountings(props.ctx,props.input)
  }), 
```
## `db/queries/filters.ts`
```typescript
export async function salesAccountingFilters(ctx: TRPCContext) {
  type T = keyof GetSalesAccountingsSchema;
  type FilterData = PageFilterData<T>;
  // const steps = labelValueOptions(
  //   await ctx.db.CustomerTransaction.findMany({
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
salesAccounting: publicProcedure.query(async (props) => {
     return salesAccountingFilters(props.ctx)
  })
```
## `hooks/use-sales-accounting-filter-params.ts`
```typescript
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["sales"]['getSalesAccountings'], void>;

export const salesAccountingFilterParams = {
    q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useSalesAccountingFilterParams() {
    const [filters, setFilters] = useQueryStates(salesAccountingFilterParams);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadSalesAccountingFilterParams = createLoader(
    salesAccountingFilterParams,
);
```
## `hooks/use-sales-accounting-params.ts`
```typescript
import { parseAsBoolean, parseAsString, useQueryStates,parseAsInteger } from "nuqs";
 
export function useSalesAccountingParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      openSalesAccountingId: parseAsInteger
    },
    options
  );
  const opened = !!params.openSalesAccountingId
  return {
    ...params,
    setParams,opened
  };
}
```
## `components/open-sales-accounting-sheet`
```typescript
import { useSalesAccountingParams } from "@/hooks/use-sales-accounting-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenSalesAccountingSheet() {
  const { setParams } = useSalesAccountingParams();

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
## `components/sales-accounting-header.tsx`
```typescript
"use client";
import { SearchFilter } from "@gnd/ui/custom/search-filter/index"; 
import { OpenSalesAccountingSheet } from "./open-sales-accounting-sheet";
import { salesAccountingFilterParams } from "@/hooks/use-sales-accounting-filter-params";
import { useTRPC } from "@/trpc/client";

export function SalesAccountingHeader({}) {
  const trpc = useTRPC();
    return (
        <div className="flex justify-between">
            
             <SearchFilter
        filterSchema={salesAccountingFilterParams}
        placeholder="Search SalesAccountings..."
        trpcRoute={trpc.filters.salesAccounting}
      />
            <div className="flex-1"></div>
            <OpenSalesAccountingSheet/>
        </div>
    );
}
```
## `components/tables/sales-accounting/columns.tsx`
```typescript
import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Menu } from "@gnd/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@gnd/ui/cn";
import { useSalesAccountingParams } from "@/hooks/use-sales-accounting-params";

export type Item = RouterOutputs["sales"]["getSalesAccountings"]["data"][number];
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
  const { setParams } = useSalesAccountingParams();
  return <></>;
}
```
## `components/tables/sales-accounting/data-table.tsx`
```typescript
"use client";

import { useTRPC } from "@/trpc/client";
import { createTableContext,Table, useTableData } from "@gnd/ui/data-table";
import { columns, mobileColumn } from "./columns";  
import { useSalesAccountingFilterParams } from "@/hooks/use-sales-accounting-filter-params";
import { useSalesAccountingParams } from "@/hooks/use-sales-accounting-params";
import { NoResults } from "@gnd/ui/custom/no-results";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { Icons } from "@gnd/ui/custom/icons";
import { GetSalesAccountingsSchema } from "@api/db/queries/sales-accounting";
interface Props {
  defaultFilters?: GetSalesAccountingsSchema;
}
export function DataTable(props: Props) {
  const trpc = useTRPC();
  // const { rowSelection, setRowSelection } = useSalesAccountingStore();
  const { filters,hasFilters,setFilters } = useSalesAccountingFilterParams();
  const { data, ref: loadMoreRef, hasNextPage, isFetching } = useTableData({
    filter: {
      ...filters,
      ...(props.defaultFilters || {}),
    },
    route: trpc.sales.getSalesAccountings,
  });
  const tableScroll = useTableScroll({
      useColumnWidths: true,
      startFromColumn: 2,
  });
  const { setParams } = useSalesAccountingParams();
  if (hasFilters && !data?.length) {
    return <NoResults setFilter={setFilters} />;
  }

  if (!data?.length && !isFetching) {
    return <EmptyState CreateButton={
                      <Button asChild size="sm">
                          <Link href="/">
                              <Icons.add className="mr-2 size-4" />
                              <span>New</span>
                          </Link>
                      </Button>
                  } onCreate={e => {}} />;
  }
  return (
    <Table.Provider
      value={createTableContext(
        {
          columns,
          mobileColumn,
          data,
          props: {
            loadMoreRef,
            hasNextPage,
          },
          tableScroll,
          // rowSelection,
          // setRowSelection,
          tableMeta: {
                        rowClick(id, rowData) {
                            setParams({
                                openSalesAccountingId: rowData.id,
                            });
                        },
                    },
        })}
    >
      <div className="flex flex-col gap-4 w-full">
        <div
          // ref={tableScroll.containerRef}
          className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide"
        >
          <Table>
            <Table.TableHeader />
            <Table.Body>
              <Table.TableRow />
            </Table.Body>
          </Table>
        </div>
               <Table.LoadMore /> 
        {/* <BatchActions /> */}
      </div>
    </Table.Provider>
  );
}
```
## `salesAccounting/page.tsx`
```typescript
import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton"; 
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { DataTable } from "@/components/tables/sales-accounting/data-table";
import { SalesAccountingHeader } from "@/components/sales-accounting-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadSalesAccountingFilterParams } from "@/hooks/use-sales-accounting-filter-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "SalesAccounting | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props:Props) {
    const searchParams = await props.searchParams;
    const filter = loadSalesAccountingFilterParams(searchParams);
    batchPrefetch([
        trpc.sales.getSalesAccountings.infiniteQueryOptions({
            ...filter,
        }),
    ]);
    return (
        <div className="flex flex-col gap-6">
        <PageTitle>SalesAccounting</PageTitle>
            <SalesAccountingHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<TableSkeleton />}>
                    <DataTable />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
```
## `sales-accounting-form-queries`
```typescript

  export const salesAccountingFormSchema = z
  .object({
     param: z.string()
  });
export type SalesAccountingFormSchema = z.infer<typeof salesAccountingFormSchema>;

export async function saveSalesAccounting(
  ctx: TRPCContext,
  query: SalesAccountingFormSchema
) {
  const {db} = ctx;
  
}
  export const getSalesAccountingFormSchema = z
  .object({
     
  });
export type GetSalesAccountingFormSchema = z.infer<typeof salesAccountingFormSchema>;
export async function getSalesAccountingForm(
  ctx: TRPCContext,
  query: GetSalesAccountingFormSchema
) {
  const {db} = ctx;
  
}
```
## `sales-accounting-form-trpc-routes`
```typescript
  import {saveSalesAccounting,salesAccountingFormSchema,getSalesAccountingForm,getSalesAccountingFormSchema} from "@api/db/queries/route";

  saveSalesAccounting: publicProcedure
    .input(salesAccountingFormSchema)
    .mutation(async (props) => {
      return saveSalesAccounting(props.ctx, props.input);
    }),
  getSalesAccountingForm: publicProcedure
    .input(getSalesAccountingFormSchema)
    .mutation(async (props) => {
      return getSalesAccountingForm(props.ctx, props.input);
    }),

```
## `components/forms/sales-accounting-form`
```typescript
import { Form } from "@gnd/ui/form";
import { SubmitButton } from "@/components/submit-button";

interface Props  {
  defaultValues: typeof salesAccountingFormSchema.type
}
export function SalesAccountingForm({
  defaultValues = {}
}: Props) {
  const form = useZodForm(salesAccountingFormSchema), {
    defaultValues: {
      ...defaultValues
    }
  })
  const trpc = useTRPC();
  const qc = useQueryClient();
  const {isPending,mutate} = useMutation(
    trpc.sales.saveSalesAccounting.mutationOptions({
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
          queryKey: trpc.sales.getSalesAccountings.queryKey()
        })
      },
    })
  )
  const onSubmit = (data: typeof salesAccountingFormSchema.type) => {
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