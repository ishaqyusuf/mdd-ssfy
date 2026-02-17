# data-page
# data-page
## `db/queries/customer-service.ts`
```typescript
export const getCustomerServicesSchema = z
  .object({
    
  })
  .merge(paginationSchema);
export type GetCustomerServicesSchema = z.infer<typeof getCustomerServicesSchema>;

export async function getCustomerServices(
  ctx: TRPCContext,
  query: GetCustomerServicesSchema
) {
  const {db} = ctx;
  const model = db.workOrders
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereCustomerServices(query),
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
function whereCustomerServices(query: GetCustomerServicesSchema) {
  const where: Prisma.WorkOrdersWhereInput[] = [
     
  ];
    for (const [k, v] of Object.entries(query)) {
      if (!v) continue;
      const value = v as any;
      switch (k as keyof GetCustomerServicesSchema) {
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
## `routers/customer-service.routes.ts`
```typescript
  getCustomerServices: publicProcedure.input(getCustomerServicesSchema)
  .query(async (props) => {
    return getCustomerServices(props.ctx,props.input)
  }), 
```
## `db/queries/filters.ts`
```typescript
export async function customerServiceFilters(ctx: TRPCContext) {
  type T = keyof GetCustomerServicesSchema;
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
customerService: publicProcedure.query(async (props) => {
     return customerServiceFilters(props.ctx)
  })
```
## `hooks/use-customer-service-filter-params.ts`
```typescript
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["customerService"]['getCustomerServices'], void>;

export const customerServiceFilterParams = {
    q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useCustomerServiceFilterParams() {
    const [filters, setFilters] = useQueryStates(customerServiceFilterParams);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadCustomerServiceFilterParams = createLoader(
    customerServiceFilterParams,
);
```
## `hooks/use-customer-service-params.ts`
```typescript
import { parseAsBoolean, parseAsString, useQueryStates,parseAsInteger } from "nuqs";
 
export function useCustomerServiceParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      openCustomerServiceId: parseAsInteger
    },
    options
  );
  const opened = !!params.openCustomerServiceId
  return {
    ...params,
    setParams,opened
  };
}
```
## `components/open-customer-service-sheet`
```typescript
import { useCustomerServiceParams } from "@/hooks/use-customer-service-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenCustomerServiceSheet() {
  const { setParams } = useCustomerServiceParams();

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
## `components/customer-service-header.tsx`
```typescript
"use client";
import { SearchFilter } from "@gnd/ui/custom/search-filter/index"; 
import { OpenCustomerServiceSheet } from "./open-customer-service-sheet";
import { customerServiceFilterParams } from "@/hooks/use-customer-service-filter-params";
import { useTRPC } from "@/trpc/client";

export function CustomerServiceHeader({}) {
  const trpc = useTRPC();
    return (
        <div className="flex justify-between">
            
             <SearchFilter
        filterSchema={customerServiceFilterParams}
        placeholder="Search CustomerServices..."
        trpcRoute={trpc.filters.customerService}
      />
            <div className="flex-1"></div>
            <OpenCustomerServiceSheet/>
        </div>
    );
}
```
## `components/tables/customer-service/columns.tsx`
```typescript
import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Menu } from "@gnd/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@gnd/ui/cn";
import { useCustomerServiceParams } from "@/hooks/use-customer-service-params";

export type Item = RouterOutputs["customerService"]["getCustomerServices"]["data"][number];
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
  const { setParams } = useCustomerServiceParams();
  return <></>;
}
```
## `components/tables/customer-service/data-table.tsx`
```typescript
"use client";

import { useTRPC } from "@/trpc/client";
import { createTableContext,Table, useTableData } from "@gnd/ui/data-table";
import { columns, mobileColumn } from "./columns";  
import { useCustomerServiceFilterParams } from "@/hooks/use-customer-service-filter-params";
import { useCustomerServiceParams } from "@/hooks/use-customer-service-params";
import { NoResults } from "@gnd/ui/custom/no-results";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { Icons } from "@gnd/ui/icons";
import { GetCustomerServicesSchema } from "@api/db/queries/customer-service";
interface Props {
  defaultFilters?: GetCustomerServicesSchema;
}
export function DataTable(props: Props) {
  const trpc = useTRPC();
  // const { rowSelection, setRowSelection } = useCustomerServiceStore();
  const { filters,hasFilters,setFilters } = useCustomerServiceFilterParams();
  const { data, ref: loadMoreRef, hasNextPage, isFetching } = useTableData({
    filter: {
      ...filters,
      ...(props.defaultFilters || {}),
    },
    route: trpc.customerService.getCustomerServices,
  });
  const tableScroll = useTableScroll({
      useColumnWidths: true,
      startFromColumn: 2,
  });
  const { setParams } = useCustomerServiceParams();
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
    <Table.ContextProvider
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
                                openCustomerServiceId: rowData.id,
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
    </Table.ContextProvider>
  );
}
```
## `customerService/page.tsx`
```typescript
import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton"; 
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { DataTable } from "@/components/tables/customer-service/data-table";
import { CustomerServiceHeader } from "@/components/customer-service-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadCustomerServiceFilterParams } from "@/hooks/use-customer-service-filter-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "CustomerService | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props:Props) {
    const searchParams = await props.searchParams;
    const filter = loadCustomerServiceFilterParams(searchParams);
    batchPrefetch([
        trpc.customerService.getCustomerServices.infiniteQueryOptions({
            ...filter,
        }),
    ]);
    return (
        <div className="flex flex-col gap-6">
        <PageTitle>CustomerService</PageTitle>
            <CustomerServiceHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<TableSkeleton />}>
                    <DataTable />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
```
## `customer-service-form-queries`
```typescript

  export const customerServiceFormSchema = z
  .object({
     param: z.string()
  });
export type CustomerServiceFormSchema = z.infer<typeof customerServiceFormSchema>;

export async function saveCustomerService(
  ctx: TRPCContext,
  query: CustomerServiceFormSchema
) {
  const {db} = ctx;
  
}
  export const getCustomerServiceFormSchema = z
  .object({
     
  });
export type GetCustomerServiceFormSchema = z.infer<typeof customerServiceFormSchema>;
export async function getCustomerServiceForm(
  ctx: TRPCContext,
  query: GetCustomerServiceFormSchema
) {
  const {db} = ctx;
  
}
```
## `customer-service-form-trpc-routes`
```typescript
  import {saveCustomerService,customerServiceFormSchema,getCustomerServiceForm,getCustomerServiceFormSchema} from "@api/db/queries/route";

  saveCustomerService: publicProcedure
    .input(customerServiceFormSchema)
    .mutation(async (props) => {
      return saveCustomerService(props.ctx, props.input);
    }),
  getCustomerServiceForm: publicProcedure
    .input(getCustomerServiceFormSchema)
    .mutation(async (props) => {
      return getCustomerServiceForm(props.ctx, props.input);
    }),

```
## `components/forms/customer-service-form`
```typescript
import { Form } from "@gnd/ui/form";
import { SubmitButton } from "@/components/submit-button";

interface Props  {
  defaultValues: typeof customerServiceFormSchema.type
}
export function CustomerServiceForm({
  defaultValues = {}
}: Props) {
  const form = useZodForm(customerServiceFormSchema), {
    defaultValues: {
      ...defaultValues
    }
  })
  const trpc = useTRPC();
  const qc = useQueryClient();
  const {isPending,mutate} = useMutation(
    trpc.customerService.saveCustomerService.mutationOptions({
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
          queryKey: trpc.customerService.getCustomerServices.queryKey()
        })
      },
    })
  )
  const onSubmit = (data: typeof customerServiceFormSchema.type) => {
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