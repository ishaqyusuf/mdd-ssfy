import { type z } from "zod";

import { type Icons } from "@/components/_v1/icons";
import { Column } from "@tanstack/react-table";

export interface Option {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
}

export interface DataTableDateFilterColumn<TData, TValue> {
    id: keyof TData;
    title: string;
    rangeSwitch?: Boolean;
    range?: Boolean;
    filter?: DataTableFilterableColumn<TData, TValue>;
}
export interface DataTableSearchableColumn<TData> {
    id: keyof TData;
    title: string;
}

export interface DataTableFilterableColumn<TData, TValue>
    extends DataTableSearchableColumn<TData> {
    column?: Column<TData, TValue>;
    options: Option[];
    single?: Boolean;
    defaultValue?: string;
}

export interface TableShellProps<T = any> {
    data: T[];
    promise?;
    pageInfo: TablePageInfo;
    searchParams?;
}
export interface TablePageInfo {
    pageIndex?: number | undefined;
    currentPage?: number | undefined;
    from?: number | undefined;
    to?: number | undefined;
    pageCount?: number | undefined;
    totalItems?: number | undefined;
    perPage?: number | undefined;
    hasPreviousPage?: Boolean;
}
