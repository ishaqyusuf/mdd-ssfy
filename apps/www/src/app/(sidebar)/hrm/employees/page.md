# data-page
# data-page
## `db/queries/hrm.ts` page-query-fn
```typescript
export const getEmployeesSchema = z
  .object({
    
  })
  .extend(paginationSchema.shape);
export type GetEmployeesSchema = z.infer<typeof getEmployeesSchema>;

export async function getEmployees(
  ctx: TRPCContext,
  query: GetEmployeesSchema
) {
  const {db} = ctx;
  const model = db.users
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereEmployees(query),
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
function whereEmployees(query: GetEmployeesSchema) {
  const where: Prisma.UsersWhereInput[] = [
     
  ];
    for (const [k, v] of Object.entries(query)) {
      if (!v) continue;
      const value = v as any;
      switch (k as keyof GetEmployeesSchema) {
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
## `routers/hrm.routes.ts`
```typescript
  getEmployees: publicProcedure.input(getEmployeesSchema)
  .query(async (props) => {
    return getEmployees(props.ctx,props.input)
  }), 
```
## `db/queries/filters.ts`
```typescript
export async function employeeFilters(ctx: TRPCContext) {
  type T = keyof GetEmployeesSchema;
  type FilterData = PageFilterData<T>;
  // const steps = labelValueOptions(
  //   await ctx.db.Users.findMany({
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
employee: publicProcedure.query(async (props) => {
     return employeeFilters(props.ctx)
  })
```
## `hooks/use-employee-filter-params.ts`
```typescript
import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["hrm"]['getEmployees'], void>;

export const employeeFilterParams = {
    q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useEmployeeFilterParams() {
    const [filters, setFilters] = useQueryStates(employeeFilterParams);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadEmployeeFilterParams = createLoader(
    employeeFilterParams,
);
```
## `hooks/use-employee-params.ts`
```typescript
import { parseAsBoolean, parseAsString, useQueryStates,parseAsInteger } from "nuqs";
 
export function useEmployeeParams(options?: { shallow: boolean }) {
  const [params, setParams] = useQueryStates(
    {
      openEmployeeId: parseAsInteger
    },
    options
  );
  const opened = !!params.openEmployeeId
  return {
    ...params,
    setParams,opened
  };
}
```
## `components/open-employee-sheet`
```typescript
import { useEmployeeParams } from "@/hooks/use-employee-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenEmployeeSheet() {
  const { setParams } = useEmployeeParams();

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
## `components/employee-header.tsx`
```typescript
"use client";
import { SearchFilter } from "@gnd/ui/search-filter"; 
import { OpenEmployeeSheet } from "./open-employee-sheet";
import { employeeFilterParams } from "@/hooks/use-employee-filter-params";
import { _trpc } from "@/components/static-trpc";
import { useQueryStates } from "nuqs";

export function EmployeeHeader({}) {
   
    const [filters, setFilters] = useQueryStates(employeeFilterParams);
    return (
        <div className="flex justify-between">
            
             <SearchFilter
        filterSchema={employeeFilterParams}
        placeholder="Search Employees..."
        trpcRoute={_trpc.filters.employee}
         {...{ filters, setFilters }}
      />
            <div className="flex-1"></div>
            <OpenEmployeeSheet/>
        </div>
    );
}
```
## `components/tables/hrm/columns.tsx`
```typescript
import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Menu } from "@gnd/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { cells } from "@gnd/ui/custom/data-table/cells";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@gnd/ui/cn";
import { useEmployeeParams } from "@/hooks/use-employee-params";

export type Item = RouterOutputs["hrm"]["getEmployees"]["data"][number];
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
  const { setParams } = useEmployeeParams();
  return <></>;
}
```
## `components/tables/hrm/data-table.tsx`
```typescript
"use client";

import { _trpc } from "@/components/static-trpc";
import { createTableContext,Table, useTableData } from "@gnd/ui/data-table";
import { columns, mobileColumn } from "./columns";  
import { useEmployeeFilterParams } from "@/hooks/use-employee-filter-params";
import { useEmployeeParams } from "@/hooks/use-employee-params";
import { NoResults } from "@gnd/ui/custom/no-results";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { Icons } from "@gnd/ui/custom/icons";
import { GetEmployeesSchema } from "@api/db/queries/hrm";
interface Props {
  defaultFilters?: GetEmployeesSchema;
}
export function DataTable(props: Props) {
  
  // const { rowSelection, setRowSelection } = useEmployeeStore();
  const { filters,hasFilters,setFilters } = useEmployeeFilterParams();
  const { data, ref: loadMoreRef, hasNextPage, isFetching } = useTableData({
    filter: {
      ...filters,
      ...(props.defaultFilters || {}),
    },
    route: _trpc.hrm.getEmployees,
  });
  const tableScroll = useTableScroll({
      useColumnWidths: true,
      startFromColumn: 2,
  });
  const { setParams } = useEmployeeParams();
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
                                openEmployeeId: rowData.id,
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
## `employee/page.tsx`
```typescript
import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton"; 
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { DataTable } from "@/components/tables/hrm/data-table";
import { EmployeeHeader } from "@/components/employee-header";
import { batchPrefetch, trpc } from "@/trpc/server";
import { loadEmployeeFilterParams } from "@/hooks/use-employee-filter-params";
import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Employee | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props:Props) {
    const searchParams = await props.searchParams;
    const filter = loadEmployeeFilterParams(searchParams);
    batchPrefetch([
        trpc.hrm.getEmployees.infiniteQueryOptions({
            ...filter,
        }),
    ]);
    return (
        <div className="flex flex-col gap-6 pt-6">
        <PageTitle>Employee</PageTitle>
            <EmployeeHeader />
            <ErrorBoundary errorComponent={ErrorFallback}>
                <Suspense fallback={<TableSkeleton />}>
                    <DataTable />
                </Suspense>
            </ErrorBoundary>
        </div>
    );
}
```
## `employee-form-queries`
```typescript

  export const employeeFormSchema = z
  .object({
     param: z.string()
  });
export type EmployeeFormSchema = z.infer<typeof employeeFormSchema>;

export async function saveEmployee(
  ctx: TRPCContext,
  query: EmployeeFormSchema
) {
  const {db} = ctx;
  
}
  export const getEmployeeFormSchema = z
  .object({
     
  });
export type GetEmployeeFormSchema = z.infer<typeof employeeFormSchema>;
export async function getEmployeeForm(
  ctx: TRPCContext,
  query: GetEmployeeFormSchema
) {
  const {db} = ctx;
  
}
```
## `employee-form-trpc-routes`
```typescript
  import {saveEmployee,employeeFormSchema,getEmployeeForm,getEmployeeFormSchema} from "@api/db/queries/route";

  saveEmployee: publicProcedure
    .input(employeeFormSchema)
    .mutation(async (props) => {
      return saveEmployee(props.ctx, props.input);
    }),
  getEmployeeForm: publicProcedure
    .input(getEmployeeFormSchema)
    .mutation(async (props) => {
      return getEmployeeForm(props.ctx, props.input);
    }),

```
## `components/forms/employee-form`
```typescript
import { Form } from "@gnd/ui/form";
import { SubmitButton } from "@/components/submit-button";
import { _trpc,_qc } from "@/components/static-trpc"; 
interface Props  {
  defaultValues: typeof employeeFormSchema.type
}
export function EmployeeForm({
  defaultValues = {}
}: Props) {
  const form = useZodForm(employeeFormSchema), {
    defaultValues: {
      ...defaultValues
    }
  }); 
  const {isPending,mutate} = useMutation(
    _trpc.hrm.saveEmployee.mutationOptions({
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
          queryKey: trpc.hrm.getEmployees.queryKey()
        })
      },
    })
  )
  const onSubmit = (data: typeof employeeFormSchema.type) => {
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