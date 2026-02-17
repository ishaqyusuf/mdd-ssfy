# data-page
# data-page
## `db/queries/community.ts` page-query-fn
```typescript
export const getBuildersSchema = z
  .object({
    
  })
  .extend(paginationSchema.shape);
export type GetBuildersSchema = z.infer<typeof getBuildersSchema>;

export async function getBuilders(
  ctx: TRPCContext,
  query: GetBuildersSchema
) {
  const {db} = ctx;
  const model = db.builders
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereBuilders(query),
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
function whereBuilders(query: GetBuildersSchema) {
  const where: Prisma.BuildersWhereInput[] = [
     
  ];
    for (const [k, v] of Object.entries(query)) {
      if (!v) continue;
      const value = v as any;
      switch (k as keyof GetBuildersSchema) {
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
## `routers/community.routes.ts`
```typescript
  getBuilders: publicProcedure.input(getBuildersSchema)
  .query(async (props) => {
    return getBuilders(props.ctx,props.input)
  }), 
```
## `db/queries/filters.ts`
```typescript
export async function builderFilters(ctx: TRPCContext) {
  type T = keyof GetBuildersSchema;
  type FilterData = PageFilterData<T>;
  // const steps = labelValueOptions(
  //   await ctx.db.Builders.findMany({
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
builder: publicProcedure.query(async (props) => {
     return builderFilters(props.ctx)
  })
```
## `hooks/use-builder-filter-params.ts`
```typescript
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["community"]['getBuilders'], void>;

export const builderFilterParams = {
    q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useBuilderFilterParams() {
    const [filters, setFilters] = useQueryStates(builderFilterParams);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadBuilderFilterParams = createLoader(
    builderFilterParams,
);
```
## `hooks/use-builder-params.ts`
```typescript
import { parseAsBoolean, parseAsString, useQueryStates,parseAsInteger } from "nuqs";
 
export function useBuilderParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      openBuilderId: parseAsInteger
    },
    options
  );
  const opened = !!params.openBuilderId
  return {
    ...params,
    setParams,opened
  };
}
```
## `components/open-builder-modal`
```typescript
import { useBuilderParams } from "@/hooks/use-builder-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenBuilderModal() {
  const { setParams } = useBuilderParams();

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
## `components/builder-header.tsx`
```typescript
"use client";
import { SearchFilter } from "@gnd/ui/search-filter"; 
import { OpenBuilderModal } from "./open-builder-modal";
import { builderFilterParams } from "@/hooks/use-builder-filter-params";
import { _trpc } from "@/components/static-trpc";
import { useQueryStates } from "nuqs";

export function BuilderHeader({}) {
   
    const [filters, setFilters] = useQueryStates(builderFilterParams);
    return (
        <div className="flex justify-between">
            
             <SearchFilter
        filterSchema={builderFilterParams}
        placeholder="Search Builders..."
        trpcRoute={_trpc.filters.builder}
         {...{ filters, setFilters }}
      />
            <div className="flex-1"></div>
            <OpenBuilderModal/>
        </div>
    );
}
```
## `components/tables/builder/columns.tsx`
```typescript
import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Menu } from "@gnd/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { cells } from "@gnd/ui/custom/data-table/cells";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@gnd/ui/cn";
import { useBuilderParams } from "@/hooks/use-builder-params";

export type Item = RouterOutputs["community"]["getBuilders"]["data"][number];
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
  cells.selectColumn,
  column1,
  {
    header: "",
    accessorKey: "action",
    meta: {
      actionCell: true,
      preventDefault: true,
      className: "w-[100px] dt-action-cell",
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
  const { setParams } = useBuilderParams();
  return <></>;
}
```
## `components/tables/builder/data-table.tsx`
```typescript
"use client";

import { _trpc } from "@/components/static-trpc";
import { createTableContext,Table, useTableData } from "@gnd/ui/data-table";
import { columns, mobileColumn } from "./columns";  
import { useBuilderFilterParams } from "@/hooks/use-builder-filter-params";
import { useBuilderParams } from "@/hooks/use-builder-params";
import { NoResults } from "@gnd/ui/custom/no-results";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { Icons } from "@gnd/ui/icons";
import { GetBuildersSchema } from "@api/db/queries/community";
interface Props {
  defaultFilters?: GetBuildersSchema;
}
export function DataTable(props: Props) {
  
  // const { rowSelection, setRowSelection } = useBuilderStore();
  const { filters,hasFilters,setFilters } = useBuilderFilterParams();
  const { data, ref: loadMoreRef, hasNextPage, isFetching } = useTableData({
    filter: {
      ...filters,
      ...(props.defaultFilters || {}),
    },
    route: _trpc.community.getBuilders,
  });
  const tableScroll = useTableScroll({
      useColumnWidths: true,
      startFromColumn: 2,
  });
  const { setParams } = useBuilderParams();
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
                    // mobileColumn,
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
                                openBuilderId: rowData.id,
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
## `builder/page.tsx`
```typescript
import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton"; 
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { DataTable } from "@/components/tables/builder/data-table";
import { BuilderHeader } from "@/components/builder-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadBuilderFilterParams } from "@/hooks/use-builder-filter-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Builder | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props:Props) {
    const searchParams = await props.searchParams;
    const filter = loadBuilderFilterParams(searchParams);
    batchPrefetch([
        trpc.community.getBuilders.infiniteQueryOptions({
            ...filter,
        }),
    ]);
    return (
        <div className="flex flex-col gap-6 pt-6">
        <PageTitle>Builder</PageTitle>
            <BuilderHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<TableSkeleton />}>
                    <DataTable />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
```

## `community-form-queries`
```typescript

  export const builderFormSchema = z
  .object({
     param: z.string()
  });
export type BuilderFormSchema = z.infer<typeof builderFormSchema>;

export async function saveBuilder(
  ctx: TRPCContext,
  query: BuilderFormSchema
) {
  const {db} = ctx;
  
}
  export const getBuilderFormSchema = z
  .object({
     
  });
export type GetBuilderFormSchema = z.infer<typeof builderFormSchema>;
export async function getBuilderForm(
  ctx: TRPCContext,
  query: GetBuilderFormSchema
) {
  const {db} = ctx;
  
}
```
## `community-form-trpc-routes`
```typescript
  import {saveBuilder,builderFormSchema,getBuilderForm,getBuilderFormSchema} from "@api/db/queries/route";

  saveBuilder: publicProcedure
    .input(builderFormSchema)
    .mutation(async (props) => {
      return saveBuilder(props.ctx, props.input);
    }),
  getBuilderForm: publicProcedure
    .input(getBuilderFormSchema)
    .mutation(async (props) => {
      return getBuilderForm(props.ctx, props.input);
    }),

```
## `components/forms/community-form`
```typescript
import { Form } from "@gnd/ui/form";
import { SubmitButton } from "@/components/submit-button";
import { _trpc,_qc } from "@/components/static-trpc"; 
interface Props  {
  defaultValues: typeof builderFormSchema.type
}
export function BuilderForm({
  defaultValues = {}
}: Props) {
  const form = useZodForm(builderFormSchema), {
    defaultValues: {
      ...defaultValues
    }
  }); 
  const {isPending,mutate} = useMutation(
    _trpc.community.saveBuilder.mutationOptions({
      meta: {
              toastTitle: {
                error: "Something went wrong",
                loading: "Saving...",
                success: "Success",
              },
            },
      onSuccess() {
        form.reset();
        _qc.invalidateQueriest({
          queryKey: trpc.community.getBuilders.queryKey()
        })
      },
    })
  )
  const onSubmit = (data: typeof builderFormSchema.type) => {
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