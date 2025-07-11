import { cn } from "@/lib/utils";
import { TablePageInfo } from "@/types/data-table";

import { type Table } from "@tanstack/react-table";

import { Button } from "@gnd/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from "lucide-react";

interface DataTablePaginationProps<TData> {
    table: Table<TData>;
    pageSizeOptions?: number[];
    pageInfo: TablePageInfo;
}

export function DataTablePagination<TData>({
    table,
    pageInfo,
    pageSizeOptions = [10, 20, 30, 40, 50],
}: DataTablePaginationProps<TData>) {
    const { pageCount, from = 0, to = 0, totalItems = 0, perPage } = pageInfo;
    return (
        <div className="flex w-full flex-col items-center   gap-4 overflow-auto px-2 py-1 sm:flex-row sm:gap-8">
            <div className="flex-1 whitespace-nowrap text-sm text-muted-foreground">
                {from}-{to} of {totalItems}
                {/* {table.getFilteredSelectedRowModel().rows.length} of{" "}
        {table.getFilteredRowModel().rows.length} row(s) selected. */}
            </div>
            <div className="flex-1"></div>
            <div
                className={cn(
                    " flex-col items-center gap-4  sm:gap-6 lg:gap-8",
                    (!perPage || perPage == 20) && pageCount == 1
                        ? "hidden"
                        : "flex sm:flex-row",
                )}
            >
                <div className="sflex hidden items-center space-x-2">
                    <p className="whitespace-nowrap text-sm font-medium">
                        Rows per page
                    </p>
                    <Select
                        value={`${table.getState().pagination.pageSize}`}
                        onValueChange={(value) => {
                            table.setPageSize(Number(value));
                        }}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue
                                placeholder={
                                    table.getState().pagination.pageSize
                                }
                            />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {pageSizeOptions.map((pageSize) => (
                                <SelectItem
                                    key={pageSize}
                                    value={`${pageSize}`}
                                >
                                    {pageSize}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    Page {table.getState().pagination.pageIndex + 1} of{" "}
                    {table.getPageCount()}
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        aria-label="Go to first page"
                        variant="outline"
                        size="icon"
                        className="hidden h-8 w-8 lg:flex"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                        aria-label="Go to previous page"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeftIcon
                            className="h-4 w-4"
                            aria-hidden="true"
                        />
                    </Button>
                    <Button
                        aria-label="Go to next page"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronRightIcon
                            className="h-4 w-4"
                            aria-hidden="true"
                        />
                    </Button>
                    <Button
                        aria-label="Go to last page"
                        variant="outline"
                        size="icon"
                        className="hidden h-8 w-8 lg:flex"
                        onClick={() =>
                            table.setPageIndex(table.getPageCount() - 1)
                        }
                        disabled={!table.getCanNextPage()}
                    >
                        <ArrowRightIcon
                            className="h-4 w-4"
                            aria-hidden="true"
                        />
                    </Button>
                </div>
            </div>
        </div>
    );
}
