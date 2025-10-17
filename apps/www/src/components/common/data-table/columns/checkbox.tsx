"use client";

import React from "react";
import { TableCell } from "@/app/_components/data-table/table-cells";

import { Checkbox } from "@gnd/ui/checkbox";

function DataTableCheckBoxHeader({ table, setSelectedRowIds, data }) {
    return (
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
    );
}
function DataTableCheckbox({ row, setSelectedRowIds, v2 }) {
    function Render() {
        return (
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
        );
    }
    if (v2)
        return (
            <TableCell>
                <Render />
            </TableCell>
        );
    return <Render />;
}
export function useDatableCheckbox(data, v2 = false) {
    const [selectedRowIds, setSelectedRowIds] = React.useState<number[]>([]);

    return {
        setSelectedRowIds,
        selectedRowIds,
        column: {
            id: "select",
            header: (props) => (
                <DataTableCheckBoxHeader
                    {...props}
                    data={data}
                    setSelectedRowIds={setSelectedRowIds}
                />
            ),
            cell: (props) => (
                <DataTableCheckbox
                    {...props}
                    v2
                    setSelectedRowIds={setSelectedRowIds}
                />
            ),
        },
    };
}
