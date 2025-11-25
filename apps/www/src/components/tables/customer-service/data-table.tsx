"use client";

import { useTRPC } from "@/trpc/client";
import { createTableContext, Table, useTableData } from "@gnd/ui/data-table";
import { columns } from "./columns";
import { useCustomerServiceFilterParams } from "@/hooks/use-customer-service-filter-params";
import { useCustomerServiceParams } from "@/hooks/use-customer-service-params";
import { NoResults } from "@gnd/ui/custom/no-results";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { Icons } from "@gnd/ui/custom/icons";
import { GetCustomerServicesSchema } from "@api/db/queries/customer-service";
import { useQuery } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";
interface Props {
    defaultFilters?: GetCustomerServicesSchema;
}
export function DataTable(props: Props) {
    const trpc = useTRPC();
    // const { rowSelection, setRowSelection } = useCustomerServiceStore();
    const { filters, hasFilters, setFilters } =
        useCustomerServiceFilterParams();
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
    const { data: employeesResp } = useQuery(
        _trpc.hrm.getEmployees.queryOptions({
            roles: ["Punchout"],
        })
    );
    if (!data?.length && !isFetching) {
        return (
            <EmptyState
                CreateButton={
                    <Button asChild size="sm">
                        <Link href="/">
                            <Icons.add className="mr-2 size-4" />
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
                    // mobileColumn,
                    data,
                    props: {
                        loadMoreRef,
                        hasNextPage,
                    },
                    tableScroll,
                    checkbox: true,
                    // rowSelection,
                    // setRowSelection,
                    tableMeta: {
                        extras: {
                            employees: employeesResp?.data,
                        },
                        rowClick(id, rowData) {
                            // setParams({
                            //     openCustomerServiceId: rowData.id,
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

