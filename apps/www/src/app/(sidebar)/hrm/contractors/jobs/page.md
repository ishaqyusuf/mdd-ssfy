# data-page
## `db/queries/contractor-jobs.ts` page-query-fn
```typescript
export const getJobsSchema = z
  .object({
      
  })
  .extend(paginationSchema.shape);
export type GetJobsSchema = z.infer<typeof getJobsSchema>;

export async function getJobs(
  ctx: TRPCContext,
  query: GetJobsSchema
) {
  const {db} = ctx;
  const model = db.jobs
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereJobs(query),
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
function whereJobs(query: GetJobsSchema) {
  const where: Prisma.JobsWhereInput[] = [
     
  ];
    for (const [k, v] of Object.entries(query)) {
      if (!v) continue;
      const value = v as any;
      switch (k as keyof GetJobsSchema) {
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
## `routers/contractor-jobs.routes.ts`
```typescript
  getJobs: publicProcedure.input(getJobsSchema)
  .query(async (props) => {
    return getJobs(props.ctx,props.input)
  }), 
```
## `db/queries/filters.ts`
```typescript
export async function jobFilters(ctx: TRPCContext) {
  type T = keyof GetJobsSchema;
  type FilterData = PageFilterData<T>;
  // const steps = labelValueOptions(
  //   await ctx.db.Jobs.findMany({
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
job: publicProcedure.query(async (props) => {
     return jobFilters(props.ctx)
  })
```
## `hooks/use-contractor-jobs-filter-params.ts`
```typescript
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["hrm"]['getJobs'], void>;

export const jobFilterParams = {
    q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useJobFilterParams() {
    const [filters, setFilters] = useQueryStates(jobFilterParams);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadJobFilterParams = createLoader(
    jobFilterParams,
);
```
## `hooks/use-contractor-jobs-params.ts`
```typescript
import { parseAsBoolean, parseAsString, useQueryStates,parseAsInteger } from "nuqs";
 
export function useJobParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      openJobId: parseAsInteger
    },
    options
  );
  const opened = !!params.openJobId
  return {
    ...params,
    setParams,opened
  };
}
```
## `components/open-contractor-jobs-sheet`
```typescript
import { useJobParams } from "@/hooks/use-contractor-jobs-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenJobSheet() {
  const { setParams } = useJobParams();

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
## `components/contractor-jobs-header.tsx`
```typescript
"use client";
import { SearchFilter } from "@gnd/ui/search-filter"; 
import { OpenJobSheet } from "./open-contractor-jobs-sheet";
import { jobFilterParams } from "@/hooks/use-contractor-jobs-filter-params";
import { _trpc } from "@/components/static-trpc";
import { useQueryStates } from "nuqs";

export function JobHeader({}) {
   
    const [filters, setFilters] = useQueryStates(jobFilterParams);
    return (
        <div className="flex justify-between">
            
             <SearchFilter
        filterSchema={jobFilterParams}
        placeholder="Search Jobs..."
        trpcRoute={_trpc.filters.job}
         {...{ filters, setFilters }}
      />
            <div className="flex-1"></div>
            <OpenJobSheet/>
        </div>
    );
}
```
## `components/tables/contractor-jobs/columns.tsx`
```typescript
import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Menu } from "@gnd/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { cells } from "@gnd/ui/custom/data-table/cells";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@gnd/ui/cn";
import { useJobParams } from "@/hooks/use-contractor-jobs-params";

export type Item = RouterOutputs["hrm"]["getJobs"]["data"][number];
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
  const { setParams } = useJobParams();
  return <></>;
}
```
## `components/tables/contractor-jobs/data-table.tsx`
```typescript
"use client";

import { _trpc } from "@/components/static-trpc";
import { createTableContext,Table, useTableData } from "@gnd/ui/data-table";
import { columns, mobileColumn } from "./columns";  
import { useJobFilterParams } from "@/hooks/use-contractor-jobs-filter-params";
import { useJobParams } from "@/hooks/use-contractor-jobs-params";
import { NoResults } from "@gnd/ui/custom/no-results";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { Icons } from "@gnd/ui/icons";
import { GetJobsSchema } from "@api/db/queries/contractor-jobs";
interface Props {
  defaultFilters?: GetJobsSchema;
}
export function DataTable(props: Props) {
  
  // const { rowSelection, setRowSelection } = useJobStore();
  const { filters,hasFilters,setFilters } = useJobFilterParams();
  const { data, ref: loadMoreRef, hasNextPage, isFetching } = useTableData({
    filter: {
      ...filters,
      ...(props.defaultFilters || {}),
    },
    route: _trpc.hrm.getJobs,
  });
  const tableScroll = useTableScroll({
      useColumnWidths: true,
      startFromColumn: 2,
  });
  const { setParams } = useJobParams();
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
                                openJobId: rowData.id,
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
## `job/page.tsx`
```typescript
import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton"; 
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { DataTable } from "@/components/tables/contractor-jobs/data-table";
import { JobHeader } from "@/components/contractor-jobs-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadJobFilterParams } from "@/hooks/use-contractor-jobs-filter-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Job | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props:Props) {
    const searchParams = await props.searchParams;
    const filter = loadJobFilterParams(searchParams);
    batchPrefetch([
        trpc.hrm.getJobs.infiniteQueryOptions({
            ...filter,
        }),
    ]);
    return (
        <div className="flex flex-col gap-6 pt-6">
        <PageTitle>Job</PageTitle>
            <JobHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<TableSkeleton />}>
                    <DataTable />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
```
## `contractor-jobs-form-queries`
```typescript

  export const jobFormSchema = z
  .object({
     param: z.string()
  });
export type JobFormSchema = z.infer<typeof jobFormSchema>;

export async function saveJob(
  ctx: TRPCContext,
  query: JobFormSchema
) {
  const {db} = ctx;
  
}
  export const getJobFormSchema = z
  .object({
     
  });
export type GetJobFormSchema = z.infer<typeof jobFormSchema>;
export async function getJobForm(
  ctx: TRPCContext,
  query: GetJobFormSchema
) {
  const {db} = ctx;
  
}
```
## `contractor-jobs-form-trpc-routes`
```typescript
  import {saveJob,jobFormSchema,getJobForm,getJobFormSchema} from "@api/db/queries/route";

  saveJob: publicProcedure
    .input(jobFormSchema)
    .mutation(async (props) => {
      return saveJob(props.ctx, props.input);
    }),
  getJobForm: publicProcedure
    .input(getJobFormSchema)
    .mutation(async (props) => {
      return getJobForm(props.ctx, props.input);
    }),

```
## `components/forms/contractor-jobs-form`
```typescript
import { Form } from "@gnd/ui/form";
import { SubmitButton } from "@/components/submit-button";
import { _trpc,_qc } from "@/components/static-trpc"; 
interface Props  {
  defaultValues: typeof jobFormSchema.type
}
export function JobForm({
  defaultValues = {}
}: Props) {
  const form = useZodForm(jobFormSchema), {
    defaultValues: {
      ...defaultValues
    }
  }); 
  const {isPending,mutate} = useMutation(
    _trpc.hrm.saveJob.mutationOptions({
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
          queryKey: trpc.hrm.getJobs.queryKey()
        })
      },
    })
  )
  const onSubmit = (data: typeof jobFormSchema.type) => {
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