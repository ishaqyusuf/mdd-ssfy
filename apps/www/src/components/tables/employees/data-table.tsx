"use client";

import { _trpc } from "@/components/static-trpc";
import { createTableContext, Table, useTableData } from "@gnd/ui/data-table";
import { columns, mobileColumn } from "./columns";
import { useEmployeeFilterParams } from "@/hooks/use-employee-filter-params";
import { useEmployeeParams } from "@/hooks/use-employee-params";
import { NoResults } from "@gnd/ui/custom/no-results";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { Icons } from "@gnd/ui/icons";
import { GetEmployeesSchema } from "@api/schemas/hrm";
import { useRouter } from "next/navigation";
interface Props {
    defaultFilters?: GetEmployeesSchema;
}
export function DataTable(props: Props) {
    // const { rowSelection, setRowSelection } = useEmployeeStore();
    const { filters, hasFilters, setFilters } = useEmployeeFilterParams();
    const {
        data,
        ref: loadMoreRef,
        hasNextPage,
        isFetching,
    } = useTableData({
        filter: {
            ...filters,
            ...(props.defaultFilters || {}),
        },
        route: _trpc.hrm.getEmployees,
    });
    const router = useRouter();
    const tableScroll = useTableScroll({
        useColumnWidths: true,
        startFromColumn: 2,
    });
    const { setParams } = useEmployeeParams();
    if (hasFilters && !data?.length) {
        return <NoResults setFilter={setFilters} />;
    }

    if (!data?.length && !isFetching) {
        return (
            <EmptyState
                CreateButton={
                    <Button asChild size="sm">
                        <Link href="/">
                            <Icons.Add className="mr-2 size-4" />
                            <span>New</span>
                        </Link>
                    </Button>
                }
                onCreate={(e) => {}}
            />
        );
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
                            router.push(`/hrm/employees/v2/${rowData.id}`);
                            // setParams({
                            //     employeeViewId: rowData.id,
                            // });
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

