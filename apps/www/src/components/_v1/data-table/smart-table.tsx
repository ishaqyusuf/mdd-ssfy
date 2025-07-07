"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
    Cell,
    CheckColumn as __CheckColumn,
    ColumnHeader,
} from "../columns/base-columns";
import React, { ReactElement, useMemo, useState } from "react";
import LinkableNode from "../link-node";
import { cn, labelValue } from "@/lib/utils";
import { formatDate } from "@/lib/use-day";
import { Badge } from "@gnd/ui/badge";
import { getBadgeColor } from "@/lib/status-badge";
import { PrimitiveDivProps } from "@/types/type";

export function SmartTable<T>(data) {
    type IColumn = ColumnDef<T, unknown>;
    type IdType = IColumn["id"];
    function column(
        id: IdType,
        header,
        // cellContent: any[],
        {
            link,
            content,
            ...props
        }: Omit<IColumn, "id" | "header"> & {
            link?;
            content?(data: T): {
                as?;
                link?;
                story: (IStory | ReactElement)[];
            };
        },
    ): IColumn {
        const col = {
            ...props,
            id,
            header: ColumnHeader(header),
            assessorKey: header,
            cell: ({ row }) => {
                if (!content) return <></>;
                const _content = content(row.original);

                return (
                    <LinkableNode
                        href={_content.link}
                        className={cn(
                            _content.story?.length > 1 ? "flex flex-col" : "",
                            _content.link && "hover:underline",
                        )}
                    >
                        {_content.story?.map((story, id) =>
                            React.isValidElement(story) ? (
                                <>{story}</>
                            ) : (
                                <Story
                                    story={story}
                                    link={_content.link}
                                    key={id}
                                />
                            ),
                        )}
                    </LinkableNode>
                );
            },
        } as any;
        addColumn(col);
        return col;
    }
    const [_columns, _setColumns] = useState<IColumn[]>([]);

    const columns = useMemo<IColumn[]>(() => _columns, [_columns]);
    function addColumn(c) {
        // _setColumns([c]);
        // _setColumns([..._columns, c]);
    }
    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
    return {
        __columns: columns,
        addColumn,
        orColumns(condition, truth: any = [], _false: any = []) {
            return condition ? truth : _false;
        },
        checkColumn() {
            const ret = __CheckColumn({
                selectedRowIds,
                setSelectedRowIds,
                data,
            });
            addColumn(ret);
            return ret;
        },
        column,
        simpleColumn(
            header,
            content: (data: T) => {
                as?;
                link?;
                story: (IStory | ReactElement)[];
            },
            params: Omit<IColumn, "id" | "header"> & { id? } = {},
        ) {
            if (!params.id) params.id = header?.toLowerCase();
            return column(params.id, header, {
                content,
                ...params,
            });
        },
        simpleStatus(cellKey: keyof T, header = "Status") {
            return column(header?.toLowerCase(), header, {
                content: (data) => ({
                    story: [this.status(data[cellKey])],
                }),
            });
        },
        primaryText: (value) =>
            ({
                type: "primary",
                value,
            }) as IStory,
        badgeText: (value) =>
            ({
                type: "badge",
                value,
            }) as IStory,
        text: (value) =>
            ({
                type: "default",
                value,
            }) as IStory,
        secondary: (value) =>
            ({
                type: "secondary",
                value,
            }) as IStory,
        dateText: (value, format?) =>
            ({
                type: "date",
                format,
                value,
            }) as IStory,
        status: (value) =>
            ({
                type: "status",
                value,
            }) as IStory,
        // linkColumn(id:IdType,header,)
        Columns: (...columns) => useMemo<IColumn[]>(() => [...columns], [data]),
        Primary,
    };
}
function Primary({ className, children }: {} & PrimitiveDivProps) {
    return <div className={cn("font-semibold", className)}>{children}</div>;
}
function Story({ story, link }: { story; link }) {
    if (Array.isArray(story))
        return (
            <div className="inline-flex space-x-2">
                {story.map((s, k) => (
                    <Story story={s} link={link} key={k} />
                ))}
            </div>
        );
    let value =
        story.value instanceof Date ? formatDate(story.value) : story.value;
    if (story.type == "status") {
        const color = getBadgeColor(value);
        return (
            <div className="w-16">
                <Badge
                    variant={"secondary"}
                    className={`h-5 px-1 whitespace-nowrap  text-xs text-slate-100 ${color}`}
                >
                    {/* {order?.prodStatus || "-"} */}
                    {value || story.defaultStatus}
                </Badge>
            </div>
        );
    }
    return (
        <div
            className={cn(
                "text-sm",
                story.type == "primary" && "font-semibold",
                story.type == "secondary" && "text-muted-foreground",
            )}
        >
            {value}
        </div>
    );
}
export interface IStory {
    type: "primary" | "secondary" | "date" | "status" | "badge" | "default";
    value;
    format?;
    defaultStatus?;
}
export const StatusFilter = (options: any[]) => ({
    id: "status",
    title: "Status",
    single: true,
    options: options.map((o) => (typeof o === "string" ? labelValue(o, o) : o)),
});
