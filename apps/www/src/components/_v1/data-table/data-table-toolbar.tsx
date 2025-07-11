"use client";

import * as React from "react";
import { DataTableViewOptions } from "@/components/_v1/data-table/data-table-view-options";
import type {
    DataTableDateFilterColumn,
    DataTableFilterableColumn,
    DataTableSearchableColumn,
} from "@/types/data-table";

import type { Table } from "@tanstack/react-table";

import { Button, buttonVariants } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";

import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { DataTableFacetedFilter2 } from "./data-table-faceted-filter-2";
import { DataTableFacetedDate } from "./data-table-facetted-date";
import { CrossIcon, TrashIcon } from "lucide-react";

interface DataTableToolbarProps<TData, TValue> {
    table: Table<TData>;
    filterableColumns?: DataTableFilterableColumn<TData, TValue>[];
    searchableColumns?: DataTableSearchableColumn<TData>[];
    dateFilterColumns?: DataTableDateFilterColumn<TData, TValue>[];
    newRowLink?: string;
    deleteRowsAction?: React.MouseEventHandler<HTMLButtonElement>;
    BatchAction?;
    Toolbar?({ table }: { table: Table<TData> });
}

export function DataTableToolbar<TData, TValue>({
    table,
    filterableColumns = [],
    searchableColumns = [],
    dateFilterColumns = [],
    newRowLink,
    BatchAction,
    deleteRowsAction,
    Toolbar,
}: DataTableToolbarProps<TData, TValue>) {
    const isFiltered = table.getState().columnFilters.length > 0;
    const [isPending, startTransition] = React.useTransition();

    return (
        <div className="flex w-full items-center justify-between space-x-2 overflow-auto p-1">
            <div className="flex flex-1 items-center space-x-2">
                {searchableColumns.length > 0 &&
                    searchableColumns.map(
                        (column) =>
                            (table.getColumn(
                                column.id ? String(column.id) : "",
                            ) ||
                                String(column.id).startsWith("_")) && (
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
                            <DataTableFacetedFilter2
                                key={String(column.id)}
                                column={_column}
                                title={column.title}
                                single={column.single}
                                options={column.options}
                            />
                        );
                    })}
                {dateFilterColumns.length > 0 &&
                    dateFilterColumns.map(
                        (column) =>
                            table.getColumn(
                                column.id ? String(column.id) : "",
                            ) && (
                                <DataTableFacetedDate
                                    {...column}
                                    column={table.getColumn(
                                        column.id ? String(column.id) : "",
                                    )}
                                    table={table}
                                    key={String(column.id)}
                                />
                            ),
                    )}
                {isFiltered && (
                    <Button
                        aria-label="Reset filters"
                        variant="ghost"
                        className="h-8 px-2 lg:px-3"
                        onClick={() => table.resetColumnFilters()}
                    >
                        Reset
                        <CrossIcon className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>
            <div className="flex items-center space-x-2">
                {table.getSelectedRowModel().rows.length > 0 ? (
                    <>
                        {BatchAction && (
                            <BatchAction
                                items={table
                                    .getSelectedRowModel()
                                    .rows?.map((r) => r.original)}
                            />
                        )}
                        {deleteRowsAction && (
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
                        )}
                    </>
                ) : (
                    <>{Toolbar && <Toolbar table={table} />}</>
                )}
                <div id="tableExport"></div>
                <DataTableViewOptions table={table} />
            </div>
        </div>
    );
}
