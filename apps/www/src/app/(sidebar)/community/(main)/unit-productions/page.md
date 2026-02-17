# data-page
# data-page
## `db/queries/unit-productions.ts`
```typescript
export const getUnitProductionsSchema = z
  .object({
    
  })
  .merge(paginationSchema);
export type GetUnitProductionsSchema = z.infer<typeof getUnitProductionsSchema>;

export async function getUnitProductions(
  ctx: TRPCContext,
  query: GetUnitProductionsSchema
) {
  const {db} = ctx;
  const model = db.homeTasks
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereUnitProductions(query),
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
function whereUnitProductions(query: GetUnitProductionsSchema) {
  const where: Prisma.HomeTasksWhereInput[] = [
     
  ];
    for (const [k, v] of Object.entries(query)) {
      if (!v) continue;
      const value = v as any;
      switch (k as keyof GetUnitProductionsSchema) {
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
## `routers/unit-productions.routes.ts`
```typescript
  getUnitProductions: publicProcedure.input(getUnitProductionsSchema)
  .query(async (props) => {
    return getUnitProductions(props.ctx,props.input)
  }), 
```
## `db/queries/filters.ts`
```typescript
export async function unitProductionFilters(ctx: TRPCContext) {
  type T = keyof GetUnitProductionsSchema;
  type FilterData = PageFilterData<T>;
  // const steps = labelValueOptions(
  //   await ctx.db.HomeTasks.findMany({
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
unitProduction: publicProcedure.query(async (props) => {
     return unitProductionFilters(props.ctx)
  })
```
## `hooks/use-unit-productions-filter-params.ts`
```typescript
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["community"]['getUnitProductions'], void>;

export const unitProductionFilterParams = {
    q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useUnitProductionFilterParams() {
    const [filters, setFilters] = useQueryStates(unitProductionFilterParams);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadUnitProductionFilterParams = createLoader(
    unitProductionFilterParams,
);
```
## `hooks/use-unit-productions-params.ts`
```typescript
import { parseAsBoolean, parseAsString, useQueryStates,parseAsInteger } from "nuqs";
 
export function useUnitProductionParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      openUnitProductionId: parseAsInteger
    },
    options
  );
  const opened = !!params.openUnitProductionId
  return {
    ...params,
    setParams,opened
  };
}
```
## `components/open-unit-productions-sheet`
```typescript
import { useUnitProductionParams } from "@/hooks/use-unit-productions-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenUnitProductionSheet() {
  const { setParams } = useUnitProductionParams();

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
## `components/unit-productions-header.tsx`
```typescript
"use client";
import { SearchFilter } from "@gnd/ui/custom/search-filter/index"; 
import { OpenUnitProductionSheet } from "./open-unit-productions-sheet";
import { unitProductionFilterParams } from "@/hooks/use-unit-productions-filter-params";
import { useTRPC } from "@/trpc/client";

export function UnitProductionHeader({}) {
  const trpc = useTRPC();
    return (
        <div className="flex justify-between">
            
             <SearchFilter
        filterSchema={unitProductionFilterParams}
        placeholder="Search UnitProductions..."
        trpcRoute={trpc.filters.unitProduction}
      />
            <div className="flex-1"></div>
            <OpenUnitProductionSheet/>
        </div>
    );
}
```
## `components/tables/unit-productions/columns.tsx`
```typescript
import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Menu } from "@gnd/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@gnd/ui/cn";
import { useUnitProductionParams } from "@/hooks/use-unit-productions-params";

export type Item = RouterOutputs["community"]["getUnitProductions"]["data"][number];
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
  const { setParams } = useUnitProductionParams();
  return <></>;
}
```
## `components/tables/unit-productions/data-table.tsx`
```typescript
"use client";

import { useTRPC } from "@/trpc/client";
import { createTableContext,Table, useTableData } from "@gnd/ui/data-table";
import { columns, mobileColumn } from "./columns";  
import { useUnitProductionFilterParams } from "@/hooks/use-unit-productions-filter-params";
import { useUnitProductionParams } from "@/hooks/use-unit-productions-params";
import { NoResults } from "@gnd/ui/custom/no-results";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { Icons } from "@gnd/ui/icons";
import { GetUnitProductionsSchema } from "@api/db/queries/unit-productions";
interface Props {
  defaultFilters?: GetUnitProductionsSchema;
}
export function DataTable(props: Props) {
  const trpc = useTRPC();
  // const { rowSelection, setRowSelection } = useUnitProductionStore();
  const { filters,hasFilters,setFilters } = useUnitProductionFilterParams();
  const { data, ref: loadMoreRef, hasNextPage, isFetching } = useTableData({
    filter: {
      ...filters,
      ...(props.defaultFilters || {}),
    },
    route: trpc.community.getUnitProductions,
  });
  const tableScroll = useTableScroll({
      useColumnWidths: true,
      startFromColumn: 2,
  });
  const { setParams } = useUnitProductionParams();
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
                                openUnitProductionId: rowData.id,
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
## `unitProduction/page.tsx`
```typescript
import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton"; 
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { DataTable } from "@/components/tables/unit-productions/data-table";
import { UnitProductionHeader } from "@/components/unit-productions-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadUnitProductionFilterParams } from "@/hooks/use-unit-productions-filter-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "UnitProduction | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props:Props) {
    const searchParams = await props.searchParams;
    const filter = loadUnitProductionFilterParams(searchParams);
    batchPrefetch([
        trpc.community.getUnitProductions.infiniteQueryOptions({
            ...filter,
        }),
    ]);
    return (
        <div className="flex flex-col gap-6">
        <PageTitle>UnitProduction</PageTitle>
            <UnitProductionHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<TableSkeleton />}>
                    <DataTable />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
```
## `unit-productions-form-queries`
```typescript

  export const unitProductionFormSchema = z
  .object({
     param: z.string()
  });
export type UnitProductionFormSchema = z.infer<typeof unitProductionFormSchema>;

export async function saveUnitProduction(
  ctx: TRPCContext,
  query: UnitProductionFormSchema
) {
  const {db} = ctx;
  
}
  export const getUnitProductionFormSchema = z
  .object({
     
  });
export type GetUnitProductionFormSchema = z.infer<typeof unitProductionFormSchema>;
export async function getUnitProductionForm(
  ctx: TRPCContext,
  query: GetUnitProductionFormSchema
) {
  const {db} = ctx;
  
}
```
## `unit-productions-form-trpc-routes`
```typescript
  import {saveUnitProduction,unitProductionFormSchema,getUnitProductionForm,getUnitProductionFormSchema} from "@api/db/queries/route";

  saveUnitProduction: publicProcedure
    .input(unitProductionFormSchema)
    .mutation(async (props) => {
      return saveUnitProduction(props.ctx, props.input);
    }),
  getUnitProductionForm: publicProcedure
    .input(getUnitProductionFormSchema)
    .mutation(async (props) => {
      return getUnitProductionForm(props.ctx, props.input);
    }),

```
## `components/forms/unit-productions-form`
```typescript
import { Form } from "@gnd/ui/form";
import { SubmitButton } from "@/components/submit-button";

interface Props  {
  defaultValues: typeof unitProductionFormSchema.type
}
export function UnitProductionForm({
  defaultValues = {}
}: Props) {
  const form = useZodForm(unitProductionFormSchema), {
    defaultValues: {
      ...defaultValues
    }
  })
  const trpc = useTRPC();
  const qc = useQueryClient();
  const {isPending,mutate} = useMutation(
    trpc.community.saveUnitProduction.mutationOptions({
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
          queryKey: trpc.community.getUnitProductions.queryKey()
        })
      },
    })
  )
  const onSubmit = (data: typeof unitProductionFormSchema.type) => {
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