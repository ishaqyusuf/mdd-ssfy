# data-page
# data-page
## `db/queries/communityProjects.ts`
```typescript
export const getCommunityProjectsSchema = z
  .object({
    q: z.string().optional().nullable(),
  })
  .merge(paginationSchema);
export type GetCommunityProjectsSchema = z.infer<typeof getCommunityProjectsSchema>;

export async function getCommunityProjects(
  ctx: TRPCContext,
  query: GetCommunityProjectsSchema
) {
  const {db} = ctx;
  // const query = {};
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereCommunityProjects(query),
    db.projects
  );

  const data = await db.projects.findMany({
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
function whereCommunityProjects(query: GetCommunityProjectsSchema) {
  const where: Prisma.ProjectsWhereInput[] = [
     
  ];
    for (const [k, v] of Object.entries(query)) {
      if (!v) continue;
      switch (k as keyof GetCommunityProjectsSchema) {
        case "q":
          break;
      }
    }
  return composeQuery(where);
}
```
## `routers/communityProject.routes.ts`
```typescript
  getCommunityProjects: publicProcedure.input(getCommunityProjectsSchema)
  .query(async (props) => {
    return getCommunityProjects(props.ctx,props.input)
  }), 
```
## `db/queries/filters.ts`
```typescript
export async function communityProjectFilters(ctx: TRPCContext) {
  type T = keyof GetCommunityProjectsSchema;
  type FilterData = PageFilterData<T>;
  // const steps = labelValueOptions(
  //   await ctx.db.Projects.findMany({
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
communityProject: publicProcedure.query(async (props) => {
     return communityProjectFilters(props.ctx)
  })
```
## `hooks/use-communityProject-filter-params.ts`
```typescript
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["community"]['getCommunityProjects'], void>;

export const communityProjectFilterParams = {
    q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useCommunityProjectFilterParams() {
    const [filters, setFilters] = useQueryStates(communityProjectFilterParams);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadCommunityProjectFilterParams = createLoader(
    communityProjectFilterParams,
);
```
## `hooks/use-communityProject-params.ts`
```typescript
import { parseAsBoolean, parseAsString, useQueryStates,parseAsInteger } from "nuqs";
 
export function useCommunityProjectParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      openCommunityProjectId: parseAsInteger
    },
    options
  );
  const opened = !!params.openCommunityProjectId
  return {
    ...params,
    setParams,opened
  };
}
```
## `components/open-communityProject-sheet`
```typescript
import { useCommunityProjectParams } from "@/hooks/use-communityProject-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenCommunityProjectSheet() {
  const { setParams } = useCommunityProjectParams();

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
## `components/communityProject-header.tsx`
```typescript
"use client";
import { SearchFilter } from "@gnd/ui/custom/search-filter/index"; 
import { OpenCommunityProjectSheet } from "./open-communityProject-sheet";
import { communityProjectFilterParams } from "@/hooks/use-communityProject-filter-params";
import { useTRPC } from "@/trpc/client";

export function CommunityProjectHeader({}) {
  const trpc = useTRPC();
    return (
        <div className="flex justify-between">
            
             <SearchFilter
        filterSchema={communityProjectFilterParams}
        placeholder="Search CommunityProjects..."
        trpcRoute={trpc.filters.communityProject}
      />
            <div className="flex-1"></div>
            <OpenCommunityProjectSheet/>
        </div>
    );
}
```
## `components/tables/communityProject/columns.tsx`
```typescript
import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Menu } from "@gnd/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@gnd/ui/cn";
import { useCommunityProjectParams } from "@/hooks/use-communityProject-params";

export type Item = RouterOutputs["community"]["getCommunityProjects"]["data"][number];
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
  const { setParams } = useCommunityProjectParams();
  return <></>;
}
```
## `components/tables/communityProject/data-table.tsx`
```typescript
"use client";

import { useTRPC } from "@/trpc/client";
import { TableProvider,Table, useTableData } from "@gnd/ui/data-table";
import { columns, mobileColumn } from "./columns"; 
import { TableHeader } from "@gnd/ui/data-table/table-header"; 
import { useCommunityProjectFilterParams } from "@/hooks/use-communityProject-filter-params";
import { useCommunityProjectParams } from "@/hooks/use-communityProject-params";
import { LoadMoreTRPC } from "@gnd/ui/data-table/load-more";

export function DataTable() {
  const trpc = useTRPC();
  // const { rowSelection, setRowSelection } = useCommunityProjectStore();
  const { filters } = useCommunityProjectFilterParams();
  const { data, ref, hasNextPage } = useTableData({
    filter: filters,
    route: trpc.community.getCommunityProjects,
  });
  // const tableScroll = useTableScroll({
  //     useColumnWidths: true,
  //     startFromColumn: 2,
  // });
  const { setParams } = useCommunityProjectParams();
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
## `communityProject/page.tsx`
```typescript
import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton"; 
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { DataTable } from "@/components/tables/communityProject/data-table";
import { CommunityProjectHeader } from "@/components/communityProject-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadCommunityProjectFilterParams } from "@/hooks/use-communityProject-filter-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "CommunityProject | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props:Props) {
    const searchParams = await props.searchParams;
    const filter = loadCommunityProjectFilterParams(searchParams);
    batchPrefetch([
        trpc.community.getCommunityProjects.infiniteQueryOptions({
            ...filter,
        }),
    ]);
    return (
        <div className="flex flex-col gap-6">
        <PageTitle>CommunityProject</PageTitle>
            <CommunityProjectHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<TableSkeleton />}>
                    <DataTable />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
```
## `communityProject-form-queries`
```typescript

  export const communityProjectFormSchema = z
  .object({
     param: z.string()
  });
export type CommunityProjectFormSchema = z.infer<typeof communityProjectFormSchema>;

export async function saveCommunityProject(
  ctx: TRPCContext,
  query: CommunityProjectFormSchema
) {
  const {db} = ctx;
  
}
  export const getCommunityProjectFormSchema = z
  .object({
     
  });
export type GetCommunityProjectFormSchema = z.infer<typeof communityProjectFormSchema>;
export async function getCommunityProjectForm(
  ctx: TRPCContext,
  query: GetCommunityProjectFormSchema
) {
  const {db} = ctx;
  
}
```
## `communityProject-form-trpc-routes`
```typescript
  import {saveCommunityProject,communityProjectFormSchema,getCommunityProjectForm,getCommunityProjectFormSchema} from "@api/db/queries/route";

  saveCommunityProject: publicProcedure
    .input(communityProjectFormSchema)
    .mutation(async (props) => {
      return saveCommunityProject(props.ctx, props.input);
    }),
  getCommunityProjectForm: publicProcedure
    .input(getCommunityProjectFormSchema)
    .mutation(async (props) => {
      return getCommunityProjectForm(props.ctx, props.input);
    }),

```
## `components/forms/communityProject-form`
```typescript
import { Form } from "@gnd/ui/form";
import { SubmitButton } from "@/components/submit-button";

interface Props  {
  defaultValues: typeof communityProjectFormSchema.type
}
export function CommunityProjectForm({
  defaultValues = {}
}: Props) {
  const form = useZodForm(communityProjectFormSchema), {
    defaultValues: {
      ...defaultValues
    }
  })
  const trpc = useTRPC();
  const qc = useQueryClient();
  const {isPending,mutate} = useMutation(
    trpc.community.saveCommunityProject.mutationOptions({
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
          queryKey: trpc.community.getCommunityProjects.queryKey()
        })
      },
    })
  )
  const onSubmit = (data: typeof communityProjectFormSchema.type) => {
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