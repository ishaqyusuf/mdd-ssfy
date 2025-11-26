# data-page 
## `db/queries/work-order.ts`
```typescript
export const getWorkOrdersSchema = z
  .object({
    
  })
  .merge(paginationSchema);
export type GetWorkOrdersSchema = z.infer<typeof getWorkOrdersSchema>;

export async function getWorkOrders(
  ctx: TRPCContext,
  query: GetWorkOrdersSchema
) {
  const {db} = ctx;
  const model = db.workOrders
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereWorkOrders(query),
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
function whereWorkOrders(query: GetWorkOrdersSchema) {
  const where: Prisma.WorkOrdersWhereInput[] = [
     
  ];
    for (const [k, v] of Object.entries(query)) {
      if (!v) continue;
      switch (k as keyof GetWorkOrdersSchema) {
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
## `routers/work-order.routes.ts`
```typescript
  getWorkOrders: publicProcedure.input(getWorkOrdersSchema)
  .query(async (props) => {
    return getWorkOrders(props.ctx,props.input)
  }), 
```
## `db/queries/filters.ts`
```typescript
export async function workOrderFilters(ctx: TRPCContext) {
  type T = keyof GetWorkOrdersSchema;
  type FilterData = PageFilterData<T>;
  // const steps = labelValueOptions(
  //   await ctx.db.WorkOrders.findMany({
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
workOrder: publicProcedure.query(async (props) => {
     return workOrderFilters(props.ctx)
  })
```
## `hooks/use-work-order-filter-params.ts`
```typescript
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["community"]['getWorkOrders'], void>;

export const workOrderFilterParams = {
    q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useWorkOrderFilterParams() {
    const [filters, setFilters] = useQueryStates(workOrderFilterParams);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadWorkOrderFilterParams = createLoader(
    workOrderFilterParams,
);
```
## `hooks/use-work-order-params.ts`
```typescript
import { parseAsBoolean, parseAsString, useQueryStates,parseAsInteger } from "nuqs";
 
export function useWorkOrderParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      openWorkOrderId: parseAsInteger
    },
    options
  );
  const opened = !!params.openWorkOrderId
  return {
    ...params,
    setParams,opened
  };
}
```
## `components/open-work-order-sheet`
```typescript
import { useWorkOrderParams } from "@/hooks/use-work-order-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenWorkOrderSheet() {
  const { setParams } = useWorkOrderParams();

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
## `components/work-order-header.tsx`
```typescript
"use client";
import { SearchFilter } from "@gnd/ui/custom/search-filter/index"; 
import { OpenWorkOrderSheet } from "./open-work-order-sheet";
import { workOrderFilterParams } from "@/hooks/use-work-order-filter-params";
import { useTRPC } from "@/trpc/client";

export function WorkOrderHeader({}) {
  const trpc = useTRPC();
    return (
        <div className="flex justify-between">
            
             <SearchFilter
        filterSchema={workOrderFilterParams}
        placeholder="Search WorkOrders..."
        trpcRoute={trpc.filters.workOrder}
      />
            <div className="flex-1"></div>
            <OpenWorkOrderSheet/>
        </div>
    );
}
```
## `components/tables/work-order/columns.tsx`
```typescript
import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Menu } from "@gnd/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@gnd/ui/cn";
import { useWorkOrderParams } from "@/hooks/use-work-order-params";

export type Item = RouterOutputs["community"]["getWorkOrders"]["data"][number];
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
  const { setParams } = useWorkOrderParams();
  return <></>;
}
```
## `components/tables/work-order/data-table.tsx`
```typescript
"use client";

import { useTRPC } from "@/trpc/client";
import { Table, useTableData } from "@gnd/ui/data-table";
import { columns, mobileColumn } from "./columns";  
import { useWorkOrderFilterParams } from "@/hooks/use-work-order-filter-params";
import { useWorkOrderParams } from "@/hooks/use-work-order-params";
import { NoResults } from "@gnd/ui/custom/no-results";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { Icons } from "@gnd/ui/custom/icons";
import { GetWorkOrdersSchema } from "@api/db/queries/work-order";
interface Props {
  defaultFilters?: GetWorkOrdersSchema;
}
export function DataTable(props: Props) {
  const trpc = useTRPC();
  // const { rowSelection, setRowSelection } = useWorkOrderStore();
  const { filters,hasFilters,setFilters } = useWorkOrderFilterParams();
  const { data, ref: loadMoreRef, hasNextPage, isFetching } = useTableData({
    filter: {
      ...filters,
      ...(props.defaultFilters || {}),
    },
    route: trpc.community.getWorkOrders,
  });
  const tableScroll = useTableScroll({
      useColumnWidths: true,
      startFromColumn: 2,
  });
  const { setParams } = useWorkOrderParams();
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
      args={[
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
                                openWorkOrderId: rowData.id,
                            });
                        },
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
## `workOrder/page.tsx`
```typescript
import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton"; 
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { DataTable } from "@/components/tables/work-order/data-table";
import { WorkOrderHeader } from "@/components/work-order-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadWorkOrderFilterParams } from "@/hooks/use-work-order-filter-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "WorkOrder | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props:Props) {
    const searchParams = await props.searchParams;
    const filter = loadWorkOrderFilterParams(searchParams);
    batchPrefetch([
        trpc.community.getWorkOrders.infiniteQueryOptions({
            ...filter,
        }),
    ]);
    return (
        <div className="flex flex-col gap-6">
        <PageTitle>WorkOrder</PageTitle>
            <WorkOrderHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<TableSkeleton />}>
                    <DataTable />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
```
## `work-order-form-queries`
```typescript

  export const workOrderFormSchema = z
  .object({
     param: z.string()
  });
export type WorkOrderFormSchema = z.infer<typeof workOrderFormSchema>;

export async function saveWorkOrder(
  ctx: TRPCContext,
  query: WorkOrderFormSchema
) {
  const {db} = ctx;
  
}
  export const getWorkOrderFormSchema = z
  .object({
     
  });
export type GetWorkOrderFormSchema = z.infer<typeof workOrderFormSchema>;
export async function getWorkOrderForm(
  ctx: TRPCContext,
  query: GetWorkOrderFormSchema
) {
  const {db} = ctx;
  
}
```
## `work-order-form-trpc-routes`
```typescript
  import {saveWorkOrder,workOrderFormSchema,getWorkOrderForm,getWorkOrderFormSchema} from "@api/db/queries/route";

  saveWorkOrder: publicProcedure
    .input(workOrderFormSchema)
    .mutation(async (props) => {
      return saveWorkOrder(props.ctx, props.input);
    }),
  getWorkOrderForm: publicProcedure
    .input(getWorkOrderFormSchema)
    .mutation(async (props) => {
      return getWorkOrderForm(props.ctx, props.input);
    }),

```
## `components/forms/work-order-form`
```typescript
import { Form } from "@gnd/ui/form";
import { SubmitButton } from "@/components/submit-button";

interface Props  {
  defaultValues: typeof workOrderFormSchema.type
}
export function WorkOrderForm({
  defaultValues = {}
}: Props) {
  const form = useZodForm(workOrderFormSchema), {
    defaultValues: {
      ...defaultValues
    }
  })
  const trpc = useTRPC();
  const qc = useQueryClient();
  const {isPending,mutate} = useMutation(
    trpc.community.saveWorkOrder.mutationOptions({
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
          queryKey: trpc.community.getWorkOrders.queryKey()
        })
      },
    })
  )
  const onSubmit = (data: typeof workOrderFormSchema.type) => {
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