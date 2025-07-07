"use client";

import { DataTableColumnHeader } from "../data-table/data-table-column-header";
import { Checkbox } from "@gnd/ui/checkbox";
import { useState } from "react";
import { cn } from "@/lib/utils";

import { formatDate } from "@/lib/use-day";

import { Info, Trash } from "lucide-react";
import LinkableNode from "../link-node";
import { PrimitiveDivProps } from "@/types/type";
import { Badge } from "@gnd/ui/badge";
import { getBadgeColor } from "@/lib/status-badge";
import { Progressor, getProgress } from "@/lib/status";
import ProgressStatus from "../progress-status";
import StatusBadge from "../status-badge";

export interface CheckColumnProps {
    setSelectedRowIds;
    selectedRowIds;
    data;
}

export function CheckColumn({ setSelectedRowIds, data }: CheckColumnProps) {
    return {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) => {
                    table.toggleAllPageRowsSelected(!!value);
                    setSelectedRowIds((prev) =>
                        prev.length === data.length
                            ? []
                            : data.map((row) => row.id),
                    );
                }}
                aria-label="Select all"
                className="translate-y-[2px]"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => {
                    row.toggleSelected(!!value);
                    setSelectedRowIds((prev) =>
                        value
                            ? [...prev, row.original.id]
                            : prev.filter((id) => id !== row.original.id),
                    );
                }}
                aria-label="Select row"
                className="translate-y-[2px]"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    };
}
export const ColumnHeader = (title) => {
    let c = ({ column }) => (
        <DataTableColumnHeader column={column} title={title} />
    );
    return c;
};
export const Cell = ({
    row,
    link,
    children,
    slug,
    className,
    ...mainProps
}: {
    row?;
    link?;
    children?;
    slug?;
    className?;
    onClick?;
}) => {
    // if (!row) return <></>;
    link = link?.replace("slug", slug?.toString());

    return (
        <div {...mainProps} className={cn("w-full", className)}>
            <LinkableNode
                href={link || ""}
                className={cn(link && "hover:underline")}
            >
                {children}
            </LinkableNode>
        </div>
    );
};
export function PrimaryCellContent({
    children,
    className,
    ...props
}: PrimitiveDivProps) {
    return (
        <div {...props} className={cn("font-semibold", className)}>
            {children}
        </div>
    );
}
export function SecondaryCellContent({
    children,
    className,
    ...props
}: PrimitiveDivProps) {
    return (
        <div
            {...props}
            className={cn("text-muted-foreground text-sm", className)}
        >
            {children}
        </div>
    );
}
export function DateCellContent({
    children,
    primary,
}: {
    children?;
    primary?: Boolean;
}) {
    const Node = primary ? PrimaryCellContent : SecondaryCellContent;
    const value = formatDate(children);
    return <Node>{value}</Node>;
}

type FilterKeys =
    | "_q"
    | "_projectId"
    | "_status"
    | "_payment"
    | "_userId"
    | "_builderId"
    | "_customerId"
    | "_roleId"
    | "_date"
    | "_installation"
    | "_production"
    | "_supplier"
    | "_category"
    | "_dateType"
    | "_deliveryStatus"
    | "_task"
    | "_showInvoiceType"
    | "_salesRepId"
    | "_categoryId"
    | "_withDeleted"
    | "_show";
export function _FilterColumn(...assessorKeys: FilterKeys[]) {
    const filters = assessorKeys.map((accessorKey) => ({
        accessorKey,
        enableHiding: false,
    }));

    return filters;
}
export function StatusCell({ status }) {
    const color = getBadgeColor(status);
    return (
        <div className="w-16">
            <Badge
                variant={"secondary"}
                className={`h-5 px-1 whitespace-nowrap  text-xs text-slate-100 ${color}`}
            >
                {/* {order?.prodStatus || "-"} */}
                {status || "no status"}
            </Badge>
        </div>
    );
}
export function ProgressStatusCell({
    score,
    total,
    status,
}: {
    status?;
    score;
    total;
}) {
    const [progress, setProgress] = useState<Progressor | null>(
        getProgress(score, total),
    );

    if (progress?.score > 0)
        return <ProgressStatus score={score} total={total} status={status} />;
    return <StatusBadge status={status} />;
}
