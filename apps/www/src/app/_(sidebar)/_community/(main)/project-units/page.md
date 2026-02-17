# data-page
# data-page
## `db/queries/project-units.ts`
```typescript
export const getProjectUnitsSchema = z
  .object({
    
  })
  .merge(paginationSchema);
export type GetProjectUnitsSchema = z.infer<typeof getProjectUnitsSchema>;

export async function getProjectUnits(
  ctx: TRPCContext,
  query: GetProjectUnitsSchema
) {
  const {db} = ctx;
  const model = db.homes
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereProjectUnits(query),
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
function whereProjectUnits(query: GetProjectUnitsSchema) {
  const where: Prisma.HomesWhereInput[] = [
     
  ];
    for (const [k, v] of Object.entries(query)) {
      if (!v) continue;
      switch (k as keyof GetProjectUnitsSchema) {
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
## `routers/project-units.routes.ts`
```typescript
  getProjectUnits: publicProcedure.input(getProjectUnitsSchema)
  .query(async (props) => {
    return getProjectUnits(props.ctx,props.input)
  }), 
```
## `db/queries/filters.ts`
```typescript
export async function projectUnitFilters(ctx: TRPCContext) {
  type T = keyof GetProjectUnitsSchema;
  type FilterData = PageFilterData<T>;
  // const steps = labelValueOptions(
  //   await ctx.db.Homes.findMany({
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
projectUnit: publicProcedure.query(async (props) => {
     return projectUnitFilters(props.ctx)
  })
```
## `hooks/use-project-units-filter-params.ts`
```typescript
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["community"]['getProjectUnits'], void>;

export const projectUnitFilterParams = {
    q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useProjectUnitFilterParams() {
    const [filters, setFilters] = useQueryStates(projectUnitFilterParams);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadProjectUnitFilterParams = createLoader(
    projectUnitFilterParams,
);
```
## `hooks/use-project-units-params.ts`
```typescript
import { parseAsBoolean, parseAsString, useQueryStates,parseAsInteger } from "nuqs";
 
export function useProjectUnitParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      openProjectUnitId: parseAsInteger
    },
    options
  );
  const opened = !!params.openProjectUnitId
  return {
    ...params,
    setParams,opened
  };
}
```
## `components/open-project-units-sheet`
```typescript
import { useProjectUnitParams } from "@/hooks/use-project-units-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenProjectUnitSheet() {
  const { setParams } = useProjectUnitParams();

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
## `components/project-units-header.tsx`
```typescript
"use client";
import { SearchFilter } from "@gnd/ui/custom/search-filter/index"; 
import { OpenProjectUnitSheet } from "./open-project-units-sheet";
import { projectUnitFilterParams } from "@/hooks/use-project-units-filter-params";
import { useTRPC } from "@/trpc/client";

export function ProjectUnitHeader({}) {
  const trpc = useTRPC();
    return (
        <div className="flex justify-between">
            
             <SearchFilter
        filterSchema={projectUnitFilterParams}
        placeholder="Search ProjectUnits..."
        trpcRoute={trpc.filters.projectUnit}
      />
            <div className="flex-1"></div>
            <OpenProjectUnitSheet/>
        </div>
    );
}
```
## `components/tables/project-units/columns.tsx`
```typescript
import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Menu } from "@gnd/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@gnd/ui/cn";
import { useProjectUnitParams } from "@/hooks/use-project-units-params";

export type Item = RouterOutputs["community"]["getProjectUnits"]["data"][number];
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
  const { setParams } = useProjectUnitParams();
  return <></>;
}
```
## `components/tables/project-units/data-table.tsx`
```typescript
"use client";

import { useTRPC } from "@/trpc/client";
import { createTableContext,Table, useTableData } from "@gnd/ui/data-table";
import { columns, mobileColumn } from "./columns";  
import { useProjectUnitFilterParams } from "@/hooks/use-project-units-filter-params";
import { useProjectUnitParams } from "@/hooks/use-project-units-params";
import { NoResults } from "@gnd/ui/custom/no-results";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { Icons } from "@gnd/ui/icons";
import { GetProjectUnitsSchema } from "@api/db/queries/project-units";
interface Props {
  defaultFilters?: GetProjectUnitsSchema;
}
export function DataTable(props: Props) {
  const trpc = useTRPC();
  // const { rowSelection, setRowSelection } = useProjectUnitStore();
  const { filters,hasFilters,setFilters } = useProjectUnitFilterParams();
  const { data, ref: loadMoreRef, hasNextPage, isFetching } = useTableData({
    filter: {
      ...filters,
      ...(props.defaultFilters || {}),
    },
    route: trpc.community.getProjectUnits,
  });
  const tableScroll = useTableScroll({
      useColumnWidths: true,
      startFromColumn: 2,
  });
  const { setParams } = useProjectUnitParams();
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
                                openProjectUnitId: rowData.id,
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
## `projectUnit/page.tsx`
```typescript
import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton"; 
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { DataTable } from "@/components/tables/project-units/data-table";
import { ProjectUnitHeader } from "@/components/project-units-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadProjectUnitFilterParams } from "@/hooks/use-project-units-filter-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "ProjectUnit | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props:Props) {
    const searchParams = await props.searchParams;
    const filter = loadProjectUnitFilterParams(searchParams);
    batchPrefetch([
        trpc.community.getProjectUnits.infiniteQueryOptions({
            ...filter,
        }),
    ]);
    return (
        <div className="flex flex-col gap-6">
        <PageTitle>ProjectUnit</PageTitle>
            <ProjectUnitHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<TableSkeleton />}>
                    <DataTable />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
```
## `project-units-form-queries`
```typescript

  export const projectUnitFormSchema = z
  .object({
     param: z.string()
  });
export type ProjectUnitFormSchema = z.infer<typeof projectUnitFormSchema>;

export async function saveProjectUnit(
  ctx: TRPCContext,
  query: ProjectUnitFormSchema
) {
  const {db} = ctx;
  
}
  export const getProjectUnitFormSchema = z
  .object({
     
  });
export type GetProjectUnitFormSchema = z.infer<typeof projectUnitFormSchema>;
export async function getProjectUnitForm(
  ctx: TRPCContext,
  query: GetProjectUnitFormSchema
) {
  const {db} = ctx;
  
}
```
## `project-units-form-trpc-routes`
```typescript
  import {saveProjectUnit,projectUnitFormSchema,getProjectUnitForm,getProjectUnitFormSchema} from "@api/db/queries/route";

  saveProjectUnit: publicProcedure
    .input(projectUnitFormSchema)
    .mutation(async (props) => {
      return saveProjectUnit(props.ctx, props.input);
    }),
  getProjectUnitForm: publicProcedure
    .input(getProjectUnitFormSchema)
    .mutation(async (props) => {
      return getProjectUnitForm(props.ctx, props.input);
    }),

```
## `components/forms/project-units-form`
```typescript
import { Form } from "@gnd/ui/form";
import { SubmitButton } from "@/components/submit-button";

interface Props  {
  defaultValues: typeof projectUnitFormSchema.type
}
export function ProjectUnitForm({
  defaultValues = {}
}: Props) {
  const form = useZodForm(projectUnitFormSchema), {
    defaultValues: {
      ...defaultValues
    }
  })
  const trpc = useTRPC();
  const qc = useQueryClient();
  const {isPending,mutate} = useMutation(
    trpc.community.saveProjectUnit.mutationOptions({
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
          queryKey: trpc.community.getProjectUnits.queryKey()
        })
      },
    })
  )
  const onSubmit = (data: typeof projectUnitFormSchema.type) => {
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