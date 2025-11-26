# data-page
# data-page
## `db/queries/community-template.ts`
```typescript
export const getCommunityTemplatesSchema = z
  .object({
    q: z.string().optional().nullable(),
  })
  .merge(paginationSchema);
export type GetCommunityTemplatesSchema = z.infer<typeof getCommunityTemplatesSchema>;

export async function getCommunityTemplates(
  ctx: TRPCContext,
  query: GetCommunityTemplatesSchema
) {
  const {db} = ctx;
  const model = db.communityModels
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereCommunityTemplates(query),
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
function whereCommunityTemplates(query: GetCommunityTemplatesSchema) {
  const where: Prisma.CommunityModelsWhereInput[] = [
     
  ];
    for (const [k, v] of Object.entries(query)) {
      if (!v) continue;
      switch (k as keyof GetCommunityTemplatesSchema) {
        case "q":
          break;
      }
    }
  return composeQuery(where);
}
```
## `routers/community-template.routes.ts`
```typescript
  getCommunityTemplates: publicProcedure.input(getCommunityTemplatesSchema)
  .query(async (props) => {
    return getCommunityTemplates(props.ctx,props.input)
  }), 
```
## `db/queries/filters.ts`
```typescript
export async function communityTemplateFilters(ctx: TRPCContext) {
  type T = keyof GetCommunityTemplatesSchema;
  type FilterData = PageFilterData<T>;
  // const steps = labelValueOptions(
  //   await ctx.db.CommunityModels.findMany({
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
communityTemplate: publicProcedure.query(async (props) => {
     return communityTemplateFilters(props.ctx)
  })
```
## `hooks/use-community-template-filter-params.ts`
```typescript
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["community"]['getCommunityTemplates'], void>;

export const communityTemplateFilterParams = {
    q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useCommunityTemplateFilterParams() {
    const [filters, setFilters] = useQueryStates(communityTemplateFilterParams);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadCommunityTemplateFilterParams = createLoader(
    communityTemplateFilterParams,
);
```
## `hooks/use-community-template-params.ts`
```typescript
import { parseAsBoolean, parseAsString, useQueryStates,parseAsInteger } from "nuqs";
 
export function useCommunityTemplateParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      openCommunityTemplateId: parseAsInteger
    },
    options
  );
  const opened = !!params.openCommunityTemplateId
  return {
    ...params,
    setParams,opened
  };
}
```
## `components/open-community-template-sheet`
```typescript
import { useCommunityTemplateParams } from "@/hooks/use-community-template-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenCommunityTemplateSheet() {
  const { setParams } = useCommunityTemplateParams();

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
## `components/community-template-header.tsx`
```typescript
"use client";
import { SearchFilter } from "@gnd/ui/custom/search-filter/index"; 
import { OpenCommunityTemplateSheet } from "./open-community-template-sheet";
import { communityTemplateFilterParams } from "@/hooks/use-community-template-filter-params";
import { useTRPC } from "@/trpc/client";

export function CommunityTemplateHeader({}) {
  const trpc = useTRPC();
    return (
        <div className="flex justify-between">
            
             <SearchFilter
        filterSchema={communityTemplateFilterParams}
        placeholder="Search CommunityTemplates..."
        trpcRoute={trpc.filters.communityTemplate}
      />
            <div className="flex-1"></div>
            <OpenCommunityTemplateSheet/>
        </div>
    );
}
```
## `components/tables/community-template/columns.tsx`
```typescript
import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Menu } from "@gnd/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@gnd/ui/cn";
import { useCommunityTemplateParams } from "@/hooks/use-community-template-params";

export type Item = RouterOutputs["community"]["getCommunityTemplates"]["data"][number];
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
  const { setParams } = useCommunityTemplateParams();
  return <></>;
}
```
## `components/tables/community-template/data-table.tsx`
```typescript
"use client";

import { useTRPC } from "@/trpc/client";
import { Table, useTableData } from "@gnd/ui/data-table";
import { columns, mobileColumn } from "./columns";  
import { useCommunityTemplateFilterParams } from "@/hooks/use-community-template-filter-params";
import { useCommunityTemplateParams } from "@/hooks/use-community-template-params";
import { NoResults } from "@gnd/ui/custom/no-results";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { Icons } from "@gnd/ui/custom/icons";
interface Props {
  defaultFilters?: GetCommunityTemplatessSchema;
}
export function DataTable(props: Props) {
  const trpc = useTRPC();
  // const { rowSelection, setRowSelection } = useCommunityTemplateStore();
  const { filters,hasFilters,setFilters } = useCommunityTemplateFilterParams();
  const { data, ref: loadMoreRef, hasNextPage, isFetching } = useTableData({
    filter: {
      ...filters,
      ...(props.defaultFilters || {}),
    },
    route: trpc.community.getCommunityTemplates,
  });
  const tableScroll = useTableScroll({
      useColumnWidths: true,
      startFromColumn: 2,
  });
  const { setParams } = useCommunityTemplateParams();
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
                                openCommunityTemplateId: rowData.id,
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
## `communityTemplate/page.tsx`
```typescript
import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton"; 
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { DataTable } from "@/components/tables/community-template/data-table";
import { CommunityTemplateHeader } from "@/components/community-template-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadCommunityTemplateFilterParams } from "@/hooks/use-community-template-filter-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "CommunityTemplate | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props:Props) {
    const searchParams = await props.searchParams;
    const filter = loadCommunityTemplateFilterParams(searchParams);
    batchPrefetch([
        trpc.community.getCommunityTemplates.infiniteQueryOptions({
            ...filter,
        }),
    ]);
    return (
        <div className="flex flex-col gap-6">
        <PageTitle>CommunityTemplate</PageTitle>
            <CommunityTemplateHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<TableSkeleton />}>
                    <DataTable />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
```
## `community-template-form-queries`
```typescript

  export const communityTemplateFormSchema = z
  .object({
     param: z.string()
  });
export type CommunityTemplateFormSchema = z.infer<typeof communityTemplateFormSchema>;

export async function saveCommunityTemplate(
  ctx: TRPCContext,
  query: CommunityTemplateFormSchema
) {
  const {db} = ctx;
  
}
  export const getCommunityTemplateFormSchema = z
  .object({
     
  });
export type GetCommunityTemplateFormSchema = z.infer<typeof communityTemplateFormSchema>;
export async function getCommunityTemplateForm(
  ctx: TRPCContext,
  query: GetCommunityTemplateFormSchema
) {
  const {db} = ctx;
  
}
```
## `community-template-form-trpc-routes`
```typescript
  import {saveCommunityTemplate,communityTemplateFormSchema,getCommunityTemplateForm,getCommunityTemplateFormSchema} from "@api/db/queries/route";

  saveCommunityTemplate: publicProcedure
    .input(communityTemplateFormSchema)
    .mutation(async (props) => {
      return saveCommunityTemplate(props.ctx, props.input);
    }),
  getCommunityTemplateForm: publicProcedure
    .input(getCommunityTemplateFormSchema)
    .mutation(async (props) => {
      return getCommunityTemplateForm(props.ctx, props.input);
    }),

```
## `components/forms/community-template-form`
```typescript
import { Form } from "@gnd/ui/form";
import { SubmitButton } from "@/components/submit-button";

interface Props  {
  defaultValues: typeof communityTemplateFormSchema.type
}
export function CommunityTemplateForm({
  defaultValues = {}
}: Props) {
  const form = useZodForm(communityTemplateFormSchema), {
    defaultValues: {
      ...defaultValues
    }
  })
  const trpc = useTRPC();
  const qc = useQueryClient();
  const {isPending,mutate} = useMutation(
    trpc.community.saveCommunityTemplate.mutationOptions({
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
          queryKey: trpc.community.getCommunityTemplates.queryKey()
        })
      },
    })
  )
  const onSubmit = (data: typeof communityTemplateFormSchema.type) => {
    mutate(data)
  }
  return <div>
    <Form {...form}>
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
        
        <SubmitButton isSubmitting={isPending}>Save</SubmitButton>
        <FormDebugBtn />
      </form>
    </Form>
  </div>****
}
```