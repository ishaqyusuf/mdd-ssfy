"use client";

import * as React from "react";
import Link from "next/link";
import { DataTableViewOptions } from "@/components/common/data-table/data-table-view-options";
import { cn } from "@/lib/utils";
import type {
    DataTableFilterableColumn,
    DataTableSearchableColumn,
} from "@/types";
import { Cross2Icon, PlusCircledIcon, TrashIcon } from "@radix-ui/react-icons";
import type { Table } from "@tanstack/react-table";

import { Button, buttonVariants } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";

import { DataTableFacetedFilter } from "./data-table-faceted-filter";

interface DataTableToolbarProps<TData, TValue> {
    table: Table<TData>;
    filterableColumns?: DataTableFilterableColumn<TData, TValue>[];
    searchableColumns?: DataTableSearchableColumn<TData>[];
    newRowLink?: string;
    newRowAction?: any;
    BatchAction?;
    batchSelectCount?: number;
    deleteRowsAction?: React.MouseEventHandler<HTMLButtonElement>;
}

export function DataTableToolbar<TData, TValue>({
    table,
    filterableColumns = [],
    searchableColumns = [],
    newRowLink,
    newRowAction,
    deleteRowsAction,
    batchSelectCount = 0,
    BatchAction,
}: DataTableToolbarProps<TData, TValue>) {
    const isFiltered = table.getState().columnFilters.length > 0;
    const [isPending, startTransition] = React.useTransition();

    return (
        <div className="flex w-full items-center justify-between space-x-2 overflow-auto p-1">
            <div className="flex flex-1 items-center space-x-2">
                {searchableColumns.length > 0 &&
                    searchableColumns.map(
                        (column) =>
                            table.getColumn(
                                column.id ? String(column.id) : "",
                            ) && (
                                <Input
                                    key={String(column.id)}
                                    placeholder={`Filter ${column.title}...`}
                                    value={
                                        (table
                                            .getColumn(String(column.id))
                                            ?.getFilterValue() as string) ?? ""
                                    }
                                    onChange={(event) =>
                                        table
                                            .getColumn(String(column.id))
                                            ?.setFilterValue(event.target.value)
                                    }
                                    className="h-8 w-[150px] lg:w-[250px]"
                                />
                            ),
                    )}
                {/* {filterableColumns.length > 0 &&
                    filterableColumns.map(
                        (column) =>
                            table.getColumn(
                                column.id ? String(column.id) : ""
                            ) && (
                                <DataTableFacetedFilter
                                    key={String(column.id)}
                                    column={table.getColumn(
                                        column.id ? String(column.id) : ""
                                    )}
                                    title={column.title}
                                    options={column.options}
                                />
                            )
                    )} */}
                {filterableColumns.length > 0 &&
                    filterableColumns.map((column, id) => {
                        // iReact.isValidElement(column) ? <coluColumnmn key={id} /> :
                        if (typeof column === "function") {
                            let Column = column as any;
                            return <Column key={id} table={table} />;
                        }
                        const _column = table.getColumn(String(column?.id));
                        if (!_column || _column === undefined) return null;
                        // console.log(typeof column)
                        return (
                            <DataTableFacetedFilter
                                key={String(column.id)}
                                column={_column}
                                title={column.title}
                                single={column.single}
                                options={column.options}
                            />
                        );
                    })}
                {isFiltered && (
                    <Button
                        aria-label="Reset filters"
                        variant="ghost"
                        className="h-8 px-2 lg:px-3"
                        onClick={() => table.resetColumnFilters()}
                    >
                        Reset
                        <Cross2Icon
                            className="ml-2 h-4 w-4"
                            aria-hidden="true"
                        />
                    </Button>
                )}
            </div>
            <div className="flex items-center space-x-2">
                {deleteRowsAction &&
                table.getSelectedRowModel().rows.length > 0 ? (
                    <Button
                        aria-label="Delete selected rows"
                        variant="destructive"
                        size="sm"
                        className="h-8"
                        onClick={(event) => {
                            startTransition(() => {
                                table.toggleAllPageRowsSelected(false);
                                deleteRowsAction(event);
                            });
                        }}
                        disabled={isPending}
                    >
                        <TrashIcon
                            className="mr-2 h-4 w-4"
                            aria-hidden="true"
                        />
                        Delete
                    </Button>
                ) : newRowLink ? (
                    <Link aria-label="Create new row" href={newRowLink}>
                        <div
                            className={cn(
                                buttonVariants({
                                    variant: "outline",
                                    size: "sm",
                                    className: "h-8",
                                }),
                            )}
                        >
                            <PlusCircledIcon
                                className="mr-2 h-4 w-4"
                                aria-hidden="true"
                            />
                            New
                        </div>
                    </Link>
                ) : newRowAction ? (
                    <Button size="sm" onClick={newRowAction} className="h-8">
                        <PlusCircledIcon
                            className="mr-2 h-4 w-4"
                            aria-hidden="true"
                        />
                        New
                    </Button>
                ) : null}
                {table.getSelectedRowModel().rows.length > batchSelectCount &&
                    BatchAction && (
                        <BatchAction
                            items={table
                                .getSelectedRowModel()
                                .rows?.map((r) => r.original)}
                        />
                    )}

                <DataTableViewOptions table={table} />
            </div>
        </div>
    );
}
